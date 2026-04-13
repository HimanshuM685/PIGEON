import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { ContractPigeonFactory } from '../artifacts/contract_pigeon/ContractPigeonClient'

export async function deploy() {
  console.log('=== Deploying ContractPigeon ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(ContractPigeonFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({
    createParams: {
      method: 'createApplication',
      args: [],
    },
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  // If app was just created, fund the app account so it can cover box MBR costs
  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
    console.log('Funded app account with 1 ALGO for box MBR costs')
  }

  // Smoke test: check total users count
  const totalUsersResponse = await appClient.send.getTotalUsers()
  console.log(
    `ContractPigeon deployed at ${appClient.appClient.appId}, total users: ${totalUsersResponse.return}`,
  )
}
