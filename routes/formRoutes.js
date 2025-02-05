// routes/formRoutes.js
const express = require('express');
const { crearFormulario, respuestaDirector, respuestaGerencia, obtenerHistorial } = require('../controllers/formController');

const router = express.Router();

router.post('/forms', crearFormulario);
router.put('/forms/:workflow_id/director', respuestaDirector);
router.put('/forms/:workflow_id/gerencia', respuestaGerencia);
router.get('/forms/:workflow_id', obtenerHistorial);

module.exports = router;
