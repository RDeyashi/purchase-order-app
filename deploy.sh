#!/bin/bash

# ─────────────────────────────────────────
# Purchase Order App — Deployment Script
# ─────────────────────────────────────────

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Purchase Order App — CF Deployment     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────
# STEP 1 — CF Login via SSO
# ─────────────────────────────────────────
echo "▶ Step 1: Logging in to Cloud Foundry via SSO..."
echo ""
cf login --sso

echo ""
echo "✅ CF Login successful"
echo ""

# ─────────────────────────────────────────
# STEP 2 — MBT Build
# ─────────────────────────────────────────
echo "▶ Step 2: Building MTA archive..."
echo ""
mbt build -t mta_archives
echo ""
echo "✅ MTA build completed"
echo ""

# ─────────────────────────────────────────
# STEP 3 — CF Deploy
# ─────────────────────────────────────────
echo "▶ Step 3: Deploying to Cloud Foundry..."
echo ""
MTA_FILE=$(ls mta_archives/*.mtar | head -1)
echo "   Found archive: $MTA_FILE"
echo ""
cf deploy "$MTA_FILE" --retries 1
echo ""
echo "✅ Deployment completed"
echo ""

# ─────────────────────────────────────────
# STEP 4 — Cleanup
# ─────────────────────────────────────────
echo "▶ Step 4: Cleaning up build artifacts..."
echo ""

# Remove mta_archives folder
rm -rf mta_archives
echo "   ✓ Removed mta_archives/"

# Remove untracked files via git clean
# -f = force, -d = directories, -x = ignored files too
# Excludes: node_modules, .cdsrc-private.json, db.sqlite
git clean -fd --exclude=node_modules \
              --exclude=.cdsrc-private.json \
              --exclude=db.sqlite \
              --exclude=.env \
              --exclude=package-lock.json
echo "   ✓ Removed untracked files"
echo ""
echo "✅ Cleanup completed"
echo ""

# ─────────────────────────────────────────
# STEP 5 — Success Message
# ─────────────────────────────────────────
echo "╔══════════════════════════════════════════╗"
echo "║       Deployment Successful! 🎉          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Deployed Apps:"
cf apps | grep "purchase-order" || echo "   No apps found"
echo ""
echo "Deployed Services:"
cf services | grep "purchase-order" || echo "   No services found"
echo ""
echo "Done ✅"
echo ""