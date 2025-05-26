const express = require('express');
const router = express.Router();
const samplesController = require('../controllers/samples.controller');
const utilityController = require('../controllers/utility.controller');

// Public routes
router.route('/categories').get(samplesController.getSamples)
router.route('/buyers').get(samplesController.getBuyers)

router.route("/categories/:id").delete(utilityController.deleteCategory);

module.exports = router;
