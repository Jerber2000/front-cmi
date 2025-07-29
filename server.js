const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuración básica
app.use(express.static(path.join(__dirname, 'dist/cmi-front')));

// Una sola ruta que maneja TODO
app.get('*', function(req, res) {
  res.sendFile(path.resolve(__dirname, 'dist/cmi-front/index.html'));
});

// Iniciar servidor
app.listen(port, function() {
  console.log('App running on port ' + port);
});