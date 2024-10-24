# Use Node.js v22 as the base image
FROM node:22-bullseye

# Install bun
RUN curl -fsSL https://bun.sh/install | bash

# Ensure bun is available in the environment
ENV PATH="/root/.bun/bin:$PATH"

# Set the working directory inside the container
WORKDIR /usr/src/app

# # Copy package files first for efficient Docker caching
# COPY patches package.json bun.lockb packages/*/package.json ./

# Copy the rest of your application code
COPY . .

# Install dependencies using bun
RUN bun install --production --frozen-lockfile

# # Expose the application's port
# EXPOSE 3000

# Start the server using bun and tsx
# CMD ["bun", "run", "tsx", "start"]
