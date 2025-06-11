cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create .next directory and set permissions
RUN mkdir -p .next && chown -R node:node /app

# Switch to node user
USER node

EXPOSE 3000

CMD ["npm", "run", "dev"]
EOF