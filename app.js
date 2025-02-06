import express from 'express';
import cors from 'cors';
import formRoutes from './routes/formRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://www.merkahorro.com/'],  // Permitir solicitudes desde tu frontend en desarrollo y producción
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Métodos permitidos
  credentials: true  // Permitir el envío de cookies o cabeceras de autenticación si es necesario
}));

app.use(express.json());
app.use('/api', formRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
