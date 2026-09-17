# 🚀 LeetCompete Platform - Deployment Guide

This guide covers step-by-step instructions for deploying the **LeetCompete** competitive programming platform.

---

## 🛠 Platform Architecture Overview

- **Frontend**: Next.js 16 App Router (Node.js) – runs on port `3000`.
- **Backend API**: FastAPI (Python 3.10) – runs on port `8000`.
- **Database**: SQLite (`server/leetcompete.db`).
- **Code Execution Sandbox**: GCC / G++ / OpenJDK / Node.js / Python runner.

---

## 🐳 Option 1: Docker Compose Deployment (Recommended)

Docker Compose provides a single-command setup with all compilers (C++, Java, Python, JavaScript) pre-installed inside containerized environments.

### 1. Prerequisites
- Install Docker & Docker Compose on your server/VPS:
  ```bash
  sudo apt update
  sudo apt install -y docker.io docker-compose-v2
  ```

### 2. Launch the Platform
From the repository root directory, run:
```bash
docker compose up -d --build
```

### 3. Verify Containers
```bash
docker compose ps
```
The platform will be live at:
- **Frontend**: `http://YOUR_SERVER_IP:3000`
- **Backend API**: `http://YOUR_SERVER_IP:8000`

---

## 💻 Option 2: Linux VPS / Ubuntu Deployment (Systemd + Nginx + SSL)

Ideal for VPS providers (DigitalOcean, Linode, AWS EC2, Hetzner, Vultr).

### Step 1: Install System Dependencies & Compilers
```bash
sudo apt update && sudo apt install -y \
  python3.10 python3.10-venv python3-pip \
  build-essential g++ gcc default-jdk nodejs npm nginx certbot python3-certbot-nginx
```

### Step 2: Set Up Backend (FastAPI)
```bash
cd /var/www/LEETCOMPETE/server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start backend via Uvicorn systemd service or PM2
```

#### Systemd Backend Service File: `/etc/systemd/system/leetcompete-backend.service`
```ini
[Unit]
Description=LeetCompete FastAPI Backend Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/LEETCOMPETE/server
ExecStart=/var/www/LEETCOMPETE/server/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start backend:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now leetcompete-backend
```

---

### Step 3: Set Up Frontend (Next.js)
```bash
cd /var/www/LEETCOMPETE/client
npm install
npm run build
```

#### Systemd Frontend Service File: `/etc/systemd/system/leetcompete-frontend.service`
```ini
[Unit]
Description=LeetCompete Next.js Frontend Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/LEETCOMPETE/client
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start frontend:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now leetcompete-frontend
```

---

### Step 4: Configure Nginx Reverse Proxy with SSL

Create Nginx site config `/etc/nginx/sites-available/leetcompete`:

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API (FastAPI)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable config & restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/leetcompete /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Obtain Free SSL Certificate via Let's Encrypt:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔒 Security Best Practices for Production

1. **Change JWT Secret**:
   Update `JWT_SECRET` in `server/auth.py` or `.env` with a strong random 64-character string:
   ```bash
   openssl rand -hex 32
   ```

2. **Database Backup**:
   Schedule automatic SQLite backups:
   ```bash
   cp /var/www/LEETCOMPETE/server/leetcompete.db /var/www/backups/leetcompete_$(date +%F).db
   ```
