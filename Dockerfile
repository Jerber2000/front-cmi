FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar todo el código
COPY . .

# Usar el script build del package.json (que ya tiene --configuration=production)
RUN npm run build

# Instalar express para el servidor
RUN npm install express

# Exponer puerto
EXPOSE 4200

# Ejecutar servidor Express
CMD ["node", "server.js"]