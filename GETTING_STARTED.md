# 🚀 Getting Started with Visrodeck Relay

## ⚡ Super Quick Start (3 minutes)

### Prerequisites
- Node.js 16+ installed
- MySQL 8+ running
- 5 minutes of your time

### Step 1: Setup Database (1 minute)

```bash
# Open MySQL
mysql -u root -p

# Create database
CREATE DATABASE visrodeck_relay;
USE visrodeck_relay;
SOURCE database/schema.sql;
EXIT;
```

### Step 2: Configure Backend (30 seconds)

```bash
cd backend
cp .env.example .env
# Edit .env - set your MySQL password
nano .env
```

### Step 3: Install & Run (1 minute)

```bash
# From project root, run the automated script:
./start.sh

# Or manually:
cd backend
npm install && npm start

# In another terminal:
cd frontend  
npm install && npm run dev
```

### Step 4: Use It! (30 seconds)

1. Open http://localhost:3000
2. Copy your 16-digit device key
3. Share it with a friend
4. Enter their key to connect
5. Start messaging securely!

---

## 🎯 What Just Happened?

### Your Device Key
- Automatically generated when you first open the app
- Stored in your browser's localStorage
- Used to encrypt and decrypt your messages
- **Share this with friends to message them**

### How It Works
```
You → Type Message → Encrypt → Send to Server → Store Encrypted
                                                      ↓
Friend → See Message ← Decrypt ← Fetch ← Server has encrypted data
```

### Security Features Active
✅ AES-256-GCM encryption  
✅ No personal data collected  
✅ Anonymous messaging  
✅ Auto-delete old messages  
✅ Traffic obfuscation  

---

## 🖥️ What You'll See

### Main Interface
- **Your Device Key**: 16-digit code to share with others
- **Connection Box**: Enter recipient's key to connect
- **Node Animation**: Live visualization of the encrypted network
- **Message Area**: Send and receive encrypted messages

### Connection Process
1. Enter recipient's 16-digit key
2. Click "Connect to Node"
3. Watch the encryption animation
4. Wait for "Connected & Encrypted" status
5. Start messaging!

---

## 🔧 Common Issues & Solutions

### "Can't connect to database"
```bash
# Check MySQL is running:
sudo systemctl status mysql

# Verify credentials in backend/.env
```

### "Backend won't start"
```bash
# Check port 3001 is free:
lsof -i :3001

# Check Node version:
node --version  # Should be 16+
```

### "Frontend shows blank page"
```bash
# Check port 3000 is free:
lsof -i :3000

# Clear browser cache and reload
```

### "Messages not sending"
- Ensure backend is running (check http://localhost:3001/api/health)
- Check browser console for errors (F12)
- Verify you're connected (green indicator)

---

## 📱 Using the App

### To Send Messages
1. Make sure you're connected (green indicator)
2. Type your message in the input box
3. Press Enter or click "Send"
4. Message is encrypted and transmitted

### To Receive Messages
- Messages automatically appear when sent to your device key
- App polls every 3 seconds for new messages
- All messages are decrypted locally on your device

### Security Best Practices
✅ Only share your device key with trusted contacts  
✅ Use HTTPS in production (included in deployment guide)  
✅ Clear messages regularly (use the app's delete feature)  
✅ Don't screenshot sensitive conversations  

---

## 🎨 UI Features

### Dark Theme
- Cyber-tech aesthetic
- Animated node network background
- Smooth transitions and animations

### Connection Visualizations
- **Searching**: Finding available nodes
- **Handshaking**: Exchanging keys
- **Encrypting**: Establishing secure connection
- **Connected**: Ready to send messages
- **Transmitting**: Message in transit

### Status Indicators
- 🟢 Green: Connected and secure
- 🟡 Yellow: Connecting or transmitting
- 🔴 Red: Error or disconnected

---

## 🔐 Encryption Explained (Simple)

### Your Device Key (16 digits)
Think of it like your home address. Share it with friends so they know where to send messages.

### Encryption
Every message is scrambled using military-grade encryption. Only you and your recipient can unscramble it.

### The Server's Role
The server is just a relay - it stores encrypted messages but can't read them. Like a mailbox that doesn't know what's inside the letters.

### Automatic Cleanup
Old messages are automatically deleted. The system only keeps the last 1000 messages to ensure privacy and speed.

---

## 📚 Next Steps

### For Regular Use
- Read the full README.md for features
- Check DEPLOYMENT.md for production setup
- See PROJECT_STRUCTURE.md for file organization

### For Development
- Frontend code: `frontend/App.jsx`
- Backend code: `backend/server.js`
- Database: `database/schema.sql`

### For Production
1. Get a domain name (e.g., relay.yourdomain.com)
2. Get a server (AWS, DigitalOcean, etc.)
3. Follow DEPLOYMENT.md for setup
4. Enable SSL/HTTPS
5. Set up monitoring

---

## 🆘 Need Help?

### Quick Checks
1. ✅ MySQL running?
2. ✅ Backend running on port 3001?
3. ✅ Frontend running on port 3000?
4. ✅ .env file configured?
5. ✅ Database schema imported?

### Get Support
- GitHub Issues: Report bugs and request features
- Documentation: README.md, DEPLOYMENT.md
- Project Structure: PROJECT_STRUCTURE.md

---

## 🎉 You're Ready!

Your end-to-end encrypted messaging system is now running locally. 

### Test It Out
1. Open http://localhost:3000 in two different browsers
2. Copy the device key from browser 1
3. Enter it in browser 2
4. Send messages between them
5. See the encryption in action!

### Share It
Ready to share with the world?
1. Upload to GitHub
2. Deploy to a server
3. Get a domain
4. Enable HTTPS
5. Share the link!

---

**Welcome to Visrodeck Relay - Where Privacy Meets Simplicity** 🔐
