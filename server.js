const WebSocket = require('ws');
const express = require('express');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// JWT Configuration
const JWT_SECRET = 'your-secret-key';
const TOKEN_EXPIRY = '24h';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

// User roles
const ROLES = {
    GUEST: 'guest',
    USER: 'user',
    ADMIN: 'admin'
};

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'chat.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Initialize database with roles
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
    )`);

    // Add admin user if not exists
    db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
        if (!row) {
            db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                ['admin', 'admin123', ROLES.ADMIN]);
        }
    });
});

// Token validation middleware
const validateToken = (req, res, next) => {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else {
        // Check cookies
        token = req.cookies.chatToken;
    }

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        // Set the token in a cookie
        res.cookie('chatToken', token, COOKIE_OPTIONS);
        res.json({ role: user.role });
    });
});

// Registration endpoint
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Validate username and password
    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if username already exists
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, existingUser) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Create new user
        db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, password, ROLES.USER],
            function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                res.status(201).json({ message: 'Registration successful' });
            }
        );
    });
});

// Guest login endpoint
app.post('/guest-login', (req, res) => {
    const guestId = `guest-${Math.floor(Math.random() * 10000)}`;
    const token = jwt.sign(
        { id: guestId, username: guestId, role: ROLES.GUEST },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
    
    // Set the token in a cookie
    res.cookie('chatToken', token, COOKIE_OPTIONS);
    res.json({ role: ROLES.GUEST, username: guestId });
});

// Logout endpoint
app.post('/logout', (req, res) => {
    res.clearCookie('chatToken');
    res.json({ message: 'Logged out successfully' });
});

// Protected route example
app.get('/api/user', validateToken, (req, res) => {
    res.json({ user: req.user });
});

// Serve static files
app.use(express.static(__dirname));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({ 
    server,
    // Add debug logging for WebSocket handshake
    verifyClient: (info, callback) => {
        console.log('\n=== New WebSocket Connection ===');
        console.log('Client IP:', info.req.socket.remoteAddress);
        console.log('Headers:', info.req.headers);
        console.log('Sec-WebSocket-Key:', info.req.headers['sec-websocket-key']);
        callback(true);
    }
});

// Store connected clients
const clients = new Map();
const clientKeys = new Map(); // Store WebSocket keys for users
const userRoles = new Map();
const userStatus = new Map(); // Track user status (online/away)

// Add wave ASCII art options
const waveAscii = [
    '(^_^)',
    '(｡◕‿◕｡)',
    '(ﾉ◕ヮ◕)ﾉ',
    '(◕‿◕)',
    '(✿◠‿◠)',
    '(ﾉ´ヮ`)ﾉ',
    '(｡♥‿♥｡)',
    '(◕ᴗ◕✿)'
];

// Function to get current user list
function getUserList() {
    return Array.from(clients.entries()).map(([username, _]) => ({
        username,
        role: userRoles.get(username) || 'user',
        status: userStatus.get(username) || 'online'
    }));
}

