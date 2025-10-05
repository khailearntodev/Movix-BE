FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Chạy TypeScript bằng ts-node
CMD ["npx", "ts-node", "src/index.ts"]
