import express from 'express';
import {
  crearFormulario,
  reenviarFormulario,
  upload
} from '../controllers/formCreationController.js';
import {
  respuestaArea,
  respuestaDirector,
  respuestaGerencia,
  respuestaCalidad, // Agregar importación de respuestaCalidad
  respuestaSeguridad
} from '../controllers/formResponseController.js';
import {
  obtenerHistorial,
  obtenerTodasLasSolicitudes
} from '../controllers/formQueryController.js';
import {
    getAprobadores,
    createAprobador,
    updateAprobador,
    deleteAprobador
} from '../controllers/aprobadoresController.js'; // NUEVO: Importa el controlador


const router = express.Router();

// Rutas para creación y actualización de formularios
router.post('/yuli', upload.fields([
  { name: 'documento', maxCount: 1 },
  { name: 'estructuraOrganizacional', maxCount: 1 }
]), crearFormulario);

// Para el reenvío permitimos cualquier campo de archivo (evita errores de campo inesperado al cambiar la estructura organizacional).
router.post('/yuli/resend/:id', upload.any(), reenviarFormulario);



// Rutas para respuestas
router.post('/dgdecision/:workflow_id/area', respuestaArea);
router.post('/dgdecision/:workflow_id/director', respuestaDirector);
router.post('/dgdecision/:workflow_id/gerencia', respuestaGerencia);
router.post('/dgdecision/:workflow_id/calidad', upload.none(), respuestaCalidad); // Nueva ruta para calidad
router.post('/dgdecision/:workflow_id/seguridad', upload.none(), respuestaSeguridad);

// Rutas para consultas
router.get('/yuli/:workflow_id', obtenerHistorial);
router.get('/yuli', obtenerTodasLasSolicitudes);

// Rutas para la gestión de aprobadores (NUEVAS)
router.get('/aprobadores', getAprobadores);
router.post('/aprobadores', createAprobador);
router.put('/aprobadores/:id', updateAprobador);
router.delete('/aprobadores/:id', deleteAprobador);

export default router;