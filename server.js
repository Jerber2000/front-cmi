const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
// CAMBIO: Usar puerto 8080 como en Railway o el puerto del entorno
const port = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist/cmi-front');
const indexPath = path.join(distPath, 'index.html');

// Logging para debugging
console.log('Starting server...');
console.log('Port:', port);
console.log('Dist path:', distPath);
console.log('Index path:', indexPath);

// Verificar que los archivos existen
if (!fs.existsSync(distPath)) {
  console.error('❌ ERROR: dist/cmi-front folder does not exist!');
  console.log('Available folders in dist:', fs.existsSync(path.join(__dirname, 'dist')) ? fs.readdirSync(path.join(__dirname, 'dist')) : 'dist folder not found');
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error('❌ ERROR: index.html not found at:', indexPath);
  process.exit(1);
}

console.log('✅ Files verified successfully');

// Middleware para headers de seguridad y CORS
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware para servir archivos estáticos
app.use(express.static(distPath, { 
  index: false,
  fallthrough: true,
  maxAge: '1y', // Cache para archivos estáticos
  etag: false
}));

// Middleware personalizado para SPA routing
app.use((req, res, next) => {
  // Log de todas las requests para debugging
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  
  // Si es un archivo estático que existe, déjalo pasar
  const filePath = path.join(distPath, req.path);
  
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      console.log('✅ Serving static file:', req.path);
      return next();
    }
  } catch (error) {
    console.error('Error checking file:', error.message);
  }
  
  // Para cualquier otra ruta, devolver index.html (SPA routing)
  console.log('📄 Serving index.html for route:', req.path);
  
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('❌ Error reading index.html:', err);
      res.status(500).send('Error loading application');
      return;
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(data);
  });
});

// Error handler global
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).send('Internal server error');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: port 
  });
});

// Iniciar servidor
const server = app.listen(port, '0.0.0.0', () => {
  console.log('🚀 Server successfully started!');
  console.log(`📡 Listening on port ${port}`);
  console.log(`🌐 Server URL: http://0.0.0.0:${port}`);
  console.log(`📁 Serving files from: ${distPath}`);
  console.log('✅ Server ready to accept connections');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📤 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📤 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Error handling para el servidor
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});