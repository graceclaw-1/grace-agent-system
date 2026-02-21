#!/usr/bin/env bash
# Quick health check — run anytime to verify Grace is fully operational
set -uo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; FAILED=1; }

FAILED=0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Grace Health Check — $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Services
systemctl --user is-active --quiet openclaw-gateway && ok "OpenClaw gateway: running" || fail "OpenClaw gateway: DOWN — run: systemctl --user restart openclaw-gateway"
sudo systemctl is-active --quiet nginx             && ok "Nginx: active"              || fail "Nginx: DOWN — run: sudo systemctl restart nginx"
sudo systemctl is-active --quiet prometheus        && ok "Prometheus: active"         || warn "Prometheus: not running"
sudo systemctl is-active --quiet grafana-server    && ok "Grafana: active"            || warn "Grafana: not running"
sudo systemctl is-active --quiet loki              && ok "Loki: active"               || warn "Loki: not running"
sudo systemctl is-active --quiet promtail          && ok "Promtail: active"           || warn "Promtail: not running"

# Backup freshness
if [[ -f ~/.restic.env ]]; then
  source ~/.restic.env
  LAST_SNAP=$(restic snapshots --json 2>/dev/null | python3 -c "
import sys,json
snaps=json.load(sys.stdin)
if snaps:
    import datetime
    t=snaps[-1]['time'][:19]
    dt=datetime.datetime.strptime(t,'%Y-%m-%dT%H:%M:%S')
    diff=(datetime.datetime.utcnow()-dt).total_seconds()/3600
    print(f'{diff:.1f}h ago ({t})')
else:
    print('no snapshots')
" 2>/dev/null)
  if [[ "$LAST_SNAP" =~ ^[0-9] ]]; then
    HOURS=$(echo "$LAST_SNAP" | cut -d'h' -f1)
    if (( $(echo "$HOURS < 48" | bc -l 2>/dev/null || echo 1) )); then
      ok "Restic backup: last snapshot ${LAST_SNAP}"
    else
      warn "Restic backup: last snapshot ${LAST_SNAP} — may be stale"
    fi
  else
    warn "Restic backup: could not determine last snapshot time"
  fi
else
  warn "Restic env not found (~/.restic.env missing)"
fi

# S3 reachable
aws s3 ls s3://grace-server-backups-graceclaw/ --region us-east-1 &>/dev/null && ok "S3 bucket: reachable" || fail "S3 bucket: unreachable — check AWS credentials"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}All critical checks passed.${NC}"
else
  echo -e "${RED}Some checks failed — see above.${NC}"
fi
echo ""
