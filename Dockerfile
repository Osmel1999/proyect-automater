FROM node:20-alpine

# Install bash (required by some scripts)
RUN apk add --no-cache bash

# Set working directory
WORKDIR /app

# Copy package files (ensure package-lock.json is included)
COPY package.json package-lock.json ./

# Verify package-lock.json exists and install dependencies
RUN ls -la && \
    if [ ! -f package-lock.json ]; then echo "ERROR: package-lock.json not found!" && exit 1; fi && \
    npm ci --only=production && \
    npm cache clean --force

# Copy all application files
COPY . .

# Remove frontend files (served by Firebase Hosting at kdsapp.site)
# Railway only serves backend API at api.kdsapp.site
RUN rm -f *.html 2>/dev/null || true && \
    rm -rf assets/ 2>/dev/null || true && \
    rm -rf archive_*/ 2>/dev/null || true && \
    rm -rf backup_*/ 2>/dev/null || true && \
    echo "✅ Frontend files removed - backend only"

# Create sessions directory if needed
RUN mkdir -p sessions

# Expose port
EXPOSE 3000

# Start application (no health check to avoid Railway timeout)
CMD ["node", "server/index.js"]
