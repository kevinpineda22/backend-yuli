import express from 'express';
import { crearFormulario, respuestaDirector, respuestaGerencia, obtenerHistorial, upload } from '../controllers/formController.js';

const router = express.Router();

// Ruta para crear el formulario con la subida del archivo
router.post('/yuli', upload.single('documento'), crearFormulario);

router.put('/yuli/:workflow_id/director', respuestaDirector);
router.put('/yuli/:workflow_id/gerencia', respuestaGerencia);
router.get('/yuli/:workflow_id', obtenerHistorial);

export default router;
