const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist/cmi-front')));

// Todas las rutas devuelven index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/cmi-front/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});