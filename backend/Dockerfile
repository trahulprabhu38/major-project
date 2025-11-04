FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first
COPY package*.json ./

# Install dependencies properly
RUN npm install --legacy-peer-deps

# Copy your backend code
COPY . .

EXPOSE 8080

# Start in dev mode
CMD ["npm", "run", "dev"]
