#!/usr/bin/env bash
# Install or update the Ansel Heads-Up Slack service on a Debian/Ubuntu VM (e.g. Google Cloud e2-micro).
# Safe to re-run: use it for first install and for every update.
#
#   sudo apt-get update && sudo apt-get install -y git
#   sudo git clone https://github.com/lamgs/ansel-headsup.git /opt/ansel-headsup
#   sudo /opt/ansel-headsup/slack-app/deploy/setup-vm.sh
#
# Secrets live in /opt/ansel-headsup/slack-app/.env (create it first; readable only by the service user).
set -euo pipefail

APP_DIR=/opt/ansel-headsup
SVC_USER=headsup
SERVICE=ansel-headsup
ENV_FILE="$APP_DIR/slack-app/.env"

[[ $EUID -eq 0 ]] || { echo "Run with sudo."; exit 1; }
[[ -d "$APP_DIR/.git" ]] || { echo "Clone the repo to $APP_DIR first (see the top of this script)."; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "Create $ENV_FILE first: sudo nano $ENV_FILE (paste your slack-app/.env)."; exit 1; }

# 1. Node.js 22 (needs 20.12+ for .env loading)
if ! command -v node >/dev/null || [[ $(node -p 'process.versions.node.split(".")[0]') -lt 22 ]]; then
  echo "Installing Node.js 22..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg git
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

# 2. Service account with no login shell
id "$SVC_USER" >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin "$SVC_USER"

# 3. Latest code + dependencies
git config --global --add safe.directory "$APP_DIR"
git -C "$APP_DIR" pull --ff-only
(cd "$APP_DIR/slack-app" && npm ci --omit=dev --no-audit --no-fund)

# 4. Lock down the secrets file
chown "$SVC_USER:$SVC_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# 5. systemd service: starts on boot, restarts on crash, sends SIGTERM on stop
cat > /etc/systemd/system/$SERVICE.service <<UNIT
[Unit]
Description=Ansel Heads-Up Slack service
After=network-online.target
Wants=network-online.target

[Service]
User=$SVC_USER
WorkingDirectory=$APP_DIR/slack-app
ExecStart=$(command -v node) src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
systemctl restart "$SERVICE"
sleep 3
systemctl --no-pager --lines=0 status "$SERVICE" | head -3
echo
echo "Recent logs (Ctrl+C to stop):  sudo journalctl -u $SERVICE -f"
journalctl -u "$SERVICE" --no-pager -n 8
