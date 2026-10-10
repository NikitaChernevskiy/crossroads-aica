#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Install GitHub Actions workflows and push to origin.
#
# The SRE Agent can't push to .github/workflows/ (needs `workflow` scope).
# Run this from the repo root on your local machine:
#
#   chmod +x scripts/install-workflows.sh
#   ./scripts/install-workflows.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== Installing GitHub Actions Workflows ==="

mkdir -p .github/workflows

cp scripts/workflows/backend.yml       .github/workflows/backend.yml
cp scripts/workflows/sensor-client.yml .github/workflows/sensor-client.yml
cp scripts/workflows/infra.yml         .github/workflows/infra.yml

git add .github/workflows/
git commit -m "ci: add GitHub Actions workflows for backend, sensor-client, infra

- backend.yml: test → build in ACR → deploy to Container App (OIDC)
- sensor-client.yml: build → deploy to Static Web Apps
- infra.yml: validate → deploy Bicep templates

Co-authored-by: Azure SRE Agent <noreply@microsoft.com>"

git push origin main

echo ""
echo "=== Workflows installed ==="
echo "Trigger a run: push to backend/ or sensor-client/, or use workflow_dispatch"
