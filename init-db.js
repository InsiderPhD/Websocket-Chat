const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'chat.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Initialize database
db.serialize(() => {
    // Drop existing users table
    db.run('DROP TABLE IF EXISTS users', (err) => {
        if (err) {
            console.error('Error dropping users table:', err);
        } else {
            console.log('Existing users table dropped');
        }
    });

    // Create users table with role column
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('Users table created successfully');
        }
    });

    // Insert admin user
    db.run(`INSERT INTO users (username, password, role) 
            VALUES (?, ?, ?)`,
        ['admin', 'admin123', 'admin'],
        function(err) {
            if (err) {
                console.error('Error inserting admin user:', err);
            } else {
                console.log('Admin user created');
            }
        }
    );

    // Insert regular users
    const regularUsers = [
        ['alice', 'password123', 'user'],
        ['bob', 'password123', 'user']
    ];

    regularUsers.forEach(([username, password, role]) => {
        db.run(`INSERT INTO users (username, password, role) 
                VALUES (?, ?, ?)`,
            [username, password, role],
            function(err) {
                if (err) {
                    console.error(`Error inserting user ${username}:`, err);
                } else {
                    console.log(`User ${username} created`);
                }
            }
        );
    });

    // Verify users
    db.all('SELECT username, role FROM users', [], (err, rows) => {
        if (err) {
            console.error('Error querying users:', err);
        } else {
            console.log('\nCurrent users in database:');
            rows.forEach(row => {
                console.log(`Username: ${row.username}, Role: ${row.role}`);
            });
        }

        // Close database connection
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('\nDatabase connection closed.');
            }
        });
    });
}); 