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

async function updatePassword() {
  try {
    const password = 'Sivani123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      `UPDATE users SET password = ? WHERE email = ?`,
      [hashedPassword, 'sivani.pedaballi@relanto.ai'],
      function(err) {
        if (err) {
          console.error('Error updating password:', err.message);
        } else {
          console.log('Password updated successfully');
        }
        db.close();
      }
    );
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

updatePassword(); 