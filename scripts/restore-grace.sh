#!/usr/bin/env bash
# =============================================================================
# restore-grace.sh — Full Grace server restore from S3/restic backup
# Usage: AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> bash restore-grace.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
info() { echo -e "${BLUE}→  $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; exit 1; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Grace Server — Full Restore Script"
echo "  $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# --- Verify required env vars ---
[[ -z "${AWS_ACCESS_KEY_ID:-}" ]]     && fail "AWS_ACCESS_KEY_ID not set. Export it before running."
[[ -z "${AWS_SECRET_ACCESS_KEY:-}" ]] && fail "AWS_SECRET_ACCESS_KEY not set. Export it before running."

RESTIC_PASSWORD="${RESTIC_PASSWORD:-}"
[[ -z "$RESTIC_PASSWORD" ]] && fail "RESTIC_PASSWORD not set. Export it before running: export RESTIC_PASSWORD='your-password'"
RESTIC_REPO="s3:s3.amazonaws.com/grace-server-backups-graceclaw/restic"
AWS_REGION="${AWS_REGION:-us-east-1}"
NODE_VERSION="22"

# =============================================================================
# STEP 1 — System packages
# =============================================================================
info "Step 1/8 — Installing system packages..."
sudo dnf update -y -q
sudo dnf install -y -q git curl wget tar unzip jq
ok "System packages ready"

# =============================================================================
# STEP 2 — Node.js
# =============================================================================
info "Step 2/8 — Installing Node.js ${NODE_VERSION}..."
if ! node --version 2>/dev/null | grep -q "^v${NODE_VERSION}"; then
  curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash - 2>/dev/null
  sudo dnf install -y -q nodejs
  # Set npm global prefix
  mkdir -p ~/.npm-global
  npm config set prefix ~/.npm-global
  echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
  export PATH=~/.npm-global/bin:$PATH
else
  warn "Node.js $(node --version) already installed — skipping"
fi
ok "Node.js $(node --version) ready"

# =============================================================================
# STEP 3 — Restic
# =============================================================================
info "Step 3/8 — Installing restic..."
if ! command -v restic &>/dev/null; then
  RESTIC_VER=$(curl -s https://api.github.com/repos/restic/restic/releases/latest | jq -r '.tag_name' | tr -d 'v')
  ARCH=$(uname -m | sed 's/aarch64/arm64/;s/x86_64/amd64/')
  wget -q "https://github.com/restic/restic/releases/download/v${RESTIC_VER}/restic_${RESTIC_VER}_linux_${ARCH}.bz2" -O /tmp/restic.bz2
  bunzip2 /tmp/restic.bz2
  sudo mv /tmp/restic /usr/local/bin/restic
  sudo chmod +x /usr/local/bin/restic
fi
ok "restic $(restic version | head -1) ready"

# =============================================================================
# STEP 4 — AWS CLI
# =============================================================================
info "Step 4/8 — Configuring AWS CLI..."
mkdir -p ~/.aws
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = ${AWS_ACCESS_KEY_ID}
aws_secret_access_key = ${AWS_SECRET_ACCESS_KEY}
EOF
cat > ~/.aws/config << EOF
[default]
region = ${AWS_REGION}
output = json
EOF
chmod 600 ~/.aws/credentials
ok "AWS CLI configured"

# =============================================================================
# STEP 5 — Configure restic
# =============================================================================
info "Step 5/8 — Configuring restic..."
cat > ~/.restic.env << EOF
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
export RESTIC_REPOSITORY="${RESTIC_REPO}"
export RESTIC_PASSWORD="${RESTIC_PASSWORD}"
EOF
chmod 600 ~/.restic.env
ok "Restic env configured"

# =============================================================================
# STEP 6 — Restore from S3
# =============================================================================
info "Step 6/8 — Restoring from S3 backup..."
source ~/.restic.env

echo ""
info "Available snapshots:"
restic snapshots || fail "Cannot connect to restic repository. Check credentials."

echo ""
info "Restoring latest snapshot to / (this may take several minutes)..."
restic restore latest --target / \
  --exclude /proc --exclude /sys --exclude /dev --exclude /run \
  --verbose 2>&1 | tail -5

ok "Restore complete"

# =============================================================================
# STEP 7 — Install OpenClaw
# =============================================================================
info "Step 7/8 — Installing OpenClaw..."
export PATH=~/.npm-global/bin:$PATH

if ! command -v openclaw &>/dev/null; then
  npm install -g openclaw 2>/dev/null | tail -3
  ok "OpenClaw installed"
else
  CURRENT_VER=$(openclaw --version 2>/dev/null || echo "unknown")
  warn "OpenClaw ${CURRENT_VER} already present — skipping install (config restored from backup)"
fi

# Register and start the gateway service
info "Registering OpenClaw gateway as systemd user service..."
systemctl --user daemon-reload
systemctl --user enable openclaw-gateway 2>/dev/null || true
systemctl --user start openclaw-gateway
sleep 3

if systemctl --user is-active --quiet openclaw-gateway; then
  ok "OpenClaw gateway running"
else
  warn "OpenClaw gateway not running — check: systemctl --user status openclaw-gateway"
fi

# Install mem0 plugin if needed
if [[ ! -d ~/.openclaw/extensions/openclaw-mem0 ]]; then
  info "Installing mem0 plugin..."
  openclaw plugin install @mem0/openclaw-mem0 2>/dev/null | tail -3
fi

# =============================================================================
# STEP 8 — Start all services
# =============================================================================
info "Step 8/8 — Starting all services..."

# Nginx
if sudo systemctl is-enabled nginx &>/dev/null; then
  sudo systemctl restart nginx
  ok "Nginx restarted"
fi

# Monitoring stack
for svc in prometheus grafana-server loki promtail; do
  if sudo systemctl is-enabled "$svc" &>/dev/null; then
    sudo systemctl restart "$svc"
    ok "$svc restarted"
  fi
done

# Reload systemd timers
sudo systemctl daemon-reload
systemctl --user daemon-reload

# =============================================================================
# HEALTH CHECK
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check() {
  local name="$1"; local cmd="$2"
  if eval "$cmd" &>/dev/null; then ok "$name"; else warn "$name — CHECK MANUALLY"; fi
}

check "OpenClaw gateway"  "systemctl --user is-active openclaw-gateway"
check "Nginx"             "sudo systemctl is-active nginx"
check "Prometheus"        "sudo systemctl is-active prometheus"
check "Grafana"           "sudo systemctl is-active grafana-server"
check "Loki"              "sudo systemctl is-active loki"
check "S3 reachable"      "aws s3 ls s3://grace-server-backups-graceclaw/ --region us-east-1"
check "Restic snapshots"  "source ~/.restic.env && restic snapshots"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Restore complete!"
echo ""
echo "  Next steps:"
echo "  1. Send '@Grace status check' in any Slack channel"
echo "  2. Verify Grafana: http://YOUR_IP/grafana"
echo "  3. If IP changed, update GRACE_SERVER_IP in GitHub secrets:"
echo "     gh secret set GRACE_SERVER_IP --body 'NEW_IP' \\"
echo "       -R graceclaw-1/polymarket-scanner-web"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
