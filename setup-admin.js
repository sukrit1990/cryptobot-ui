// Setup script to create default admin user
import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function setupAdmin() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Hash the default password
    const hashedPassword = await bcrypt.hash('password', 12);
    
    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM admins WHERE username = $1', 
      ['cryptobot_admin']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    await pool.query(
      'INSERT INTO admins (username, password, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
      ['cryptobot_admin', hashedPassword]
    );

    console.log('Admin user created successfully!');
    console.log('Username: cryptobot_admin');
    console.log('Password: password');
    console.log('Please change the password after first login');
    
  } catch (error) {
    console.error('Error setting up admin user:', error);
  } finally {
    await pool.end();
  }
}

setupAdmin();