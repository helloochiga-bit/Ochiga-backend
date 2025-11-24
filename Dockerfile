# backend/Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the backend code
COPY . .

# Expose port
EXPOSE 5000

# Start backend
CMD ["npm", "run", "start"]
