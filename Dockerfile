FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create data directory for SQLite database
RUN mkdir -p data && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Initialize the database
RUN node init-db.js

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "server.js"] 