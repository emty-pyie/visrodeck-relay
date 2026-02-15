# 🚀 Visrodeck Relay Deployment Guide

This guide covers different deployment options for Visrodeck Relay.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Security Checklist](#security-checklist)

---

## Local Development

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/visrodeck-relay.git
cd visrodeck-relay

# Run the quick start script
./start.sh
```

### Manual Setup

1. **Install Dependencies**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. **Configure Environment**

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials
```

3. **Setup Database**

```bash
mysql -u root -p < database/schema.sql
```

4. **Start Services**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## Docker Deployment

### Prerequisites

- Docker >= 20.10
- Docker Compose >= 2.0

### Quick Deploy

```bash
# Set your database password
export DB_PASSWORD=your_secure_password

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Services

- **MySQL**: `localhost:3306`
- **Backend**: `localhost:3001`
- **Frontend**: `localhost:3000`

### Managing Services

```bash
# Stop services
docker-compose stop

# Restart services
docker-compose restart

# Remove all containers
docker-compose down

# Remove with volumes (deletes data)
docker-compose down -v
```

---

## Production Deployment

### Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+
- MySQL 8.0+
- Nginx (for reverse proxy)
- SSL certificate (Let's Encrypt recommended)

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. Application Setup

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/yourusername/visrodeck-relay.git
cd visrodeck-relay

# Install dependencies
cd backend && npm ci --only=production
cd ../frontend && npm ci
```

### 3. Database Configuration

```bash
# Create database and user
sudo mysql -u root -p

CREATE DATABASE visrodeck_relay;
CREATE USER 'visrodeck'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON visrodeck_relay.* TO 'visrodeck'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
mysql -u visrodeck -p visrodeck_relay < database/schema.sql
```

### 4. Environment Configuration

```bash
# Backend
cd /var/www/visrodeck-relay/backend
cat > .env << EOF
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=visrodeck
DB_PASSWORD=your_secure_password
DB_NAME=visrodeck_relay
SESSION_SECRET=$(openssl rand -base64 32)
EOF
```

### 5. Build Frontend

```bash
cd /var/www/visrodeck-relay/frontend
npm run build
```

### 6. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/visrodeck-relay
```

```nginx
server {
    listen 80;
    server_name relay.visrodeck.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name relay.visrodeck.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/relay.visrodeck.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relay.visrodeck.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Frontend
    location / {
        root /var/www/visrodeck-relay/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000" always;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/visrodeck-relay /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 7. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d relay.visrodeck.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### 8. Start Backend with PM2

```bash
cd /var/www/visrodeck-relay/backend

# Start application
pm2 start server.js --name visrodeck-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Monitor
pm2 monit
```

### 9. Firewall Configuration

```bash
# Allow necessary ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Cloud Deployment

### AWS (Amazon Web Services)

#### Using EC2

1. Launch an EC2 instance (t2.micro for testing, t2.medium+ for production)
2. Use Ubuntu 20.04 LTS AMI
3. Configure security group to allow ports 22, 80, 443
4. Follow the [Production Deployment](#production-deployment) steps above

#### Using RDS for MySQL

1. Create an RDS MySQL instance
2. Update backend `.env` with RDS endpoint:
   ```
   DB_HOST=your-rds-endpoint.rds.amazonaws.com
   DB_USER=admin
   DB_PASSWORD=your_password
   DB_NAME=visrodeck_relay
   ```

### DigitalOcean

1. Create a Droplet (2GB RAM minimum recommended)
2. Choose Ubuntu 20.04 LTS
3. Add your SSH key
4. Follow the [Production Deployment](#production-deployment) steps above

### Heroku

Not recommended due to ephemeral filesystem and need for persistent MySQL.

### Railway / Render

1. Create a new project
2. Add MySQL database service
3. Add backend service (Node.js)
4. Add frontend service (Static Site)
5. Set environment variables
6. Deploy

---

## Security Checklist

### Before Going Live

- [ ] Change all default passwords
- [ ] Generate strong `SESSION_SECRET`
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall
- [ ] Disable root MySQL access
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Add monitoring (e.g., PM2, CloudWatch)
- [ ] Review logs regularly
- [ ] Keep dependencies updated
- [ ] Implement DDoS protection (CloudFlare)

### Nginx Security Headers

Already included in the configuration above:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security

### Database Security

```sql
-- Disable remote root access
UPDATE mysql.user SET Host='localhost' WHERE User='root';
FLUSH PRIVILEGES;

-- Create dedicated user with limited privileges
CREATE USER 'visrodeck'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON visrodeck_relay.* TO 'visrodeck'@'localhost';
```

### Monitoring

```bash
# Check backend logs
pm2 logs visrodeck-backend

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

---

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > /usr/local/bin/backup-visrodeck.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/visrodeck"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -u visrodeck -p'your_password' visrodeck_relay > $BACKUP_DIR/visrodeck_$DATE.sql
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-visrodeck.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-visrodeck.sh") | crontab -
```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
pm2 logs visrodeck-backend

# Check MySQL connection
mysql -u visrodeck -p -e "SELECT 1;"

# Verify environment variables
cd /var/www/visrodeck-relay/backend
cat .env
```

### Frontend not loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Database connection issues

```bash
# Check MySQL status
sudo systemctl status mysql

# Verify database exists
mysql -u visrodeck -p -e "SHOW DATABASES;"

# Test connection from backend
cd /var/www/visrodeck-relay/backend
node -e "const mysql = require('mysql2'); const conn = mysql.createConnection({host:'localhost',user:'visrodeck',password:'your_password',database:'visrodeck_relay'}); conn.connect(err => {if(err) console.error(err); else console.log('Connected!'); conn.end();});"
```

---

## Performance Optimization

### MySQL

```sql
-- Add indexes (already in schema.sql)
CREATE INDEX idx_recipient ON messages(recipient_key);
CREATE INDEX idx_sender ON messages(sender_key);
CREATE INDEX idx_timestamp ON messages(timestamp);

-- Enable query cache
SET GLOBAL query_cache_size = 67108864; -- 64MB
SET GLOBAL query_cache_type = 1;
```

### Nginx

Add to server block:
```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

# Client body cache
client_body_buffer_size 10K;
client_header_buffer_size 1k;
client_max_body_size 8m;
large_client_header_buffers 2 1k;
```

### PM2 Cluster Mode

```bash
pm2 start server.js -i max --name visrodeck-backend
```

---

## Support

For deployment issues:
- Check logs first
- Review this guide
- Open an issue on GitHub
- Contact: support@visrodeck.com

---

**Happy Deploying! 🚀**
