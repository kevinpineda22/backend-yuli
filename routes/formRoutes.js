import express from 'express';
import {
  crearFormulario,
  reenviarFormulario,
  actualizarFormulario,
  upload
} from '../controllers/formCreationController.js';
import {
  respuestaArea,
  respuestaDirector,
  respuestaGerencia,
  respuestaSeguridad
} from '../controllers/formResponseController.js';
import {
  obtenerHistorial,
  obtenerTodasLasSolicitudes
} from '../controllers/formQueryController.js';

const router = express.Router();

// Rutas para creación y actualización de formularios
router.post('/yuli', upload.fields([
  { name: 'documento', maxCount: 1 },
  { name: 'estructuraOrganizacional', maxCount: 1 }
]), crearFormulario);

router.post('/yuli/resend/:id', upload.fields([
  { name: 'documento', maxCount: 1 },
  { name: 'estructuraOrganizacional', maxCount: 1 }
]), reenviarFormulario);

router.put('/yuli/:id', upload.fields([
  { name: 'documento', maxCount: 1 },
  { name: 'estructuraOrganizacional', maxCount: 1 }
]), actualizarFormulario);

// Rutas para respuestas
router.post('/dgdecision/:workflow_id/area', respuestaArea);
router.post('/dgdecision/:workflow_id/director', respuestaDirector);
router.post('/dgdecision/:workflow_id/gerencia', respuestaGerencia);
router.post('/dgdecision/:workflow_id/seguridad', upload.none(), respuestaSeguridad);

// Rutas para consultas
router.get('/yuli/:workflow_id', obtenerHistorial);
router.get('/yuli', obtenerTodasLasSolicitudes);

export default router;