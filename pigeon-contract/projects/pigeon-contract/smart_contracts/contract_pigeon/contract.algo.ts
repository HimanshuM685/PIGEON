import {
  Contract,
  BoxMap,
  GlobalState,
  Txn,
  assert,
  Uint64,
  arc4,
  uint64,
  clone,
} from '@algorandfoundation/algorand-typescript'

/**
 * On-chain representation of an onboarded user.
 *
 * Maps 1-to-1 with the SQLite `onboarded_users` table:
 *   phone        TEXT PRIMARY KEY          →  BoxMap key (arc4.Str)
 *   address      TEXT NOT NULL             →  UserData.address  (arc4.Str)
 *   encrypted_mnemonic TEXT NOT NULL       →  UserData.encryptedMnemonic (arc4.Str)
 *   created_at   INTEGER NOT NULL          →  UserData.createdAt (arc4.Uint64)
 *   telegram_handle  TEXT                  →  UserData.telegramHandle (arc4.Str)
 */
class UserData extends arc4.Struct<{
  address: arc4.Str
  encryptedMnemonic: arc4.Str
  createdAt: arc4.Uint64
  telegramHandle: arc4.Str
}> {}

export class ContractPigeon extends Contract {
  /** Admin / owner who is allowed to mutate state. Set on first deploy. */
  admin = GlobalState<arc4.Address>()

  /** Total number of onboarded users (handy for off-chain stats). */
  totalUsers = GlobalState<uint64>({ initialValue: Uint64(0) })

  /**
   * Primary data store.
   * Key  : normalised phone number (digits-only string)
   * Value: UserData struct (address + encrypted mnemonic + timestamp + telegram handle)
   *
   * Each user occupies one Algorand box whose on-chain name is  "u" + phone.
   */
  users = BoxMap<arc4.Str, UserData>({ keyPrefix: 'u' })

  /**
   * Telegram identity mapping.
   * Key  : Telegram user ID (numeric string)
   * Value: phone number (digits-only string) — links to the primary `users` BoxMap
   *
   * Each mapping occupies one box with on-chain name "t" + telegramId.
   */
  telegramUsers = BoxMap<arc4.Str, arc4.Str>({ keyPrefix: 't' })

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Called automatically on application creation.
   * Records the creator as the contract admin.
   */
  createApplication(): void {
    this.admin.value = new arc4.Address(Txn.sender)
  }

  /* ------------------------------------------------------------------ */
  /*  Mutations  (admin-only)                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Register a new user on-chain.
   *
   * Mirrors `insertOnboardedUser()` from the backend.
   * The caller must be the admin and must supply enough MBR to cover
   * the new box (box cost = 2500 + 400 × (keyLen + valueLen) micro-Algos).
   *
   * @param phone              Normalised phone number (digits only)
   * @param address            Algorand wallet address generated during onboarding
   * @param encryptedMnemonic  AES-256-GCM encrypted mnemonic (base64 string)
   * @param createdAt          Unix timestamp of onboarding
   */
  onboardUser(
    phone: arc4.Str,
    address: arc4.Str,
    encryptedMnemonic: arc4.Str,
    createdAt: arc4.Uint64,
  ): void {
    this.assertAdmin()

    // Ensure the user does not already exist
    assert(!this.users(phone).exists, 'User already onboarded')

    this.users(phone).value = new UserData({
      address: address,
      encryptedMnemonic: encryptedMnemonic,
      createdAt: createdAt,
      telegramHandle: new arc4.Str(''),
    })

    // Bump the counter
    this.totalUsers.value = this.totalUsers.value + 1
  }

  /**
   * Register a new user on-chain via Telegram identity.
   *
   * Creates both the user record (keyed by synthetic phone = "tg_" + telegramId)
   * and the Telegram ID → phone mapping.
   *
   * @param telegramId         Telegram user ID (numeric string)
   * @param address            Algorand wallet address
   * @param encryptedMnemonic  AES-256-GCM encrypted mnemonic
   * @param createdAt          Unix timestamp
   * @param telegramHandle     Telegram @username (without @)
   */
  onboardTelegramUser(
    telegramId: arc4.Str,
    address: arc4.Str,
    encryptedMnemonic: arc4.Str,
    createdAt: arc4.Uint64,
    telegramHandle: arc4.Str,
  ): void {
    this.assertAdmin()

    // Use "tg_" + telegramId as the synthetic phone key
    const syntheticPhone = new arc4.Str('tg_' + telegramId.native)

    assert(!this.users(syntheticPhone).exists, 'Telegram user already onboarded')

    this.users(syntheticPhone).value = new UserData({
      address: address,
      encryptedMnemonic: encryptedMnemonic,
      createdAt: createdAt,
      telegramHandle: telegramHandle,
    })

    // Map telegramId → synthetic phone
    this.telegramUsers(telegramId).value = syntheticPhone

    this.totalUsers.value = this.totalUsers.value + 1
  }

