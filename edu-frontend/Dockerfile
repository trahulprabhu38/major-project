FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# ✅ Ignore peer dependency errors
RUN npm install --legacy-peer-deps

# Copy rest of your source code
COPY . .

# Run dev mode for frontend
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
