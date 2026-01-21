FROM node:18-alpine

# Metadata
LABEL maintainer="KDS App"
LABEL description="Kitchen Display System with WhatsApp Integration"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy all source code
# Este COPY asegura que TODOS los archivos actuales se copien
COPY . .

# Verificar que login.html NO existe
RUN if [ -f "login.html" ]; then \
      echo "ERROR: login.html no debería existir"; \
      exit 1; \
    fi

# Verificar que auth.html SÍ existe
RUN if [ ! -f "auth.html" ]; then \
      echo "ERROR: auth.html debería existir"; \
      exit 1; \
    fi

# Create sessions directory
RUN mkdir -p sessions

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server/index.js"]
