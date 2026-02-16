require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const app = express();

/* ✅ IMPORTANT CHANGE 1 — Render Port */
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/* ✅ IMPORTANT CHANGE 2 — AIVEN DIRECT CONFIG */
const pool = mysql.createPool({
  host: 'mysql-raja-rajayadav-mysql.aivencloud.com',
  port: 26398,
  user: 'avnadmin',
  password: 'AVNS_Gj5limQW85MHLlQSG25',
  database: 'defaultdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

function deriveKey(deviceKey, salt) {
  return crypto.pbkdf2Sync(deviceKey, salt, 100000, KEY_LENGTH, 'sha512');
}

function encryptMessage(message, senderKey, recipientKey) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(senderKey + recipientKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64');
}

function decryptMessage(encryptedData, senderKey, recipientKey) {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const key = deriveKey(senderKey + recipientKey, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

function addGarbageNoise() {
  const noiseSize = Math.floor(Math.random() * 500) + 100;
  return crypto.randomBytes(noiseSize).toString('base64');
}

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_key VARCHAR(16) NOT NULL,
        recipient_key VARCHAR(16) NOT NULL,
        encrypted_data TEXT NOT NULL,
        garbage_noise TEXT,
        timestamp DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_key VARCHAR(16) UNIQUE NOT NULL,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Database tables initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'online', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log('╔══════════════════════════════════════════╗');
      console.log('║     VISRODECK RELAY SERVER ONLINE        ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Database connected`);
      console.log('Ready to relay encrypted messages...');
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

startServer();
