const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const auth = require('../middleware/auth.middleware');

router.get('/', auth, configController.getConfig);
router.put('/', auth, configController.updateConfig);

module.exports = router;
