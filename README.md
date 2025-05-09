# WebSocket Chat Application

A real-time chat application with user roles, commands, using WebSockets. This is designed to help security testers experiment with web sockets, and while not that intentionally vulnerable - though there are a few.

## Features

- Real-time messaging with timestamps
- User authentication and role-based access (Admin, User, Guest)
- User status tracking (online/away)
- Command system:
  - `/wave` - Sends random ASCII art waves
  - `/nick <newname>` - Change your display name
  - `/away` - Toggle away status
  - `/kick <username>` - Kick a user (Admin only)
- User list with role badges and status indicators
- Auto-disconnect after 30 seconds of inactivity
- Clean and modern UI with responsive design
- Session persistence across page refreshes
- Secure JWT-based authentication
- SQLite database for user management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Initialize the database:
```bash
node init-db.js
```

3. Start the server:
```bash
npm start
```

4. Open `http://localhost:3000` in your web browser

## Default Users

- Admin: username: `admin`, password: `admin123`
- Regular User: username: `alice`, password: `password123`
- Regular User: username: `bob`, password: `password123`

## Usage

1. Log in with your credentials or join as a guest
2. Use commands in the chat:
   - Type `/wave` to send a wave
   - Type `/nick newname` to change your name
   - Type `/away` to toggle away status
   - Admins can type `/kick username` to remove users
3. The connection will automatically close after 30 seconds of inactivity
4. System messages will notify you when users join, leave, or change status

## Technical Details

- Server runs on port 3000
- Uses Express.js for HTTP server
- Uses the `ws` package for WebSocket functionality
- Implements JWT for secure authentication
- Uses SQLite for user data storage
- Implements ping/pong for connection health checks
- Messages are broadcast to all connected clients
- Supports session persistence using cookies 