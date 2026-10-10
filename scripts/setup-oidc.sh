#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AI Emotional Partner — One-time OIDC setup for GitHub Actions ↔ Azure
#
# Run this once from a machine where you're logged in with `az login`
# and have Owner/User Access Administrator on the subscription + ability
# to create Azure AD app registrations.
#
# Usage:
#   chmod +x scripts/setup-oidc.sh
#   ./scripts/setup-oidc.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ───────────────────────────────────────────────────────────
SUBSCRIPTION_ID="1c91edbd-8e04-4f38-a14a-d1621b7f6b4f"
TENANT_ID="2c8733eb-d943-4d72-93f8-882929fe5967"
RESOURCE_GROUP="crossroads-hack-rg"
GITHUB_REPO="NikitaChernevskiy/crossroads-aica"
APP_NAME="crossroads-aica-github-oidc"

echo "=== AI Emotional Partner — OIDC Setup ==="
echo "Subscription: $SUBSCRIPTION_ID"
echo "Tenant:       $TENANT_ID"
echo "Repo:         $GITHUB_REPO"
echo ""

# ── 1. Create Azure AD App Registration ─────────────────────────────────────
echo "1/6  Creating Azure AD App Registration..."
APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
echo "     App (client) ID: $APP_ID"

# ── 2. Create Service Principal ─────────────────────────────────────────────
echo "2/6  Creating Service Principal..."
SP_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)
echo "     Service Principal Object ID: $SP_ID"

# ── 3. Add Federated Credentials (for dev and prod GitHub Environments) ─────
echo "3/6  Adding federated credentials for GitHub Environments..."

# prod environment
az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"github-prod\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GITHUB_REPO}:environment:prod\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}" -o none

# dev environment
az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"github-dev\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GITHUB_REPO}:environment:dev\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}" -o none

# main branch (for workflows not tied to an environment)
az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"github-main-branch\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GITHUB_REPO}:ref:refs/heads/main\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}" -o none

echo "     Federated credentials added for: prod, dev, main branch"

# ── 4. Assign Contributor role on resource group ────────────────────────────
echo "4/6  Assigning Contributor role on $RESOURCE_GROUP..."
az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  -o none
echo "     Contributor role assigned"

# ── 5. Assign AcrPush role on ACR ──────────────────────────────────────────
echo "5/6  Assigning AcrPush role on acremopartner..."
az role assignment create \
  --assignee "$APP_ID" \
  --role AcrPush \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/acremopartner" \
  -o none
echo "     AcrPush role assigned"

# ── 6. Set GitHub secrets and environments ──────────────────────────────────
echo "6/6  Setting GitHub secrets..."

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
  echo ""
  echo "⚠️  GitHub CLI (gh) not found. Set these secrets manually:"
  echo "    gh secret set AZURE_CLIENT_ID     --body \"$APP_ID\"         --repo $GITHUB_REPO"
  echo "    gh secret set AZURE_TENANT_ID     --body \"$TENANT_ID\"     --repo $GITHUB_REPO"
  echo "    gh secret set AZURE_SUBSCRIPTION_ID --body \"$SUBSCRIPTION_ID\" --repo $GITHUB_REPO"
  echo ""
  echo "    Also create GitHub Environments 'dev' and 'prod' at:"
  echo "    https://github.com/$GITHUB_REPO/settings/environments"
  exit 0
fi

# Set repo-level secrets (available to all environments)
gh secret set AZURE_CLIENT_ID      --body "$APP_ID"          --repo "$GITHUB_REPO"
gh secret set AZURE_TENANT_ID      --body "$TENANT_ID"       --repo "$GITHUB_REPO"
gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID" --repo "$GITHUB_REPO"

echo "     GitHub secrets set"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "App (client) ID:  $APP_ID"
echo "Tenant ID:        $TENANT_ID"
echo "Subscription ID:  $SUBSCRIPTION_ID"
echo ""
echo "Next steps:"
echo "  1. Create GitHub Environments 'dev' and 'prod':"
echo "     https://github.com/$GITHUB_REPO/settings/environments"
echo "  2. Push code to trigger the CI/CD pipeline"
echo "  3. Register Microsoft.Web provider (for Static Web Apps):"
echo "     az provider register --namespace Microsoft.Web --subscription $SUBSCRIPTION_ID"
echo "  4. Create Static Web App:"
echo "     az staticwebapp create --name swa-emopartner --resource-group $RESOURCE_GROUP \\"
echo "       --subscription $SUBSCRIPTION_ID --location centralus --sku Free"
echo "  5. Create Key Vault (optional):"
echo "     az keyvault create --name kv-emopartner --resource-group $RESOURCE_GROUP \\"
echo "       --subscription $SUBSCRIPTION_ID --location swedencentral --enable-rbac-authorization true"
