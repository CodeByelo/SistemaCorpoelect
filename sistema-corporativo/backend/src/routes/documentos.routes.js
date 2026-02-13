const express = require('express');
const router = express.Router();
const documentosController = require('../controllers/documentos.controller');
const auth = require('../middleware/auth.middleware');

router.post('/', auth, documentosController.create);
router.get('/', auth, documentosController.getAll);
router.get('/:id/trace', auth, documentosController.getTraceability);

module.exports = router;
