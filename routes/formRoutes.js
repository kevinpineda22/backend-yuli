// routes/formRoutes.js
import express from 'express';
import { crearFormulario, respuestaArea, respuestaDirector, respuestaGerencia, respuestaSeguridad, obtenerHistorial, obtenerTodasLasSolicitudes, upload, reenviarFormulario, actualizarFormulario } from '../controllers/formController.js';

const router = express.Router();

// Ruta para crear la solicitud (con carga de archivo)
router.post('/yuli', upload.single('documento'), crearFormulario);

// Rutas para registrar respuestas de cada nivel (usando /dgdecision/ para coincidir con los correos)
router.post('/dgdecision/:workflow_id/area', respuestaArea);
router.post('/dgdecision/:workflow_id/director', respuestaDirector);
router.post('/dgdecision/:workflow_id/gerencia', respuestaGerencia);
router.post("/dgdecision/:workflow_id/seguridad", upload.none(), respuestaSeguridad);

// Rutas para historial y actualización
router.get('/yuli/:workflow_id', obtenerHistorial);              // Historial de un workflow específico
router.get('/yuli', obtenerTodasLasSolicitudes);                 // Todas las solicitudes

router.post('/yuli/resend/:id', upload.single('documento'), reenviarFormulario);
router.put('/yuli/:id', upload.single('documento'), actualizarFormulario);

export default router;