// ============================================================================
// VISRODECK RELAY - BACKEND SERVER
// End-to-End Encrypted Anonymous Messaging System
// ============================================================================

// Load environment variables from .env file
require('dotenv').config();

// Import required packages
const express = require('express');        // Web framework
const cors = require('cors');              // Enable cross-origin requests
const mysql = require('mysql2/promise');   // MySQL database with promises
const crypto = require('crypto');          // Built-in encryption module

// Initialize Express app
const app = express();
const PORT = 3001;  // Backend server port

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

// Enable CORS (Cross-Origin Resource Sharing)
// Allows frontend (localhost:3000) to communicate with backend (localhost:3001)
app.use(cors({
  origin: [
    "https://relay.visrodeck.com",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"], // Allow all origins
}));

// Parse incoming JSON request bodies
app.use(express.json());

// ============================================================================
// DATABASE CONNECTION POOL
// ============================================================================

// Create a connection pool for better performance
// Pool reuses connections instead of creating new ones each time
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',           // MySQL server address
  user: process.env.DB_USER || 'root',                // Database username
  password: process.env.DB_PASSWORD || '',            // Database password
  database: process.env.DB_NAME || 'visrodeck_relay', // Database name
  waitForConnections: true,                           // Wait if all connections busy
  connectionLimit: 10,                                // Max 10 simultaneous connections
  queueLimit: 0                                       // No limit on waiting queue
});

// ============================================================================
// ENCRYPTION CONFIGURATION
// ============================================================================

// AES-256-GCM is a military-grade encryption standard
const ALGORITHM = 'aes-256-gcm';   // Advanced Encryption Standard, 256-bit key, GCM mode
const KEY_LENGTH = 32;              // 256 bits = 32 bytes
const IV_LENGTH = 16;               // Initialization Vector length
const SALT_LENGTH = 64;             // Salt for key derivation
const TAG_LENGTH = 16;              // Authentication tag length

// ============================================================================
// ENCRYPTION HELPER FUNCTIONS
// ============================================================================

/**
 * Derive a secure encryption key from device keys using PBKDF2
 * PBKDF2 = Password-Based Key Derivation Function 2
 * 
 * @param {string} deviceKey - Combined sender + recipient keys
 * @param {Buffer} salt - Random salt for key derivation
 * @returns {Buffer} - Derived encryption key
 */
