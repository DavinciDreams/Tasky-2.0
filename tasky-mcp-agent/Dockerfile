# Use Node.js 18 LTS as base image
FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install system deps for native builds (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

# Install all dependencies (including dev dependencies for build)
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Set environment variables with default paths (DB is the single source of truth)
ENV TASKY_DB_PATH=/app/data/tasky.db
ENV PORT=7842

# Expose the port
EXPOSE 7842

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7842/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Run the application
CMD ["npm", "start"]
