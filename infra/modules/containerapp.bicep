// Container Apps — backend API + MCP server

@description('Container App name')
param name string

@description('Azure region')
param location string

@description('ACR login server')
param acrLoginServer string

@description('Container image tag')
param imageTag string = 'latest'

@description('Cosmos DB endpoint')
param cosmosEndpoint string

@description('Cosmos DB account name')
param cosmosAccountName string

@description('Key Vault URI')
param keyVaultUri string

@description('Application Insights connection string')
param appInsightsConnectionString string

// Container Apps Environment
resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${name}-env'
  location: location
  properties: {
    zoneRedundant: false
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'OPTIONS']
          allowedHeaders: ['*']
        }
      }
      registries: [
        {
          server: acrLoginServer
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: '${acrLoginServer}/emotional-partner-backend:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'USE_IN_MEMORY', value: 'false' }
            { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
            { name: 'COSMOS_DATABASE', value: 'emotional-partner' }
            { name: 'COSMOS_CONTAINER', value: 'states' }
            { name: 'KEYVAULT_URL', value: keyVaultUri }
            { name: 'STATE_FRESHNESS_SECONDS', value: '300' }
            { name: 'CORS_ORIGINS', value: '*' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

output fqdn string = containerApp.properties.configuration.ingress.fqdn
output principalId string = containerApp.identity.principalId
