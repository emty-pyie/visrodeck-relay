-- Visrodeck Relay Database Schema
-- End-to-End Encrypted Messaging System

-- Create database (semicolon added for proper parsing)
CREATE DATABASE IF NOT EXISTS visrodeck_relay
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE visrodeck_relay;

-- Messages table with FIFO structure
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_key VARCHAR(16) NOT NULL COMMENT '16-digit sender device key',
    recipient_key VARCHAR(16) NOT NULL COMMENT '16-digit recipient device key',
    encrypted_data TEXT NOT NULL COMMENT 'AES-256-GCM encrypted message',
    garbage_noise TEXT COMMENT 'Random noise data to obfuscate traffic patterns',
    timestamp DATETIME NOT NULL COMMENT 'Original message timestamp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Server receipt time',
    
    INDEX idx_recipient (recipient_key),
    INDEX idx_sender (sender_key),
    INDEX idx_timestamp (timestamp),
    INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='Encrypted messages with FIFO cleanup';

-- Device keys registry
CREATE TABLE IF NOT EXISTS device_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_key VARCHAR(16) UNIQUE NOT NULL COMMENT 'Unique 16-digit device identifier',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_device_key (device_key),
    INDEX idx_last_seen (last_seen)
) ENGINE=InnoDB COMMENT='Active device key registry';

-- Session tracking (optional - for node connection management)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_key VARCHAR(16) NOT NULL,
    session_token VARCHAR(64) NOT NULL,
    connected_peer VARCHAR(16) COMMENT 'Currently connected peer device key',
    ip_address VARCHAR(45) COMMENT 'IP address (optional, can be null for anonymity)',
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_device_key (device_key),
    INDEX idx_session_token (session_token),
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB COMMENT='Active session management';

-- Message delivery queue (for offline message handling)
CREATE TABLE IF NOT EXISTS message_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    recipient_key VARCHAR(16) NOT NULL,
    delivered BOOLEAN DEFAULT FALSE,
    delivery_attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    INDEX idx_recipient_delivered (recipient_key, delivered),
    INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='Message delivery queue for offline users';

-- Note: Stored procedures and events are not created here
-- as they require special handling in Node.js.
-- The cleanup is handled by the application code in server.js

-- Sample queries for testing

-- Insert a test message
-- INSERT INTO messages (sender_key, recipient_key, encrypted_data, garbage_noise, timestamp)
-- VALUES ('1234567890123456', '6543210987654321', 'encrypted_test_data', 'random_noise', NOW());

-- Retrieve messages for a device
-- SELECT * FROM messages 
-- WHERE sender_key = '1234567890123456' OR recipient_key = '1234567890123456'
-- ORDER BY timestamp DESC;

-- Get active nodes count
-- SELECT COUNT(DISTINCT device_key) as active_nodes 
-- FROM device_keys 
-- WHERE last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE);

-- Performance indexes summary:
-- - idx_recipient: Fast message retrieval by recipient
-- - idx_sender: Fast message retrieval by sender  
-- - idx_timestamp: Chronological message ordering
-- - idx_device_key: Fast device lookup
-- - idx_last_seen: Active node tracking
-- - idx_session_token: Quick session validation

-- Security notes:
-- 1. All message data is encrypted with AES-256-GCM before storage
-- 2. Device keys are the only identifiers (no personal information)
-- 3. Garbage noise makes traffic analysis harder
-- 4. FIFO cleanup ensures old data is automatically purged
-- 5. IP addresses are optional and can be omitted for full anonymity
-- 6. No user accounts or authentication required
