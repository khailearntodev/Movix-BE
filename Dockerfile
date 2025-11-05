FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm ci --include=dev

COPY . .

RUN npm run build

CMD ["npm", "run", "start"]