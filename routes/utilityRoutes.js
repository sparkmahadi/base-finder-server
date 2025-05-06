const express = require('express');
const router = express.Router();
const samplesController = require('../controllers/samples.controller');
const utilityController = require('../controllers/utility.controller');

// Public routes
router.route('/').get(samplesController.getSamples)

router.route("/:id").delete(utilityController.deleteCategory);

module.exports = router;
