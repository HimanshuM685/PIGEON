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

class UserData extends arc4.Struct<{
  address: arc4.Str
  encryptedMnemonic: arc4.Str
  createdAt: arc4.Uint64
}> {}

export class ContractPigeon extends Contract {
  admin = GlobalState<arc4.Address>()
  totalUsers = GlobalState<uint64>({ initialValue: Uint64(0) })
  users = BoxMap<arc4.Str, UserData>({ keyPrefix: 'u' })

  createApplication(): void {
    this.admin.value = new arc4.Address(Txn.sender)
  }

  onboardUser(
    phone: arc4.Str,
    address: arc4.Str,
    encryptedMnemonic: arc4.Str,
    createdAt: arc4.Uint64,
  ): void {
    this.assertAdmin()
    assert(!this.users(phone).exists, 'User already onboarded')

    this.users(phone).value = new UserData({
      address: address,
      encryptedMnemonic: encryptedMnemonic,
      createdAt: createdAt,
    })

    this.totalUsers.value = this.totalUsers.value + 1
  }

  updateUser(
    phone: arc4.Str,
    address: arc4.Str,
    encryptedMnemonic: arc4.Str,
  ): void {
    this.assertAdmin()
    assert(this.users(phone).exists, 'User not found')

    const existing = clone(this.users(phone).value)
    this.users(phone).value = new UserData({
      address: address,
      encryptedMnemonic: encryptedMnemonic,
      createdAt: existing.createdAt,
    })
  }

  deleteUser(phone: arc4.Str): void {
    this.assertAdmin()
    assert(this.users(phone).exists, 'User not found')
    this.users(phone).delete()

    this.totalUsers.value = this.totalUsers.value - 1
  }

  getUser(phone: arc4.Str): UserData {
    assert(this.users(phone).exists, 'User not found')
    return this.users(phone).value
  }

  userExists(phone: arc4.Str): boolean {
    return this.users(phone).exists
  }

  getUserAddress(phone: arc4.Str): arc4.Str {
    assert(this.users(phone).exists, 'User not found')
    return this.users(phone).value.address
  }

  getTotalUsers(): uint64 {
    return this.totalUsers.value
  }

  private assertAdmin(): void {
    assert(
      Txn.sender === this.admin.value.native,
      'Only the admin can perform this action',
    )
  }
}
