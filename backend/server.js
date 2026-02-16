require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

app.use(cors({
  origin: [
    "https://relay.visrodeck.com",
    "http://localhost:3000",
    "https://lilian-interindividual-merle.ngrok-free.dev",
    "https://visrodeck-relay-5azs.vercel.app"
  ],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'visrodeck_relay',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_recipient (recipient_key),
        INDEX idx_sender (sender_key),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_key VARCHAR(16) UNIQUE NOT NULL,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_device_key (device_key)
      ) ENGINE=InnoDB
    `);

    console.log('✓ Database tables initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

async function registerDeviceKey(deviceKey) {
  try {
    await pool.query(
      `INSERT INTO device_keys (device_key) VALUES (?)
       ON DUPLICATE KEY UPDATE last_seen = CURRENT_TIMESTAMP`,
      [deviceKey]
    );
  } catch (error) {
    console.error('Device key registration failed:', error);
  }
}

async function cleanOldMessages() {
  try {
    await pool.query(`
      DELETE FROM messages 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM messages 
          ORDER BY timestamp DESC 
          LIMIT 1000
        ) as temp
      )
    `);
  } catch (error) {
    console.error('Message cleanup failed:', error);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

app.post('/api/message', async (req, res) => {
  try {
    const { senderKey, recipientKey, encryptedData, timestamp } = req.body;

    if (!senderKey || !recipientKey || !encryptedData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (senderKey.length !== 16 || recipientKey.length !== 16) {
      return res.status(400).json({ error: 'Invalid key format' });
    }

    await registerDeviceKey(senderKey);
    await registerDeviceKey(recipientKey);

    const reEncrypted = encryptMessage(encryptedData, senderKey, recipientKey);
    const garbageNoise = addGarbageNoise();
    const mysqlTimestamp = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await pool.query(
      `INSERT INTO messages (sender_key, recipient_key, encrypted_data, garbage_noise, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [senderKey, recipientKey, reEncrypted, garbageNoise, mysqlTimestamp]
    );

    if (Math.random() < 0.1) {
      cleanOldMessages();
    }

    res.json({ 
      success: true, 
      messageId: result.insertId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Message send failed:', error);
    res.status(500).json({ error: 'Failed to send message', message: error.message });
  }
});

app.get('/api/messages/:deviceKey', async (req, res) => {
  try {
    const { deviceKey } = req.params;

    if (!deviceKey || deviceKey.length !== 16) {
      return res.status(400).json({ error: 'Invalid device key' });
    }

    const [rows] = await pool.query(
      `SELECT id, sender_key, recipient_key, encrypted_data, timestamp
       FROM messages 
       WHERE sender_key = ? OR recipient_key = ?
       ORDER BY timestamp DESC
       LIMIT 100`,
      [deviceKey, deviceKey]
    );

    const messages = rows.map(row => {
      const decrypted = decryptMessage(row.encrypted_data, row.sender_key, row.recipient_key);
      return {
        id: row.id,
        senderKey: row.sender_key,
        recipientKey: row.recipient_key,
        encryptedData: decrypted || '[Decryption failed]',
        timestamp: row.timestamp
      };
    });

    res.json(messages);
  } catch (error) {
    console.error('Message retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve messages', message: error.message });
  }
});

app.delete('/api/messages/:deviceKey', async (req, res) => {
  try {
    const { deviceKey } = req.params;

    if (!deviceKey || deviceKey.length !== 16) {
      return res.status(400).json({ error: 'Invalid device key' });
    }

    await pool.query(
      `DELETE FROM messages WHERE sender_key = ? OR recipient_key = ?`,
      [deviceKey, deviceKey]
    );

    res.json({ success: true, message: 'Messages deleted' });
  } catch (error) {
    console.error('Message deletion failed:', error);
    res.status(500).json({ error: 'Failed to delete messages', message: error.message });
  }
});

app.get('/api/nodes/count', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(DISTINCT device_key) as count 
       FROM device_keys 
       WHERE last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
    );
    res.json({ activeNodes: rows[0].count });
  } catch (error) {
    console.error('Node count failed:', error);
    res.status(500).json({ error: 'Failed to get node count', message: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message
  });
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
      console.log(`✓ Encryption enabled (AES-256-GCM)`);
      console.log(`✓ FIFO cleanup active`);
      console.log('');
      console.log('Ready to relay encrypted messages...');
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

startServer();
