// routes/formRoutes.js
import express from 'express';
import { crearFormulario, respuestaArea, respuestaDirector, respuestaGerencia, obtenerHistorial, obtenerTodasLasSolicitudes, actualizarObservacion, upload } from '../controllers/formController.js';

const router = express.Router();

// Ruta para crear la solicitud (con carga de archivo)
router.post('/yuli', upload.single('documento'), crearFormulario);

// Rutas para registrar respuestas de cada nivel (usando /dgdecision/ para coincidir con los correos)
router.post('/dgdecision/:workflow_id/area', respuestaArea);
router.post('/dgdecision/:workflow_id/director', respuestaDirector);
router.post('/dgdecision/:workflow_id/gerencia', respuestaGerencia);

// Rutas para historial y actualización
router.get('/yuli/:workflow_id', obtenerHistorial);              // Historial de un workflow específico
router.get('/yuli', obtenerTodasLasSolicitudes);                 // Todas las solicitudes
router.put('/yuli/:workflow_id', actualizarObservacion);         // Actualizar observación

export default router;