# ✅ DOCKERFILE MEJORADO PARA FRONTEND
FROM node:18-alpine as builder

# Instalar dependencias del sistema
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --silent

# Copiar código fuente
COPY . .

# Construir la aplicación Angular para producción
RUN npm run build --prod

# ===== STAGE 2: Runtime =====
FROM node:18-alpine

WORKDIR /app

# Instalar solo dependencias necesarias para el servidor
RUN npm init -y && \
    npm install express compression --save

# Copiar archivos construidos desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S angular -u 1001

# Cambiar ownership
RUN chown -R angular:nodejs /app
USER angular

# Exponer puerto
EXPOSE 4200

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:4200/health',(r)=>r.statusCode===200?process.exit(0):process.exit(1))"

# Ejecutar servidor
CMD ["node", "server.js"]