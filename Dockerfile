# Use Node 20 image
FROM node:20-alpine

# Set workdir
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install deps
RUN npm install

# Copy source code
COPY . .

# Build (if needed)
RUN npm run build

# Expose port
EXPOSE 5000

# Start backend
CMD ["npm", "run", "start"]
