require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*"}));
app.use(express.json());

const pool = mysql.createPool({
  host: 'mysql-raja-rajayadav-mysql.a.aivencloud.com',
  port: 26398,
  user: 'avnadmin',
  password: 'AVNS_Gj5limQW85MHLlQSG25',
  database: 'defaultdb',
  ssl: { rejectUnauthorized: false }
});

/* ================= ENCRYPTION ================= */

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
  } catch {
    return null;
  }
}

/* ================= DATABASE ================= */

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_key VARCHAR(16),
      recipient_key VARCHAR(16),
      encrypted_data TEXT,
      timestamp DATETIME
    )
  `);
}

/* ================= ROUTES ================= */

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'online' });
  } catch (err) {
    res.status(500).json({ status: 'error' });
  }
});

app.post('/api/message', async (req, res) => {
  const { senderKey, recipientKey, encryptedData, timestamp } = req.body;

  const reEncrypted = encryptMessage(encryptedData, senderKey, recipientKey);

  await pool.query(
    `INSERT INTO messages (sender_key, recipient_key, encrypted_data, timestamp)
     VALUES (?, ?, ?, ?)`,
    [senderKey, recipientKey, reEncrypted, new Date()]
  );

  res.json({ success: true });
});

app.get('/api/messages/:deviceKey', async (req, res) => {
  const { deviceKey } = req.params;

  const [rows] = await pool.query(
    `SELECT * FROM messages
     WHERE sender_key = ? OR recipient_key = ?
     ORDER BY id DESC LIMIT 100`,
    [deviceKey, deviceKey]
  );

  const messages = rows.map(row => ({
    id: row.id,
    senderKey: row.sender_key,
    recipientKey: row.recipient_key,
    encryptedData: decryptMessage(row.encrypted_data, row.sender_key, row.recipient_key),
    timestamp: row.timestamp
  }));

  res.json(messages);
});

/* ================= START ================= */

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log("🚀 VISRODECK RELAY LIVE ON", PORT);
  });
});
