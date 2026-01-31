# Use Node.js LTS
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy ALL source files at once
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]