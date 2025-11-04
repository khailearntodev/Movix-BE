FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate   # <<< thêm dòng này

RUN npm run build

CMD ["npm", "run", "start"]