// Function to broadcast user list updates
function broadcastUserList() {
    const userList = getUserList();
    const message = JSON.stringify({
        type: 'userList',
        users: userList
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Broadcast message to all connected clients
function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

wss.on('connection', (ws, req) => {
    const wsKey = req.headers['sec-websocket-key'];
    console.log(`\n=== New WebSocket Connection ===`);
    console.log(`Client IP: ${req.socket.remoteAddress}`);
    console.log(`WebSocket Key: ${wsKey}`);

    // Get token from cookie
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
    }, {}) || {};

    const token = cookies.chatToken;

    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`\n=== Message Received ===`);
            console.log(`From: ${wsKey}`);
            console.log(`Data:`, data);

            if (data.type === 'join') {
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    const username = decoded.username;
                    const role = decoded.role;
                    
                    console.log(`\n=== User Joined ===`);
                    console.log(`Username: ${username}`);
                    console.log(`Role: ${role}`);
                    console.log(`WebSocket Key: ${wsKey}`);

                    // Store user information
                    clients.set(username, ws);
                    clientKeys.set(ws, wsKey);
                    userRoles.set(username, role);
                    userStatus.set(username, 'online');

                    // Broadcast user joined message
                    broadcast({
                        type: 'system',
                        message: `${username} has joined the chat`,
                        timestamp: new Date().toISOString()
                    });

                    // Send welcome message with role
                    ws.send(JSON.stringify({
                        type: 'system',
                        message: `Welcome to the chat, ${username}!`,
                        role: role,
                        timestamp: new Date().toISOString()
                    }));

                    // Broadcast updated user list
                    broadcastUserList();
                } catch (error) {
                    console.error('Token verification failed:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid token'
                    }));
                    ws.close();
                }
            } else if (data.type === 'message') {
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    const username = decoded.username;
                    const role = userRoles.get(username);
                    const wsKey = clientKeys.get(ws);
                    
                    // Handle commands
                    if (data.message.startsWith('/')) {
                        const [command, ...args] = data.message.slice(1).split(' ');
                        
                        switch (command.toLowerCase()) {
                            case 'kick':
                                if (role === 'admin') {
                                    const targetUser = args[0];
                                    kickUser(targetUser);
                                }
                                break;
                            case 'wave':
                                // Send random wave ASCII art
                                const randomWave = waveAscii[Math.floor(Math.random() * waveAscii.length)];
                                broadcast({
                                    type: 'message',
                                    username: username,
                                    message: randomWave,
                                    role: role,
                                    timestamp: new Date().toISOString()
                                });
                                break;
                            case 'nick':
                                if (args[0]) {
                                    const newUsername = args[0];
                                    // Check if username is already taken
                                    if (Array.from(clients.keys()).includes(newUsername)) {
                                        ws.send(JSON.stringify({
                                            type: 'system',
                                            message: 'Username is already taken',
                                            timestamp: new Date().toISOString()
                                        }));
                                        return;
                                    }
                                    // Update username
                                    const oldUsername = username;
                                    clients.set(newUsername, ws);
                                    clients.delete(oldUsername);
                                    userRoles.set(newUsername, role);
                                    userRoles.delete(oldUsername);
                                    userStatus.set(newUsername, userStatus.get(oldUsername));
                                    userStatus.delete(oldUsername);
                                    
                                    // Notify everyone of the name change
                                    broadcast({
                                        type: 'system',
                                        message: `${oldUsername} is now known as ${newUsername}`,
                                        timestamp: new Date().toISOString()
                                    });
                                    
                                    // Update the client's token
                                    const newToken = jwt.sign({ username: newUsername }, JWT_SECRET, { expiresIn: '24h' });
                                    ws.send(JSON.stringify({
                                        type: 'token',
                                        token: newToken,
                                        timestamp: new Date().toISOString()
                                    }));
                                    
                                    broadcastUserList();
                                }
                                break;
                            case 'away':
                                // Toggle away status
                                const newStatus = userStatus.get(username) === 'away' ? 'online' : 'away';
                                
                                // Update status
                                userStatus.set(username, newStatus);
                                
                                // Notify everyone of status change
                                broadcast({
                                    type: 'system',
                                    message: `${username} is now ${newStatus}`,
                                    timestamp: new Date().toISOString()
                                });
                                
                                // Force immediate user list update
                                setTimeout(() => {
                                    broadcastUserList();
                                }, 0);
                                break;
                        }   
                    } else {
                        // Regular message
                        broadcast({
                            type: 'message',
                            username: username,
                            message: data.message,
                            role: role,
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error('Token verification failed:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid token'
                    }));
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        const username = Array.from(clients.entries()).find(([_, client]) => client === ws)?.[0];
        if (username) {
            console.log(`\n=== User Disconnected ===`);
            console.log(`Username: ${username}`);
            console.log(`WebSocket Key: ${wsKey}`);
            
            clients.delete(username);
            clientKeys.delete(ws);
            userRoles.delete(username);
            userStatus.delete(username);
            
            broadcast({
                type: 'system',
                message: `${username} has left the chat`,
                wasKicked: false,
                timestamp: new Date().toISOString()
            });
            
            // Broadcast updated user list
            broadcastUserList();
        }
    });
});

function kickUser(targetUsername) {
    console.log(`\n=== Kicking User ===`);
    console.log(`Target username: ${targetUsername}`);
    
    // Find the client to kick
    const targetClient = Array.from(clients.entries())
        .find(([username, _]) => username === targetUsername)?.[1];
    
    if (targetClient) {
        console.log('Found target client, sending kick message');
        
        // Send kick message to the kicked user
        targetClient.send(JSON.stringify({
            type: 'system',
            message: 'You have been kicked!',
            isKicked: true,
            timestamp: new Date().toISOString()
        }));

        // Send kick notification to all other users
        const kickMessage = {
            type: 'system',
            message: `${targetUsername} was kicked from the chat`,
            wasKicked: true,
            timestamp: new Date().toISOString()
        };
        broadcast(kickMessage);

        // Remove user from all maps
        clients.delete(targetUsername);
        clientKeys.delete(targetClient);
        userRoles.delete(targetUsername);
        userStatus.delete(targetUsername);

        // Give a small delay to ensure the message is sent before closing
        setTimeout(() => {
            console.log('Closing kicked user connection');
            targetClient.close();
            // Broadcast updated user list after closing
            broadcastUserList();
        }, 100);
    } else {
        console.log('Target client not found');
    }
}

// Keep-alive mechanism
const interval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
            const username = clients.get(ws);
            const wsKey = clientKeys.get(ws);
            console.log(`\n=== Connection Timeout ===`);
            console.log(`Username: ${username}`);
            console.log(`WebSocket Key: ${wsKey}`);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

// Start the server
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Closing database connection...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
}); 