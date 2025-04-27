// backend/routes/sampleRoutes.js

const express = require('express');
const router = express.Router();
const samplesController = require('../controllers/samples.controller');
const { protect } = require('../middlewares/authMiddlewares');

// Public routes
router.route('/')
    .get(samplesController.getSamples)
    .post(samplesController.postSample);

router.post('/upload-excel', samplesController.uploadSamplesFromExcel);

router.put('/:id', samplesController.updateSample);

// Protected routes
router.delete('/:id', protect, samplesController.deleteSample);
router.get('/deleted-samples', protect, samplesController.getDeletedSamples);
router.post('/deleted-samples/restore/:id', protect, samplesController.restoreSample);

module.exports = router;
