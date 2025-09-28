# Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Default command (can be overridden in docker-compose)
CMD ["node", "server.js"]
