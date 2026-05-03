#!/bin/bash
set -e

echo "=== TRAINING MARKET VPS PROVISIONING ==="
echo "Started at: $(date)"

# Wait for any running apt processes
echo ">>> Waiting for apt locks..."
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
  sleep 3
done
echo ">>> Apt lock free"

# 1. System update
echo ">>> Updating system packages..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -o Dpkg::Options::='--force-confold'

# 2. Install essential packages
echo ">>> Installing essentials..."
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  curl wget git build-essential software-properties-common \
  ca-certificates gnupg lsb-release ufw fail2ban \
  apt-transport-https

# 3. Install Docker
echo ">>> Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo "Docker installed: $(docker --version)"
else
  echo "Docker already installed: $(docker --version)"
fi

# 4. Install Node.js 20
echo ">>> Installing Node.js 20..."
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "Node installed: $(node -v)"
else
  echo "Node already installed: $(node -v)"
fi

# 5. Install pnpm
echo ">>> Installing pnpm..."
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm
  echo "pnpm installed: $(pnpm -v)"
else
  echo "pnpm already installed: $(pnpm -v)"
fi

# 6. Install PM2
echo ">>> Installing PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  pm2 startup systemd -u root --hp /root
  echo "PM2 installed: $(pm2 -v)"
else
  echo "PM2 already installed: $(pm2 -v)"
fi

# 7. Install Nginx
echo ">>> Installing Nginx..."
if ! command -v nginx &>/dev/null; then
  apt-get install -y nginx
  systemctl enable nginx
  echo "Nginx installed: $(nginx -v 2>&1)"
else
  echo "Nginx already installed: $(nginx -v 2>&1)"
fi

# 8. Install Certbot
echo ">>> Installing Certbot..."
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot python3-certbot-nginx
  echo "Certbot installed: $(certbot --version 2>&1)"
else
  echo "Certbot already installed: $(certbot --version 2>&1)"
fi

# 9. Configure UFW firewall
echo ">>> Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status

# 10. Create app directory
echo ">>> Creating app directory..."
mkdir -p /opt/training-market
mkdir -p /opt/training-market/uploads

echo ""
echo "=== PROVISIONING COMPLETE ==="
echo "Finished at: $(date)"
echo ""
echo "Installed versions:"
echo "  Docker: $(docker --version 2>/dev/null || echo 'N/A')"
echo "  Node:   $(node -v 2>/dev/null || echo 'N/A')"
echo "  pnpm:   $(pnpm -v 2>/dev/null || echo 'N/A')"
echo "  PM2:    $(pm2 -v 2>/dev/null || echo 'N/A')"
echo "  Nginx:  $(nginx -v 2>&1 || echo 'N/A')"
echo "  Certbot: $(certbot --version 2>&1 || echo 'N/A')"
