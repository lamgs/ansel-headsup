#!/usr/bin/env bash
# Install or update the Ansel Heads-Up Slack service on a Debian/Ubuntu VM (e.g. Google Cloud e2-micro).
# Safe to re-run: use it for first install and for every update.
#
#   sudo apt-get update && sudo apt-get install -y git
#   sudo git clone https://github.com/lamgs/ansel-headsup.git /opt/ansel-headsup
#   sudo /opt/ansel-headsup/slack-app/deploy/setup-vm.sh
#
# Secrets live in /opt/ansel-headsup/slack-app/.env (create it first; readable only by the service user).
#
# Ansel → Slack status sync (optional): with SYNC_SECRET and PUBLIC_HOSTNAME in .env, this also installs
# Caddy, which serves the service's /api/* over HTTPS (Let's Encrypt) so the hosted prototype can reach it.
# PUBLIC_HOSTNAME=auto uses <external-ip>.sslip.io. The VM needs "Allow HTTP/HTTPS traffic" ticked.
set -euo pipefail

APP_DIR=/opt/ansel-headsup
SVC_USER=headsup
SERVICE=ansel-headsup
ENV_FILE="$APP_DIR/slack-app/.env"
env_get() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -e 's/[[:space:]]*#.*$//' -e 's/^["'\'']//' -e 's/["'\'']$//' || true; }

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
# Item statuses from Ansel, mutes and live cards survive restarts in /var/lib/$SERVICE/state.json
StateDirectory=$SERVICE
StateDirectoryMode=0700
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

# 6. Optional: HTTPS for the Ansel → Slack sync API
HOST=$(env_get PUBLIC_HOSTNAME)
API_PORT=$(env_get API_PORT); API_PORT=${API_PORT:-8787}
if [[ -n "$HOST" && -n "$(env_get SYNC_SECRET)" ]]; then
  if [[ "$HOST" == auto ]]; then
    IP=$(curl -fsS -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip || true)
    [[ -n "$IP" ]] || { echo "PUBLIC_HOSTNAME=auto: couldn't read the VM's external IP. Set PUBLIC_HOSTNAME yourself."; exit 1; }
    HOST="${IP//./-}.sslip.io"
  fi
  command -v caddy >/dev/null || { apt-get update -qq; apt-get install -y -qq caddy; }
  cat > /etc/caddy/Caddyfile <<CADDY
# Written by slack-app/deploy/setup-vm.sh. Only the sync API is exposed; Slack traffic stays on Socket Mode.
$HOST {
	handle /api/* {
		reverse_proxy 127.0.0.1:$API_PORT
	}
	respond 404
}
CADDY
  systemctl enable caddy >/dev/null
  systemctl reload-or-restart caddy
  echo "Sync API: https://$HOST/api/health"
  echo "Set the GitHub repo variable HEADSUP_API_URL=https://$HOST and re-run the Pages workflow (see slack-app/README.md)."
elif [[ -n "$(env_get SYNC_SECRET)" ]]; then
  echo "SYNC_SECRET is set but PUBLIC_HOSTNAME isn't: the sync API only listens on 127.0.0.1:$API_PORT."
fi
sleep 3
systemctl --no-pager --lines=0 status "$SERVICE" | head -3
echo
echo "Recent logs (Ctrl+C to stop):  sudo journalctl -u $SERVICE -f"
journalctl -u "$SERVICE" --no-pager -n 8
