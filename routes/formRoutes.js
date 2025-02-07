// routes/formRoutes.js
import express from 'express';
import { crearFormulario, respuestaDirector, respuestaGerencia, obtenerTodasLasSolicitudes, actualizarObservacion, upload } from '../controllers/formController.js';

const router = express.Router();

// Ruta para crear la solicitud (con carga de archivo)
router.post('/yuli', upload.single('documento'), crearFormulario);
// Rutas para registrar respuestas del director y de la gerencia
router.post('/yuli/:workflow_id/director', respuestaDirector);
router.post('/yuli/:workflow_id/gerencia', respuestaGerencia);

// Ruta para obtener el historial de un workflow
router.get('/yuli', obtenerTodasLasSolicitudes);

router.put('/yuli/:workflow_id', actualizarObservacion);

export default router;
