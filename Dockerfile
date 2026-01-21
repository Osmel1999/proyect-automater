FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy all application files
COPY . .

# Create sessions directory if needed
RUN mkdir -p sessions

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server/index.js"]
