# front-cmi/Dockerfile
# Etapa 1: build de Angular (necesita el toolchain completo)
FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: solo lo necesario para SERVIR el build (más liviana, sin
# Angular CLI / TypeScript en la imagen final)
FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
# "express" ya está en dependencies (package.json) - no se instala aparte
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server.js ./server.js

ENV NODE_ENV=production
ENV PORT=4200
EXPOSE 4200

CMD ["node", "server.js"]
