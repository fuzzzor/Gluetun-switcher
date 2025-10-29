# Use an official Node.js image
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package manifest files
COPY package*.json ./

# Install build tools needed for native dependencies on Alpine
RUN apk add --no-cache g++ make python3 linux-headers

# Install production dependencies
RUN npm install --production

# Copy the default configuration to a separate directory
COPY config/ /app-defaults/

# Copy the rest of the source code
COPY . .

# Fix line endings for Linux compatibility and make the script executable
RUN sed -i 's/\r$//' /usr/src/app/entrypoint.sh && chmod +x /usr/src/app/entrypoint.sh

# Expose the port the server runs on
EXPOSE 3003

# Define the entry script
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]

# Default command to pass to the entrypoint
CMD ["node", "server.js"]