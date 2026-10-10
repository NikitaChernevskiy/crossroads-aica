// AI Emotional Partner — Main infrastructure template
// Deploys: Container Apps Environment, Container App (backend+MCP),
//          Cosmos DB, ACR, Key Vault, Application Insights, Static Web Apps

targetScope = 'resourceGroup'

@description('Base name for all resources')
param baseName string = 'emotional-partner'

@description('Azure region')
param location string = resourceGroup().location

@description('Environment (dev or prod)')
@allowed(['dev', 'prod'])
param environment string = 'dev'

@description('Container image tag')
param imageTag string = 'latest'

// ── Naming ─────────────────────────────────────────────────────────────────

var suffix = '${baseName}-${environment}'
var uniqueSuffix = uniqueString(resourceGroup().id, baseName, environment)

// ── Modules ────────────────────────────────────────────────────────────────

module appInsights 'modules/appinsights.bicep' = {
  name: 'appInsights'
  params: {
    name: 'appi-${suffix}'
    location: location
  }
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyVault'
  params: {
    name: 'kv-${uniqueSuffix}'
    location: location
  }
}

module cosmosDb 'modules/cosmos.bicep' = {
  name: 'cosmosDb'
  params: {
    accountName: 'cosmos-${uniqueSuffix}'
    location: location
    databaseName: 'emotional-partner'
    containerName: 'states'
  }
}

module acr 'modules/acr.bicep' = {
  name: 'acr'
  params: {
    name: 'acr${uniqueSuffix}'
    location: location
  }
}

module containerApp 'modules/containerapp.bicep' = {
  name: 'containerApp'
  params: {
    name: 'ca-${suffix}'
    location: location
    acrLoginServer: acr.outputs.loginServer
    imageTag: imageTag
    cosmosEndpoint: cosmosDb.outputs.endpoint
    cosmosAccountName: cosmosDb.outputs.accountName
    keyVaultUri: keyVault.outputs.vaultUri
    appInsightsConnectionString: appInsights.outputs.connectionString
  }
}

module staticWebApp 'modules/staticwebapp.bicep' = {
  name: 'staticWebApp'
  params: {
    name: 'swa-${suffix}'
    location: 'westeurope' // Static Web Apps has limited region support
  }
}

// ── Outputs ────────────────────────────────────────────────────────────────

output backendUrl string = containerApp.outputs.fqdn
output staticWebAppUrl string = staticWebApp.outputs.defaultHostname
output cosmosEndpoint string = cosmosDb.outputs.endpoint
output acrLoginServer string = acr.outputs.loginServer
output keyVaultUri string = keyVault.outputs.vaultUri
output appInsightsName string = appInsights.outputs.name
