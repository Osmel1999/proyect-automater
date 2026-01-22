FROM node:20-alpine

# Install bash (required by some scripts)
RUN apk add --no-cache bash

# Set working directory
WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

# Install dependencies (only production)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy only backend files (dockerignore handles exclusions)
# This copies server/, config.js, dual-config.js, and other needed files
COPY server/ ./server/
COPY config.js dual-config.js ./

# Create sessions directory
RUN mkdir -p sessions

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server/index.js"]
