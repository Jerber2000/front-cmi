const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist/cmi-front');
const indexPath = path.join(distPath, 'index.html');

// Middleware para servir archivos estáticos sin routing complejo
app.use(express.static(distPath, { 
  index: false,
  fallthrough: true 
}));

// Middleware personalizado que evita usar el router de Express
app.use((req, res, next) => {
  // Si es un archivo estático que existe, déjalo pasar
  const filePath = path.join(distPath, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return next();
  }
  
  // Para cualquier otra ruta, devolver index.html
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading index.html');
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(data);
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log('Server running on port', port);
});