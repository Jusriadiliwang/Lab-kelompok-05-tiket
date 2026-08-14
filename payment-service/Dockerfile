FROM node:20-alpine

LABEL maintainer="Kelompok 5 - War Tiket Konser"
LABEL service="payment-service"

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/

EXPOSE 3003

CMD ["node", "src/index.js"]
