const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'lab.db'));

async function fixPassword() {
    const email = 'sivani.pedaballi@relanto.ai';
    const password = 'Sivani123';
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email],
            (err) => {
                if (err) {
                    console.error('Error updating password:', err);
                } else {
                    console.log('Password updated successfully!');
                }
                db.close();
            }
        );
    } catch (error) {
        console.error('Error:', error);
        db.close();
    }
}

fixPassword(); 