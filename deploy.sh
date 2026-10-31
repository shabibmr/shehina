#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script: deploy.sh
# Description: Pulls latest git changes and deploys Shehnat MockUI v4 to
#              /var/www/html/algo_cloud/shehnat/demo
# ==============================================================================

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="${DEST_DIR:-/var/www/html/algo_cloud/shehnat/demo}"
SKIP_PULL=0

for arg in "$@"; do
  case "$arg" in
    --no-pull|--skip-pull)
      SKIP_PULL=1
      ;;
    --help|-h)
      echo "Usage: ./deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-pull, --no-pull   Deploy without running 'git pull'"
      echo "  -h, --help               Show this help message"
      exit 0
      ;;
  esac
done

echo "=========================================="
echo "Shehnat Demo - Deploy"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Source: $REPO_DIR"
echo "Target: $DEST_DIR"
echo "=========================================="

# 1. Git pull
if [ "$SKIP_PULL" -eq 0 ]; then
  echo "--> Pulling latest changes from git..."
  git -C "$REPO_DIR" pull
else
  echo "--> Skipping git pull (--skip-pull specified)"
fi

# 2. Ensure destination exists
echo "--> Preparing destination directory..."
mkdir -p "$DEST_DIR/brand"

# 3. Copy MockUI/v4 files
echo "--> Syncing MockUI/v4 files..."
rsync -av --delete --exclude=".*" --exclude="brand" --exclude="tokens.css" --exclude="demo-tokens.css" --exclude="favicon.ico" "$REPO_DIR/MockUI/v4/" "$DEST_DIR/"

# 4. Copy brand assets & tokens
echo "--> Syncing brand assets and tokens..."
rsync -av --delete "$REPO_DIR/Demo/frontend/brand/" "$DEST_DIR/brand/"
cp "$REPO_DIR/MockUI/v4-plan/design-system/shehnat/tokens.css" "$DEST_DIR/tokens.css"
cp "$REPO_DIR/Demo/frontend/tokens.css" "$DEST_DIR/demo-tokens.css"
cp "$DEST_DIR/brand/favicon-32.png" "$DEST_DIR/favicon.ico"

# 5. Fix relative paths for standalone web hosting
echo "--> Adjusting asset paths for web serving..."
sed -i 's|\.\./\.\./Demo/frontend/brand/|brand/|g' "$DEST_DIR/index.html"
sed -i 's|\.\./v4-plan/design-system/shehnat/tokens\.css|tokens.css|g' "$DEST_DIR/index.html"

sed -i 's|\.\./\.\./Demo/frontend/brand/|brand/|g' "$DEST_DIR/manager-dashboard.prototype.html"
sed -i 's|\.\./\.\./Demo/frontend/tokens\.css|demo-tokens.css|g' "$DEST_DIR/manager-dashboard.prototype.html"

sed -i 's|\.\./\.\./Demo/frontend/brand/|brand/|g' "$DEST_DIR/screens-public.js"
sed -i 's|\.\./\.\./Demo/frontend/brand/|brand/|g' "$DEST_DIR/ui.js"

# 6. Set correct permissions
echo "--> Setting permissions..."
chmod -R u=rwX,go=rX "$DEST_DIR"

echo "=========================================="
echo "Deployment successful!"
echo "URL: https://algoray.tech/shehnat/demo/"
echo "=========================================="
