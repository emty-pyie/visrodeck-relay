# 📁 Visrodeck Relay - Project Structure

```
visrodeck-relay/
│
├── 📂 frontend/                    # React Frontend Application
│   ├── App.jsx                    # Main React component with UI
│   ├── main.jsx                   # React entry point
│   ├── index.html                 # HTML template
│   ├── package.json               # Frontend dependencies
│   ├── vite.config.js             # Vite build configuration
│   ├── nginx.conf                 # Nginx configuration for production
│   └── Dockerfile                 # Docker container for frontend
│
├── 📂 backend/                     # Express Backend Server
│   ├── server.js                  # Main server with API routes & encryption
│   ├── package.json               # Backend dependencies
│   ├── .env.example               # Environment variables template
│   └── Dockerfile                 # Docker container for backend
│
├── 📂 database/                    # Database Files
│   └── schema.sql                 # MySQL database schema & setup
│
├── 📄 README.md                    # Main documentation
├── 📄 DEPLOYMENT.md                # Deployment guide (local, Docker, production)
├── 📄 LICENSE                      # MIT License
├── 📄 .gitignore                   # Git ignore rules
├── 📄 docker-compose.yml           # Docker Compose configuration
└── 📄 start.sh                     # Quick start script (executable)

```

## 🗂️ File Descriptions

### Frontend Files

**App.jsx** (Main Component)
- Full React UI with dark cyber-tech theme
- Animated background with node visualization
- Connection management interface
- Message encryption/decryption
- Real-time message synchronization
- Device key generation and display

**main.jsx**
- React application entry point
- Renders App component

**index.html**
- HTML template with JetBrains Mono font
- Dark theme base styles

**package.json**
- React, React-DOM, Lucide-React icons
- Vite for development and building
- Development tools

**vite.config.js**
- Vite configuration for fast development
- Port 3000, auto-open browser

**nginx.conf**
- Production web server configuration
- Gzip compression
- Security headers
- API proxy setup

**Dockerfile**
- Multi-stage build (Node → Nginx)
- Optimized production container

### Backend Files

**server.js** (Main Server)
- Express REST API
- AES-256-GCM encryption with PBKDF2
- MySQL connection pool
- Message routing and storage
- Garbage noise injection
- FIFO cleanup mechanism
- Device key management
- Session handling

**package.json**
- Express, CORS, MySQL2
- Nodemon for development
- Production dependencies

**.env.example**
- Database configuration template
- Security settings
- Server configuration

**Dockerfile**
- Node.js Alpine container
- Production optimized
- Health checks included

### Database Files

**schema.sql**
- Complete database schema
- Tables: messages, device_keys, sessions, message_queue
- Indexes for performance
- FIFO cleanup stored procedure
- Automatic event scheduler

### Root Files

**README.md**
- Project overview
- Features and architecture
- Quick start guide
- API documentation
- Security features

**DEPLOYMENT.md**
- Local development setup
- Docker deployment
- Production server setup (Nginx, SSL, PM2)
- Cloud deployment (AWS, DigitalOcean)
- Security checklist
- Backup strategy
- Troubleshooting

**docker-compose.yml**
- Complete Docker stack
- MySQL, Backend, Frontend services
- Network configuration
- Volume persistence

**start.sh**
- Automated setup script
- Dependency installation
- Service startup
- Status checking

**.gitignore**
- Node modules
- Environment files
- Build outputs
- IDE files

**LICENSE**
- MIT License

## 🔑 Key Technologies

### Frontend
- **React 18**: Modern UI framework
- **Vite**: Fast build tool
- **Lucide React**: Icon library
- **Canvas API**: Animated background
- **LocalStorage**: Device key persistence

### Backend
- **Express**: Web framework
- **Node.js Crypto**: AES-256-GCM encryption
- **MySQL2**: Database driver with promise support
- **CORS**: Cross-origin resource sharing

### Database
- **MySQL 8.0**: Relational database
- **InnoDB Engine**: ACID compliance
- **Stored Procedures**: Automated cleanup
- **Event Scheduler**: Periodic maintenance

### DevOps
- **Docker**: Containerization
- **Nginx**: Reverse proxy & web server
- **PM2**: Process manager
- **Let's Encrypt**: Free SSL certificates

## 🚀 Quick Start Commands

```bash
# Install all dependencies
cd frontend && npm install
cd ../backend && npm install

# Start development
./start.sh

# Or manually:
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2

# Docker deployment
docker-compose up -d

# Production build
cd frontend && npm run build
cd ../backend && NODE_ENV=production npm start
```

## 📊 Data Flow

```
User Input → React Component
     ↓
Device Key (16 digits) + Message
     ↓
Base64 Encode (client-side)
     ↓
POST /api/message
     ↓
Backend: Re-encrypt (AES-256-GCM)
     ↓
Add Garbage Noise
     ↓
Store in MySQL (encrypted)
     ↓
GET /api/messages/:deviceKey
     ↓
Decrypt (server) → Decrypt (client)
     ↓
Display in UI
```

## 🔐 Security Layers

1. **Client-Side**: Initial encoding
2. **Transport**: HTTPS (in production)
3. **Server-Side**: AES-256-GCM re-encryption
4. **Storage**: Encrypted data in database
5. **Obfuscation**: Garbage noise
6. **Cleanup**: Automatic FIFO deletion

## 📝 Important Notes

- All encryption keys are 16 digits
- Messages stored encrypted
- No personal information required
- Automatic cleanup keeps database small
- FIFO ensures privacy (last 1000 messages)
- Garbage noise makes traffic analysis harder

## 🔄 Workflow

1. User opens app → Device key generated
2. Share key with friend
3. Friend enters your key → Connection established
4. Type message → Encrypted → Sent
5. Backend stores encrypted message + noise
6. Recipient fetches → Decrypts → Displays
7. Old messages auto-deleted (FIFO)

---

**Ready to deploy to GitHub? All files are prepared and production-ready!**
