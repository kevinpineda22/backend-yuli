// app.js
require('dotenv').config();
const express = require('express');
const app = express();
const supabase = require('./supabaseCliente');
const formRoutes = require('./routes/formRoutes');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para inyectar supabase en req
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// Usamos las rutas bajo el path /api
app.use('/api', formRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
