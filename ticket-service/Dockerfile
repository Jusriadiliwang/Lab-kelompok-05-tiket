FROM node:20-alpine

LABEL maintainer="Kelompok 5 - War Tiket Konser"
LABEL service="ticket-service"

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/

EXPOSE 3002

CMD ["node", "src/index.js"]
