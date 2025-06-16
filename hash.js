const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'lab.db'), (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to lab.db');
});

bcrypt.hash('Sivani123', 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('Generated hash:', hash);
  
  // Update the password in the database
  db.run(
    `UPDATE users SET password = ? WHERE email = ?`,
    [hash, 'sivani.pedaballi@relanto.ai'],
    function(err) {
      if (err) {
        console.error('Error updating password in database:', err);
      } else {
        console.log('Password updated successfully in database');
      }
      db.close();
    }
  );
});