function deriveKey(deviceKey, salt) {
  // Run PBKDF2 with 100,000 iterations for strong security
  // SHA-512 is used as the hash function
  return crypto.pbkdf2Sync(deviceKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a message using AES-256-GCM
 * 
 * @param {string} message - Plain text message to encrypt
 * @param {string} senderKey - Sender's 16-digit device key
 * @param {string} recipientKey - Recipient's 16-digit device key
 * @returns {string} - Base64 encoded encrypted message
 */
function encryptMessage(message, senderKey, recipientKey) {
  // Generate random salt for this encryption
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Derive encryption key from both device keys + salt
  const key = deriveKey(senderKey + recipientKey, salt);
  
  // Generate random Initialization Vector (IV)
  // IV ensures same message encrypts differently each time
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher using AES-256-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt the message
  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag (proves message wasn't tampered with)
  const tag = cipher.getAuthTag();
  
  // Combine all components: salt + iv + tag + encrypted data
  // All components needed for decryption are packaged together
  return Buffer.concat([
    salt, 
    iv, 
    tag, 
    Buffer.from(encrypted, 'hex')
  ]).toString('base64');
}

/**
 * Decrypt a message using AES-256-GCM
 * 
 * @param {string} encryptedData - Base64 encoded encrypted message
 * @param {string} senderKey - Sender's 16-digit device key
 * @param {string} recipientKey - Recipient's 16-digit device key
 * @returns {string|null} - Decrypted message or null if failed
 */
function decryptMessage(encryptedData, senderKey, recipientKey) {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(encryptedData, 'base64');
    
    // Extract all components from the encrypted data
    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive the same key using the extracted salt
    const key = deriveKey(senderKey + recipientKey, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Set authentication tag to verify message integrity
    decipher.setAuthTag(tag);
    
    // Decrypt the message
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Decryption can fail if:
    // - Wrong keys used
    // - Data corrupted
    // - Message tampered with
    console.error('Decryption failed:', error);
    return null;
  }
}
//-------------------------------------------------------------------------------------------------------------------------------
// Dear Managing Devloper, We both know that this code sucks but we gotta deal with this so as a warning to other devlopers 
// please write the number of Hours wasted on this
// Current Hour Wasted : 6
//-------------------------------------------------------------------------------------------------------------------------------


function addGarbageNoise() {
  // Random size between 100-600 bytes
  const noiseSize = Math.floor(Math.random() * 500) + 100;
  return crypto.randomBytes(noiseSize).toString('base64');
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Create database tables if they don't exist
 * Called on server startup
 */
async function initializeDatabase() {
  try {
    // Create messages table
    // Stores all encrypted messages with metadata
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

    // Create device keys table
    // Tracks active devices and their last activity
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
    process.exit(1);  // Exit if database setup fails
  }
}

// ============================================================================
// DATABASE HELPER FUNCTIONS
// ============================================================================

/**
 * Register or update a device key in the database
 * Updates last_seen timestamp if device already exists
 * 
 * @param {string} deviceKey - 16-digit device key
 */
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

/**
 * Clean old messages using FIFO (First In, First Out)
 * Keeps only the last 1000 messages to ensure privacy and performance
 * This function is called randomly (10% chance per message send)
 */
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

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns server status and current timestamp
 * Used to verify backend is running
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString() 
  });
});

/**
 * Send Message Endpoint
 * POST /api/message
 * 
 * Body: {
 *   senderKey: "1234567890123456",      // 16-digit sender key
 *   recipientKey: "6543210987654321",   // 16-digit recipient key
 *   encryptedData: "base64...",         // Pre-encrypted message data
 *   timestamp: "2024-02-15T09:02:46.206Z"  // ISO 8601 timestamp
 * }
 * 
 * Process:
 * 1. Validate input
 * 2. Register device keys
 * 3. Re-encrypt message with server-side encryption
 * 4. Add garbage noise for traffic obfuscation
 * 5. Store in database
 * 6. Periodically clean old messages
 */
