#Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias
RUN npm ci

# Copiar todo el código
COPY . .

# Construir la aplicación Angular
RUN npm run build

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Exponer puerto
EXPOSE 3000

# Ejecutar servidor Express
CMD ["node", "server.js"]