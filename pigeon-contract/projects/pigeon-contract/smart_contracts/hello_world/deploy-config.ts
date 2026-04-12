import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { ContractPigeonFactory } from '../artifacts/hello_world/ContractPigeonClient'

export async function deploy() {
  console.log('=== Deploying ContractPigeon ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(ContractPigeonFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({ onUpdate: 'append', onSchemaBreak: 'append' })

  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  console.log(`Deployed ${appClient.appClient.appName} (app id: ${appClient.appClient.appId})`)
}