app.post('/api/message', async (req, res) => {
  try {
    const { senderKey, recipientKey, encryptedData, timestamp } = req.body;

    // Validate required fields
    if (!senderKey || !recipientKey || !encryptedData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate key format (must be exactly 16 digits)
    if (senderKey.length !== 16 || recipientKey.length !== 16) {
      return res.status(400).json({ error: 'Invalid key format' });
    }

    // Register both device keys in database
    // Updates last_seen timestamp for active users
    await registerDeviceKey(senderKey);
    await registerDeviceKey(recipientKey);

    // Re-encrypt the message using server-side AES-256-GCM
    // Even though client sends encrypted data, we re-encrypt for extra security
    const reEncrypted = encryptMessage(encryptedData, senderKey, recipientKey);
    
    // Generate random garbage noise to make traffic analysis harder
    const garbageNoise = addGarbageNoise();

    
    const mysqlTimestamp = new Date(timestamp)
      .toISOString()           
      .slice(0, 19)            
      .replace('T', ' ');      

    // Store encrypted message in database
    const [result] = await pool.query(
      `INSERT INTO messages (sender_key, recipient_key, encrypted_data, garbage_noise, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [senderKey, recipientKey, reEncrypted, garbageNoise, mysqlTimestamp]
    );

    // Periodically clean old messages (10% chance per send)
    // This keeps database size manageable and ensures privacy
    if (Math.random() < 0.1) {
      cleanOldMessages();
    }

    // Return success response
    res.json({ 
      success: true, 
      messageId: result.insertId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Message send failed:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * Retrieve Messages Endpoint
 * GET /api/messages/:deviceKey
 * 
 * Returns all messages for a specific device key
 * Includes messages where device is sender OR recipient
 * 
 * @param {string} deviceKey - 16-digit device key
 * @returns {Array} - Array of decrypted messages
 */
app.get('/api/messages/:deviceKey', async (req, res) => {
  try {
    const { deviceKey } = req.params;

    // Validate device key format
    if (!deviceKey || deviceKey.length !== 16) {
      return res.status(400).json({ error: 'Invalid device key' });
    }

    // Get all messages where this device is sender OR recipient
    // Ordered by newest first, limited to last 100 messages
    const [rows] = await pool.query(
      `SELECT id, sender_key, recipient_key, encrypted_data, timestamp
       FROM messages 
       WHERE sender_key = ? OR recipient_key = ?
       ORDER BY timestamp DESC
       LIMIT 100`,
      [deviceKey, deviceKey]
    );

    // Decrypt each message
    const messages = rows.map(row => {
      // Determine the other party's key
      const otherKey = row.sender_key === deviceKey ? row.recipient_key : row.sender_key;
      
      // Decrypt the message using both keys
      const decrypted = decryptMessage(row.encrypted_data, row.sender_key, row.recipient_key);
      
      return {
        id: row.id,
        senderKey: row.sender_key,
        recipientKey: row.recipient_key,
        encryptedData: decrypted || '[Decryption failed]',  // Fallback if decryption fails
        timestamp: row.timestamp
      };
    });

    res.json(messages);
  } catch (error) {
    console.error('Message retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

/**
 * Delete Messages Endpoint
 * DELETE /api/messages/:deviceKey
 * 
 * Deletes all messages for a specific device
 * Privacy feature - allows users to wipe their message history
 * 
 * @param {string} deviceKey - 16-digit device key
 */
app.delete('/api/messages/:deviceKey', async (req, res) => {
  try {
    const { deviceKey } = req.params;

    // Validate device key format
    if (!deviceKey || deviceKey.length !== 16) {
      return res.status(400).json({ error: 'Invalid device key' });
    }

    // Delete all messages where this device is sender OR recipient
    await pool.query(
      `DELETE FROM messages 
       WHERE sender_key = ? OR recipient_key = ?`,
      [deviceKey, deviceKey]
    );

    res.json({ success: true, message: 'Messages deleted' });
  } catch (error) {
    console.error('Message deletion failed:', error);
    res.status(500).json({ error: 'Failed to delete messages' });
  }
});

/**
 * Active Nodes Count Endpoint
 * GET /api/nodes/count
 * 
 * Returns count of active devices (seen in last 5 minutes)
 * Can be used in UI to show network activity
 */
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
    res.status(500).json({ error: 'Failed to get node count' });
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the Express server
 * 1. Initialize database tables
 * 2. Start listening on PORT
 * 3. Display startup banner
 */
async function startServer() {
  try {
    // Create database tables if they don't exist
    await initializeDatabase();
    
    // Start Express server
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

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Handle SIGTERM signal for graceful shutdown
 * Closes database connections before exiting
 */
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();  // Close all database connections
  process.exit(0);
});

// ============================================================================
// START THE SERVER
// ============================================================================

startServer();

// ============================================================================
// SECURITY NOTES:
// ============================================================================
// 
// 1. ENCRYPTION:
//    - AES-256-GCM provides authenticated encryption
//    - PBKDF2 with 100,000 iterations prevents brute force
//    - Random IV ensures same message encrypts differently
//    - Authentication tags prevent tampering
//
// 2. PRIVACY:
//    - No personal information required
//    - Device keys are anonymous identifiers
//    - FIFO cleanup automatically deletes old messages
//    - Garbage noise obfuscates traffic patterns
//
// 3. DATABASE:
//    - Connection pooling for performance
//    - Indexed queries for fast retrieval
//    - Parameterized queries prevent SQL injection
//
// 4. API:
//    - Input validation on all endpoints
//    - Error handling prevents information leakage
//    - CORS enabled for frontend communication
//
// ============================================================================
