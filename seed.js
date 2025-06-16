const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'lab.db'), (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to lab.db');
});

// Function to insert a user
async function insertUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO users 
       (email, password, name, role, status, skills, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.email,
        hashedPassword,
        user.name,
        user.role || 'user',
        user.status || 'pending',
        user.skills || '',
        new Date().toISOString()
      ],
      function(err) {
        if (err) {
          console.error('Error inserting user:', err.message);
          reject(err);
        } else {
          console.log(`User ${user.email} inserted successfully`);
          resolve(this.lastID);
        }
      }
    );
  });
}

// Insert sample users
async function seedUsers() {
  try {
    // Insert admin user
    await insertUser({
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
      status: 'approved',
      skills: 'Management,Leadership'
    });

    // Insert regular user
    await insertUser({
      email: 'user@example.com',
      password: 'user123',
      name: 'Regular User',
      role: 'user',
      status: 'approved',
      skills: 'React,Node.js'
    });

    console.log('Users seeded successfully');
    db.close();
  } catch (error) {
    console.error('Error seeding users:', error);
    db.close();
  }
}

// Run the seeding
seedUsers(); 