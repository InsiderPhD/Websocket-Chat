# WebSocket Chat Application

A simple real-time chat application using WebSocket technology.

## Features

- Real-time messaging
- User join/leave notifications
- Auto-disconnect after 5 minutes of inactivity
- Clean and modern UI
- Username-based identification

## Setup

### Option 1: Local Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open `index.html` in your web browser (you can use any static file server or simply double-click the file)

### Option 2: Docker Setup

1. Make sure you have Docker installed on your system
2. Build the Docker image:
```bash
docker build -t websocket-chat .
```

3. Run the container:
```bash
docker run -p 3000:3000 websocket-chat
```

4. Visit [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter your username and click "Join Chat"
2. Start sending messages!
3. The connection will automatically close after 5 minutes of inactivity
4. System messages will notify you when users join or leave the chat

## Available Users

The following users are pre-configured in the system:

| Username | Password | Role |
|----------|----------|------|
| admin    | admin123 | Admin |
| alice    | password123 | User |
| bob      | password123 | User |

## Chat Commands

The following commands are available in the chat:

| Command | Description | Example |
|---------|-------------|---------|
| `/wave` | Sends a random waving ASCII art | `/wave` |
| `/nick` | Changes your display name | `/nick newname` |
| `/away` | Toggles your away status | `/away` |
| `/kick` | Kicks a user (admin only) | `/kick username` |

## Technical Details

- Server runs on port 3000
- Uses the `ws` package for WebSocket functionality
- Implements ping/pong for connection health checks
- Messages are broadcast to all connected clients