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

2. Initialize the database:
```bash
npm run init-db
```

3. Start the server:
```bash
npm start
```


3. Visit [http://localhost:3000](http://localhost:3000)

### Option 2: Docker Setup

1. Make sure you have Docker installed on your system
2. Build the Docker image:
```bash
docker build -t websocket-chat .
```

3. Run the container:
```bash
docker run -p 3000:3000 --name chat-app websocket-chat
```

4. Visit [http://localhost:3000](http://localhost:3000)

To stop the container:
```bash
docker stop chat-app
```

To remove the container:
```bash
docker rm chat-app
```

To view logs:
```bash
docker logs chat-app
```

## Database Setup

The application uses SQLite as its database. The database is automatically initialized with the following default users:

| Username | Password | Role |
|----------|----------|------|
| admin    | admin123 | Admin |
| alice    | password123 | User |
| bob      | password123 | User |

### Database Management

- The database is automatically initialized during Docker container build
- For local development, run `npm run init-db` to initialize the database
- The database file is stored in the `data` directory
- In Docker, the database is persisted in the container's `/app/data` directory

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
- Docker container runs as non-root user for security
- SQLite database is initialized during container build