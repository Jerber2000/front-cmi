const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

console.log('🚀 Starting simple server...');
console.log('Port:', port);
console.log('Node version:', process.version);

// Servir archivos estáticos desde dist/cmi-front
app.use(express.static(path.join(__dirname, 'dist/cmi-front')));

// Manejar todas las rutas SPA
app.get('*', (req, res) => {
  console.log('Request for:', req.url);
  res.sendFile(path.join(__dirname, 'dist/cmi-front', 'index.html'));
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📁 Serving from: ${path.join(__dirname, 'dist/cmi-front')}`);
});