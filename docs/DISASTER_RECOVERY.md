# 🆘 Grace — Disaster Recovery Runbook

> **Last updated:** 2026-02-21  
> **Backup location:** `s3://grace-server-backups-graceclaw` (us-east-1)  
> **Restic password:** `Grace-77407`  
> **AWS credentials:** stored in `graceclaw-1/polymarket-scanner-web` → GitHub repo secrets

---

## ⚡ TL;DR — Full Restore in One Command

If you have a fresh EC2 instance and AWS credentials, run this from your laptop:

```bash
curl -fsSL https://raw.githubusercontent.com/graceclaw-1/grace-agent-system/main/scripts/restore-grace.sh | \
  AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> bash
```

This script handles everything below automatically. The rest of this document explains each step if you need to do it manually or partially.

---

## 📋 Scenarios

| Scenario | Section |
|---|---|
| Lost SSH / locked out | [§1 Regain Access](#1-regain-access) |
| OpenClaw crashed / won't start | [§2 Restart Services](#2-restart-services) |
| Data corruption / accidental deletion | [§3 Restore from Backup](#3-restore-from-backup) |
| Full server loss (terminated/corrupted) | [§4 Full Rebuild](#4-full-rebuild) |

---

## §1 Regain Access

**If SSH is locked out or key is lost:**

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2)
2. Select the Grace instance → **Actions → Connect → EC2 Instance Connect** (browser SSH — no key needed)
3. From there, add your new SSH public key:
   ```bash
   echo "ssh-ed25519 YOUR_NEW_PUBLIC_KEY" >> ~/.ssh/authorized_keys
   ```
4. Reconnect via normal SSH: `ssh -i your_key.pem ec2-user@3.88.86.229`

---

## §2 Restart Services

**Grace is down but server is up.** Run in order:

```bash
# 1. OpenClaw Gateway
systemctl --user restart openclaw-gateway
systemctl --user status openclaw-gateway

# 2. Nginx
sudo systemctl restart nginx
sudo systemctl status nginx

# 3. Monitoring stack
sudo systemctl restart prometheus grafana-server loki promtail
sudo systemctl status prometheus grafana-server

# 4. Grace Agent Relay
# The relay auto-restarts via its systemd user service
# If it's not running:
systemctl --user list-units | grep relay
cd ~/.openclaw/workspace/agents/relay && node index.js &
```

**Check everything is up:**
```bash
curl -s http://localhost:18789/health  # OpenClaw gateway
curl -s http://localhost/grafana/api/health  # Grafana via nginx
systemctl --user is-active openclaw-gateway && echo "OpenClaw: OK"
sudo systemctl is-active nginx && echo "Nginx: OK"
```

---

## §3 Restore from Backup

**You have the server, but files are missing or corrupted.**

```bash
# Load credentials (already configured on this server)
source ~/.restic.env

# List available snapshots
restic snapshots

# Restore specific path (example: restore just .openclaw config)
restic restore latest --target / --include /home/ec2-user/.openclaw

# Restore everything (full data restore to original paths)
restic restore latest --target /

# After restore, restart services
systemctl --user restart openclaw-gateway
sudo systemctl restart nginx prometheus grafana-server loki promtail
```

**If `.restic.env` is missing** (credentials lost):
```bash
cat > ~/.restic.env << 'EOF'
export AWS_ACCESS_KEY_ID=YOUR_KEY_HERE
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_HERE
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/grace-server-backups-graceclaw/restic"
export RESTIC_PASSWORD="Grace-77407"
EOF
chmod 600 ~/.restic.env
source ~/.restic.env
```
*(Get AWS keys from: GitHub → graceclaw-1/polymarket-scanner-web → Settings → Secrets)*

---

## §4 Full Rebuild

**Complete server loss. Starting from zero.**

### Step 1 — Launch a new EC2 instance

- **AMI:** Amazon Linux 2023 (arm64)
- **Instance type:** `c7g.xlarge` (Graviton3)
- **Region:** `us-east-1`
- **Storage:** 64 GB gp3
- **Security group:** Open ports 22, 80, 443, 18789, 3000, 9090
- **Key pair:** Use your existing key pair or create a new one

### Step 2 — Bootstrap (run on the new instance)

SSH in, then run the automated restore script:

```bash
ssh -i your_key.pem ec2-user@NEW_IP

# Download and run the restore script
curl -fsSL https://raw.githubusercontent.com/graceclaw-1/grace-agent-system/main/scripts/restore-grace.sh \
  -o /tmp/restore-grace.sh

# Set credentials (get from GitHub secrets)
export AWS_ACCESS_KEY_ID="YOUR_KEY"
export AWS_SECRET_ACCESS_KEY="YOUR_SECRET"

bash /tmp/restore-grace.sh
```

The script will:
- [x] Install Node.js v22, npm
- [x] Install OpenClaw globally
- [x] Configure restic + AWS credentials
- [x] Restore all files from S3 backup (`.openclaw`, nginx config, systemd, `/opt`)
- [x] Re-register the OpenClaw gateway systemd service
- [x] Start all services
- [x] Run a health check

### Step 3 — Update the Elastic IP (if needed)

If you lost the old Elastic IP (`3.88.86.229`):
1. Allocate a new EIP in AWS console
2. Associate it with the new instance
3. Update `GRACE_SERVER_IP` in GitHub secrets:
   ```bash
   gh secret set GRACE_SERVER_IP --body "NEW_IP" -R graceclaw-1/polymarket-scanner-web
   ```

### Step 4 — Update Slack bot (if IP changed)

OpenClaw connects to Slack via WebSocket (outbound) — no IP changes needed in Slack. Just confirm the gateway is running and connected:
```bash
openclaw status
# Should show: connected, agents active
```

### Step 5 — Verify Slack connectivity

Send a test message in any Slack channel: `@Grace status check`

---

## 🔑 Critical Credentials Reference

| Credential | Where to find it |
|---|---|
| AWS Access Key | GitHub → graceclaw-1/polymarket-scanner-web → Secrets: `AWS_ACCESS_KEY_ID` |
| AWS Secret Key | GitHub → graceclaw-1/polymarket-scanner-web → Secrets: `AWS_SECRET_ACCESS_KEY` |
| Restic password | `Grace-77407` |
| OpenClaw gateway token | In `~/.config/systemd/user/openclaw-gateway.service` (or restore from backup) |
| Slack bot token | In `~/.openclaw/openclaw.json` after restore |
| SSH deployer key | GitHub → graceclaw-1/polymarket-scanner-web → Secrets: `DEPLOYER_SSH_PRIVATE_KEY` |

---

## 📅 Backup Schedule

- **Daily at 3 AM UTC** — full restic backup via GitHub Actions
- **Retention:** 7 daily, 4 weekly, 3 monthly snapshots
- **What's backed up:** `.openclaw/`, `.config/`, `.npm-global/`, `/etc/nginx/`, `/etc/systemd/system/`, `/opt/`
- **Not backed up:** `/etc/nginx/ssl/` (SSL keys — regenerate via cert renewal)

**Manual backup trigger:**
```bash
# Via GitHub Actions (recommended)
gh workflow run grace-backup.yml -R graceclaw-1/polymarket-scanner-web --field action=backup

# Or locally
source ~/.restic.env
restic backup ~/.openclaw ~/.config ~/.npm-global /etc/nginx /etc/systemd/system /opt \
  --exclude /etc/nginx/ssl --exclude /opt/containerd \
  --tag manual-$(date +%Y-%m-%d)
```

---

## 🧪 Health Check

Run this anytime to verify Grace is fully operational:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/graceclaw-1/grace-agent-system/main/scripts/health-check-grace.sh)
```

Expected output:
```
✅ OpenClaw gateway: running
✅ Nginx: active
✅ Grafana: active
✅ Prometheus: active
✅ Loki: active
✅ Restic backup: last snapshot within 48h
✅ S3 bucket: reachable
✅ Slack: connected
```
