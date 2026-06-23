#!/usr/bin/env bash
# AetherLink VPS Deploy Script (June 2026)
# Uses Next.js standalone server — NOT npm run start / next start
set -euo pipefail

APP_DIR="/root/Aetherlink/apps/webapp"
PM2_NAME="aetherlink-webapp"
PM2_PORT=3002
PM2_HOST="127.0.0.1"

echo "🚀 AetherLink deploy starting..."

# 1. Clean previous build
echo "🧹 Removing old .next..."
cd "$APP_DIR"
rm -rf .next

# 2. Build
echo "🔨 Building..."
pnpm build

# 3. Copy static assets to standalone output
echo "📦 Copying static + public to standalone..."
cp -r .next/static .next/standalone/apps/webapp/.next/static
cp -r public .next/standalone/apps/webapp/public

# 4. Stop old PM2 process
echo "⏹ Stopping old PM2 process..."
pm2 delete "$PM2_NAME" 2>/dev/null || true

# 5. Start PM2 with standalone server
echo "▶️ Starting PM2 (standalone server)..."
cd "$APP_DIR/.next/standalone/apps/webapp"
PORT=$PM2_PORT HOSTNAME=$PM2_HOST NODE_ENV=production \
  pm2 start server.js --name "$PM2_NAME" --update-env

pm2 save

# 6. Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx

# 7. Verify static assets return 200
echo "✅ Verifying static assets..."
sleep 2

# Get the first _next/static path from the build
STATIC_PATH=$(find "$APP_DIR/.next/standalone/apps/webapp/.next/static" -name "*.js" 2>/dev/null | head -1 | sed 's|.*/static/|/_next/static/|')
if [ -n "$STATIC_PATH" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${PM2_HOST}:${PM2_PORT}${STATIC_PATH}" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ Static asset returns 200: ${STATIC_PATH}"
  else
    echo "  ⚠️ Static asset returned HTTP ${HTTP_CODE}: ${STATIC_PATH}"
  fi
else
  echo "  ⚠️ No static JS files found to verify"
fi

# 8. Verify homepage
HOMEPAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${PM2_HOST}:${PM2_PORT}/" 2>/dev/null || echo "000")
if [ "$HOMEPAGE_CODE" = "200" ]; then
  echo "  ✅ Homepage returns 200"
else
  echo "  ⚠️ Homepage returned HTTP ${HOMEPAGE_CODE}"
fi

# 9. PM2 status
pm2 list

echo ""
echo "🎉 Deploy complete!"
echo "   PM2: ${PM2_NAME} on ${PM2_HOST}:${PM2_PORT}"
echo "   URL: https://aetherlink.cloud-ip.cc"
