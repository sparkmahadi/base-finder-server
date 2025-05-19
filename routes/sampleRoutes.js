// backend/routes/sampleRoutes.js

const express = require('express');
const router = express.Router();
const samplesController = require('../controllers/samples.controller');
const { protect } = require('../middlewares/authMiddlewares');

// Public routes
router.route('/')
    // .get(samplesController.getSamples) deprecated by mahadi
    .get(samplesController.getAllSamples)
    .post(samplesController.postSample);

router.route('/paginated')
    // .get(samplesController.getSamples) deprecated by mahadi
    .get(samplesController.getPaginatedSamples)

router.route('/taken-samples')
    .get(samplesController.getTakenSamples)

router.route('/buyers')
    .get(samplesController.getBuyers)

//     GET /api/samples/unique?fields=category
// GET /api/samples/unique?fields=category,buyer
router.route('/unique')
    .get(samplesController.getUniqueFieldValues)

router.post('/upload-excel', samplesController.uploadSamplesFromExcel);

router.get('/:id', samplesController.getSampleDetails);
router.put('/:id', samplesController.updateSampleById);

// Protected routes
router.delete('/:id', protect, samplesController.deleteSample);
router.get('/deleted-samples', protect, samplesController.getDeletedSamples);
router.post('/deleted-samples/restore/:id', protect, samplesController.restoreSample);

// PUT /api/samples/:id/take
router.put("/:id/take", samplesController.takeSample);
router.put("/putback/:id", samplesController.putBackSample);

module.exports = router;
