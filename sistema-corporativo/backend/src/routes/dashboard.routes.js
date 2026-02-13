const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth.middleware');

router.get('/stats', auth, dashboardController.getStats);

module.exports = router;
