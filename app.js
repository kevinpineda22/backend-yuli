import dotenv from 'dotenv';
import express from 'express';
import supabase from './supabaseCliente.js';  // Agrega la extensión .js
import formRoutes from './routes/formRoutes.js';


dotenv.config();

  const app = express();

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

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.status(200).json({ message: 'el ternero se crió correctamente' });
});