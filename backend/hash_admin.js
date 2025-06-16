const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('./lab.db');

// The password to hash
const password = 'Sivani123';

// Hash the password and update the database
bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    // Update the user's password with the hash
    const query = `UPDATE users SET password = ? WHERE email = 'sivani.pedaballi@relanto.ai'`;
    db.run(query, [hash], function(err) {
        if (err) {
            console.error('Error updating password:', err);
        } else {
            console.log('Password updated successfully with hash!');
            console.log('You can now login with:');
            console.log('Email: sivani.pedaballi@relanto.ai');
            console.log('Password: Sivani123');
        }
        // Close the database connection
        db.close();
    });
}); 