# 🆘 Grace — Disaster Recovery Runbook

> **Last updated:** 2026-02-21  
> **Backup location:** `s3://grace-server-backups-graceclaw` (us-east-1)  
> **Restic password:** stored privately — ask Asif or retrieve from `~/.restic.env` on the server  
> **AWS credentials:** stored in `graceclaw-1/polymarket-scanner-web` → GitHub repo secrets  
> **Restore script:** [`scripts/restore-grace.sh`](../scripts/restore-grace.sh)

---

## ⚡ TL;DR — Full Restore in One Command

If you have a fresh EC2 instance, AWS credentials, and the restic password:

```bash
curl -fsSL https://raw.githubusercontent.com/graceclaw-1/grace-agent-system/main/scripts/restore-grace.sh \
  -o /tmp/restore-grace.sh

export AWS_ACCESS_KEY_ID="<from GitHub secrets>"
export AWS_SECRET_ACCESS_KEY="<from GitHub secrets>"
export RESTIC_PASSWORD="<ask Asif>"

bash /tmp/restore-grace.sh
```

This script handles everything below automatically. The rest of this document covers manual steps for partial scenarios.

---

## 📋 Scenarios

| Scenario | Section |
|---|---|
| Lost SSH / locked out | [§1 Regain Access](#1-regain-access) |
| OpenClaw crashed / won't start | [§2 Restart Services](#2-restart-services) |
| Data corruption / accidental deletion | [§3 Restore from Backup](#3-restore-from-backup) |
| Full server loss (terminated/corrupted) | [§4 Full Rebuild](#4-full-rebuild) |
| GitHub Actions / backup pipeline broken | [§5 Backup Pipeline Recovery](#5-backup-pipeline-recovery) |
| AWS account access lost | [§6 AWS Access Recovery](#6-aws-access-recovery) |

---

## §1 Regain Access

**If SSH is locked out or key is lost:**

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2)
2. Select the Grace instance → **Actions → Connect → EC2 Instance Connect** (browser SSH — no key needed, no AWS CLI required)
3. From there, add your new SSH public key:
   ```bash
   echo "ssh-ed25519 YOUR_NEW_PUBLIC_KEY" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```
4. Reconnect via normal SSH: `ssh -i your_key.pem ec2-user@3.88.86.229`

> ⚠️ **If EC2 Instance Connect is also unavailable** (e.g. network ACL or SG blocks port 22): use AWS Systems Manager Session Manager — it connects via the SSM agent over HTTPS, bypassing SSH entirely. The instance has the SSM agent installed and an IAM role with SSM permissions.

---

## §2 Restart Services

**Grace is down but server is up.** Run in order:

```bash
# 1. OpenClaw Gateway
systemctl --user restart openclaw-gateway
systemctl --user status openclaw-gateway

# 2. Nginx (must be up before Grafana/external access works)
sudo systemctl restart nginx
sudo systemctl status nginx

# 3. Monitoring stack
sudo systemctl restart prometheus grafana-server loki promtail
sudo systemctl status prometheus grafana-server

# 4. Grace Agent Relay (if not auto-restarted)
systemctl --user list-units | grep relay
# If not running, it should be under user systemd — check:
ls ~/.config/systemd/user/
```

**Verify everything is up:**
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/graceclaw-1/grace-agent-system/main/scripts/health-check-grace.sh)
```

---

## §3 Restore from Backup

**You have the server, but files are missing or corrupted.**

```bash
# Load credentials (should already exist on the server)
source ~/.restic.env

# List available snapshots (most recent first)
restic snapshots

# Restore a specific path only (surgical restore)
restic restore latest --target / --include /home/ec2-user/.openclaw
restic restore latest --target / --include /etc/nginx

# Full restore — overwrites everything with latest snapshot
restic restore latest --target /

# After any restore, restart services
systemctl --user restart openclaw-gateway
sudo systemctl restart nginx prometheus grafana-server loki promtail
```

**If `~/.restic.env` is missing** (credentials file lost):
```bash
# Reconstruct it — get values from GitHub secrets and Asif
cat > ~/.restic.env << 'EOF'
export AWS_ACCESS_KEY_ID=REPLACE_WITH_VALUE_FROM_GITHUB_SECRETS
export AWS_SECRET_ACCESS_KEY=REPLACE_WITH_VALUE_FROM_GITHUB_SECRETS
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/grace-server-backups-graceclaw/restic"
export RESTIC_PASSWORD="REPLACE_WITH_RESTIC_PASSWORD_FROM_ASIF"
EOF
chmod 600 ~/.restic.env
source ~/.restic.env
restic snapshots  # Verify connectivity
```

> 📍 AWS keys: GitHub → `graceclaw-1/polymarket-scanner-web` → Settings → Secrets

---

## §4 Full Rebuild

**Complete server loss. Starting from zero.**

### Step 1 — Launch a new EC2 instance

| Setting | Value |
|---|---|
| AMI | Amazon Linux 2023 (arm64 / aarch64) |
| Instance type | `c7g.xlarge` (Graviton3) |
| Region | `us-east-1` |
| Availability Zone | `us-east-1d` (to match EBS snapshots if restoring volumes) |
| Storage | 64 GB gp3 root volume |
| Security group | Ports: 22, 80, 443, 18789, 3000, 9090 |
| IAM role | Attach a role with S3 read + SSM access (or use AWS credentials env vars) |
| Key pair | Use existing key pair or create new one |

### Step 2 — Bootstrap (run on the new instance)

```bash
ssh -i your_key.pem ec2-user@NEW_IP

# Download restore script
curl -fsSL https://raw.githubusercontent.com/graceclaw-1/grace-agent-system/main/scripts/restore-grace.sh \
  -o /tmp/restore-grace.sh

# Set credentials
export AWS_ACCESS_KEY_ID="VALUE_FROM_GITHUB_SECRETS"
export AWS_SECRET_ACCESS_KEY="VALUE_FROM_GITHUB_SECRETS"
export RESTIC_PASSWORD="VALUE_FROM_ASIF"

bash /tmp/restore-grace.sh
```

The script will:
- [x] Install Node.js 22, restic, AWS CLI
- [x] Configure AWS credentials and restic env
- [x] Restore all files from S3 backup (~3.5 GiB)
- [x] Reinstall OpenClaw and register the systemd gateway service
- [x] Start all services (nginx, prometheus, grafana, loki, promtail)
- [x] Run health check

**Expected restore time:** ~5–10 minutes

### Step 3 — Update IP references (if Elastic IP was lost)

If you lost the old Elastic IP (`3.88.86.229`):
1. Allocate a new EIP in AWS console → Associate with new instance
2. Update GitHub secrets with new IP:
   ```bash
   gh secret set GRACE_SERVER_IP --body "NEW_IP" -R graceclaw-1/polymarket-scanner-web
   ```
3. Update nginx config if it references the old IP:
   ```bash
   sudo grep -r "3.88.86.229" /etc/nginx/ && sudo nginx -t && sudo systemctl reload nginx
   ```

### Step 4 — Verify Slack connectivity

OpenClaw connects to Slack via WebSocket (outbound only) — no IP changes needed in Slack config.

```bash
openclaw status
# Should show: gateway running, agents active, Slack connected
```

Then send a test: `@Grace status check` in any Slack channel.

---

## §5 Backup Pipeline Recovery

**Daily GitHub Actions backup stopped running.**

```bash
# Check last run status
gh run list -R graceclaw-1/polymarket-scanner-web --workflow=grace-backup.yml --limit 5

# Trigger manual backup immediately
gh workflow run grace-backup.yml \
  -R graceclaw-1/polymarket-scanner-web \
  --field action=backup

# If GitHub Actions is unavailable, run locally on the server:
source ~/.restic.env
restic backup \
  ~/.openclaw ~/.config ~/.npm-global \
  /etc/nginx /etc/systemd/system /opt \
  --exclude /etc/nginx/ssl \
  --exclude /opt/containerd \
  --tag "manual-$(date +%Y-%m-%d)"
```

**If the S3 bucket was deleted:**
1. Recreate it: `aws s3 mb s3://grace-server-backups-graceclaw --region us-east-1`
2. Re-enable versioning: `aws s3api put-bucket-versioning --bucket grace-server-backups-graceclaw --versioning-configuration Status=Enabled`
3. Re-initialize restic repo: `source ~/.restic.env && restic init`
4. Run a fresh full backup

---

## §6 AWS Access Recovery

**AWS credentials compromised or expired.**

1. Log into AWS Console → IAM → Users
2. Rotate the access key: deactivate old key, create new one
3. Update GitHub secrets:
   ```bash
   gh secret set AWS_ACCESS_KEY_ID --body "NEW_KEY" -R graceclaw-1/polymarket-scanner-web
   gh secret set AWS_SECRET_ACCESS_KEY --body "NEW_SECRET" -R graceclaw-1/polymarket-scanner-web
   ```
4. Update local credentials on the server:
   ```bash
   # Update ~/.aws/credentials and ~/.restic.env with new values
   nano ~/.aws/credentials
   nano ~/.restic.env
   ```
5. Verify: `source ~/.restic.env && restic snapshots`

---

## 🔑 Critical Credentials Reference

| Credential | Where to find it |
|---|---|
| AWS Access Key ID | GitHub → `graceclaw-1/polymarket-scanner-web` → Secrets: `AWS_ACCESS_KEY_ID` |
| AWS Secret Key | GitHub → `graceclaw-1/polymarket-scanner-web` → Secrets: `AWS_SECRET_ACCESS_KEY` |
| Restic password | Ask Asif — stored privately, not in any repo |
| OpenClaw gateway token | `~/.config/systemd/user/openclaw-gateway.service` (restored from backup) |
| Slack bot token + app token | `~/.openclaw/openclaw.json` (restored from backup) |
| SSH deployer key (trading bot) | GitHub → Secrets: `DEPLOYER_SSH_PRIVATE_KEY` |
| Grace server SSH key | GitHub → Secrets: `GRACE_SERVER_SSH_KEY` |

> ⚠️ **Keep the restic password and AWS credentials somewhere offline** (password manager, printed sheet in a safe location). If both GitHub and the server are inaccessible simultaneously, offline credentials are the only path to recovery.

---

## 📅 Backup Schedule & Coverage

| What | How often | Where |
|---|---|---|
| Full config + workspace | Daily 3 AM UTC | `s3://grace-server-backups-graceclaw/restic` |
| EBS volume snapshot | Daily 2 AM UTC | AWS DLM (Terraform-managed, when applied) |

**Retention:** 7 daily, 4 weekly, 3 monthly restic snapshots

**Backed up:** `.openclaw/`, `.config/`, `.npm-global/`, `/etc/nginx/` (excluding ssl/), `/etc/systemd/system/`, `/opt/`

**Not backed up (requires manual action after restore):**
- `/etc/nginx/ssl/` — TLS certificates and private keys. Regenerate via `certbot renew` or re-issue from your certificate provider
- AWS credentials themselves — by design, not stored in backup
- Restic password — by design, not stored in backup or any repo

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
```

---

## 🔒 Security Notes

- The restic backup is **encrypted at rest** (AES-256 via restic) and in transit (HTTPS to S3)
- The S3 bucket has **public access blocked** and **versioning enabled**
- This runbook is intentionally stored in a **public repo** — all passwords and keys are excluded. The runbook itself contains no secrets
- Rotate AWS credentials immediately if you suspect compromise — see §6
