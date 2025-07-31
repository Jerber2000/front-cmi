# Etapa 1: Build de la aplicación
FROM node:18-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Copiar archivos built (tu app se llama cmi-front)
COPY --from=build /app/dist/cmi-front /usr/share/nginx/html/

# Configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Exponer puerto
EXPOSE 80

# Comando para iniciar
CMD ["nginx", "-g", "daemon off;"]