  /**
   * Link a Telegram user ID to an existing phone-based user record.
   * Also stores the Telegram handle on the user record.
   *
   * @param telegramId     Telegram user ID (numeric string)
   * @param phone          Phone number of the already-onboarded user
   * @param telegramHandle Telegram @username (without @)
   */
  linkTelegram(
    telegramId: arc4.Str,
    phone: arc4.Str,
    telegramHandle: arc4.Str,
  ): void {
    this.assertAdmin()
    assert(this.users(phone).exists, 'Phone user not found')
    assert(!this.telegramUsers(telegramId).exists, 'Telegram ID already linked')

    // Map telegramId → phone
    this.telegramUsers(telegramId).value = phone

    // Update the user record with the telegram handle
    const existing = clone(this.users(phone).value)
    this.users(phone).value = new UserData({
      address: existing.address,
      encryptedMnemonic: existing.encryptedMnemonic,
      createdAt: existing.createdAt,
      telegramHandle: telegramHandle,
    })
  }

  /**
   * Update an existing user's data.
   *
   * Useful if the backend needs to rotate keys or change the address.
   *
   * @param phone              Phone number (must already be onboarded)
   * @param address            New Algorand wallet address
   * @param encryptedMnemonic  New encrypted mnemonic
   */
  updateUser(
    phone: arc4.Str,
    address: arc4.Str,
    encryptedMnemonic: arc4.Str,
  ): void {
    this.assertAdmin()
    assert(this.users(phone).exists, 'User not found')

    // Preserve original createdAt and telegramHandle
    const existing = clone(this.users(phone).value)
    this.users(phone).value = new UserData({
      address: address,
      encryptedMnemonic: encryptedMnemonic,
      createdAt: existing.createdAt,
      telegramHandle: existing.telegramHandle,
    })
  }

  /**
   * Remove a user from on-chain storage.
   * Deletes the box and decrements the user counter.
   */
  deleteUser(phone: arc4.Str): void {
    this.assertAdmin()
    assert(this.users(phone).exists, 'User not found')
    this.users(phone).delete()

    this.totalUsers.value = this.totalUsers.value - 1
  }

  /* ------------------------------------------------------------------ */
  /*  Read-only queries                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Retrieve full user record.
   * Mirrors `findOnboardedUser()` from the backend.
   */
  getUser(phone: arc4.Str): UserData {
    assert(this.users(phone).exists, 'User not found')
    return this.users(phone).value
  }

  /**
   * Check whether a phone number has been onboarded.
   */
  userExists(phone: arc4.Str): boolean {
    return this.users(phone).exists
  }

  /**
   * Return only the Algorand address for a given phone.
   * Mirrors the `get_address` intent from the backend.
   */
  getUserAddress(phone: arc4.Str): arc4.Str {
    assert(this.users(phone).exists, 'User not found')
    return this.users(phone).value.address
  }

  /**
   * Return the current total-users counter.
   */
  getTotalUsers(): uint64 {
    return this.totalUsers.value
  }

  /**
   * Get the phone number linked to a Telegram user ID.
   */
  getTelegramPhone(telegramId: arc4.Str): arc4.Str {
    assert(this.telegramUsers(telegramId).exists, 'Telegram ID not linked')
    return this.telegramUsers(telegramId).value
  }

  /**
   * Check whether a Telegram user ID is linked.
   */
  telegramExists(telegramId: arc4.Str): boolean {
    return this.telegramUsers(telegramId).exists
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  private assertAdmin(): void {
    assert(
      Txn.sender === this.admin.value.native,
      'Only the admin can perform this action',
    )
  }
}
