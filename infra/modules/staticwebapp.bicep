// Static Web App — sensor-client React app

@description('Static Web App name')
param name string

@description('Azure region')
param location string

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output defaultHostname string = staticWebApp.properties.defaultHostname
output swaId string = staticWebApp.id
