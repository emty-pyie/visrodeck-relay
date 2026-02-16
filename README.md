🔐 Visrodeck Relay

End-to-End Encrypted Anonymous Messaging System

Visrodeck Relay is a privacy-focused encrypted messaging platform built with React, Express, and mySQL.
It enables secure, anonymous communication without user accounts or personal data storage.



🏗 Architecture
┌─────────────────┐         ┌──────────────────┐         ┌────────────────────┐
│   React App     │ ◄─────► │  Express Server  │ ◄─────► │  mySQL DB     │
│  (Frontend)     │   API   │   (Node.js)      │         │  (Encrypted Data)  │
└─────────────────┘         └──────────────────┘         └────────────────────┘
        │                            │
        │                            │
  Key Generation              Stores Encrypted
  Encryption                  Ciphertext Only
  Decryption





  🔐 Security Model
Encryption

Algorithm: AES-256-GCM

Key Exchange: ECDH (Web Crypto API)

Encryption occurs client-side

Server stores only encrypted ciphertext

Server never sees plaintext messages

Privacy

No email

No password

No user accounts

No personal metadata

Messages auto-expire

FIFO cleanup mechanism

All Rights Reserved

© 2026 Visrodeck Technology

This software and its source code are proprietary.
No part of this project may be copied, modified,
distributed, sublicensed, or used in any form
without explicit written permission from
Visrodeck Technology.


