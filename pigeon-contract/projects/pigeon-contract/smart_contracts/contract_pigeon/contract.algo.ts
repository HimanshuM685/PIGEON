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
 */
class UserData extends arc4.Struct<{
  address: arc4.Str
  encryptedMnemonic: arc4.Str
  createdAt: arc4.Uint64
}> {}

export class ContractPigeon extends Contract {
  /** Admin / owner who is allowed to mutate state. Set on first deploy. */
  admin = GlobalState<arc4.Address>()

  /** Total number of onboarded users (handy for off-chain stats). */
  totalUsers = GlobalState<uint64>({ initialValue: Uint64(0) })

  /**
   * Primary data store.
   * Key  : normalised phone number (digits-only string)
   * Value: UserData struct (address + encrypted mnemonic + timestamp)
   *
   * Each user occupies one Algorand box whose on-chain name is  "u" + phone.
   */
  users = BoxMap<arc4.Str, UserData>({ keyPrefix: 'u' })

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
    })

    // Bump the counter
    this.totalUsers.value = this.totalUsers.value + 1
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

    // Preserve original createdAt
    const existing = clone(this.users(phone).value)
    this.users(phone).value = new UserData({
      address: address,
      encryptedMnemonic: encryptedMnemonic,
      createdAt: existing.createdAt,
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
