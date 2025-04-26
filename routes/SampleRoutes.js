// backend/routes/sampleRoutes.js
const express = require('express');
const db = require('../db');
const samplesController = require('../controllers/samples.controller');

const router = express.Router();

router.route("/")
// Route to get all samples
.get(samplesController.getSamples)
.post(samplesController.postSample);


// Route to update an existing sample
router.put('/:id', samplesController.updateSample);

// Route to delete a sample
router.delete('/:id', samplesController.deleteSample);

module.exports = router;
