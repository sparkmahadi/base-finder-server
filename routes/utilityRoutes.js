const express = require('express');
const router = express.Router();
const samplesController = require('../controllers/samples.controller');
const { protect } = require('../middlewares/authMiddlewares');

// Public routes
router.route('/categories').get(samplesController.getSamples);

module.exports = router;
