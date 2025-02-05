// routes/formRoutes.js
const express = require('express');
const { crearFormulario, respuestaDirector, respuestaGerencia, obtenerHistorial } = require('../controllers/formController');

const router = express.Router();

router.post('/yuli', crearFormulario);
router.put('/yuli/:workflow_id/director', respuestaDirector);
router.put('/yuli/:workflow_id/gerencia', respuestaGerencia);
router.get('/yuli/:workflow_id', obtenerHistorial);

module.exports = router;
