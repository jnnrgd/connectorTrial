# Use the official Node.js 20 image
FROM node:20

# Create and change to the app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set the default command to run the TypeScript file directly
CMD ["npx", "ts-node", "src/index.ts"]
