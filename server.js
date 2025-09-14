//server.js
const express = require('express');
const path = require('path');
const app = express();

// Configuración básica
app.use(express.static(path.join(__dirname, 'dist/cmi-front')));

// Health check específico
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Frontend OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production'
  });
});

// Middleware para SPA - sin usar patrones problemáticos
app.use((req, res, next) => {
  // Solo para requests GET que no sean archivos estáticos ni API
  if (req.method === 'GET' && 
      !req.url.includes('.') && 
      !req.url.startsWith('/api') && 
      req.url !== '/health') {
    
    console.log(`SPA Route: ${req.url}`);
    return res.sendFile(path.join(__dirname, 'dist/cmi-front/index.html'));
  }
  next();
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = process.env.PORT || 4200;
app.listen(port, '0.0.0.0', () => {
  console.log(`Frontend running on port ${port}`);
});