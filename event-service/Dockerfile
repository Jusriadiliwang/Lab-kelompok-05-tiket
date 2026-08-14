FROM node:20-alpine

# Metadata
LABEL maintainer="Kelompok 5 - War Tiket Konser"
LABEL service="event-service"

WORKDIR /app

# Install dependencies dulu (cache layer)
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.js"]
