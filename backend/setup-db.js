require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🔧 Setting up Visrodeck Relay Database...\n');
  
  // Use password from environment variable or prompt
  const PASSWORD = process.env.DB_PASSWORD || '';
  
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'subhadeep',
      multipleStatements: true
    });

    console.log('✓ Connected to MySQL');

    await connection.query('CREATE DATABASE IF NOT EXISTS visrodeck_relay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ Created database: visrodeck_relay');

    await connection.query('USE visrodeck_relay');

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await connection.query(schema);
    console.log('✓ Imported schema successfully');

    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n✅ Database setup complete!');
    console.log('Tables:', tables.map(t => Object.values(t)[0]).join(', '));

    await connection.end();
    console.log('\n🚀 Ready to start the server!');
    console.log('Run: npm start');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️  Check your MySQL password on line 9 of this file!');
    }
    process.exit(1);
  }
}

setupDatabase();
