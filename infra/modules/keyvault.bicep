// Key Vault — stores secrets (Cosmos keys, etc.)

@description('Key Vault name')
param name string

@description('Azure region')
param location string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenant().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

output vaultUri string = keyVault.properties.vaultUri
output vaultId string = keyVault.id
