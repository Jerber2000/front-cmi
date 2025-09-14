const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();

// ✅ Habilitar compresión
app.use(compression());

// ✅ Headers de seguridad y cache
app.use((req, res, next) => {
  // Cache para archivos estáticos
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000');
  }
  
  // Headers de seguridad
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  
  next();
});

// ✅ Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist/cmi-front'), {
  maxAge: '1y',
  etag: false
}));

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Frontend OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production'
  });
});

// ✅ Manejo de rutas SPA - DEBE IR AL FINAL
app.get('/*', (req, res) => {  
  // Log para debugging
  console.log(`📍 Ruta solicitada: ${req.url}`);
  
  res.sendFile(path.join(__dirname, 'dist/cmi-front/index.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo index.html:', err);
      res.status(500).send('Error interno del servidor');
    }
  });
});

// ✅ Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = process.env.PORT || 4200;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Frontend servidor corriendo en puerto ${port}`);
  console.log(`🌐 Modo: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Sirviendo desde: ${path.join(__dirname, 'dist/cmi-front')}`);
});

// ✅ Manejo graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});