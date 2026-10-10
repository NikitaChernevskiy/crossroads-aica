// Azure Container Registry

@description('ACR name (must be globally unique, alphanumeric only)')
param name string

@description('Azure region')
param location string

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: name
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

output loginServer string = acr.properties.loginServer
output acrId string = acr.id
