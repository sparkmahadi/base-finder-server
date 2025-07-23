// backend/routes/sampleRoutes.js

const express = require('express');
const router = express.Router();
const samplesController = require('../../controllers/v1/samples.controller');
const { protect } = require('../../middlewares/authMiddlewares');

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

router.route('/check-position-availability')
    .get(samplesController.checkPositionAvailability)

router.route('/get-by-shelf-and-division')
    .get(samplesController.getSamplesByShelfAndDivision)

router.post('/upload-excel', samplesController.uploadSamplesFromExcel);
router.get('/deleted-samples', samplesController.getDeletedSamples);
router.put('/deleted-samples/restore/:id', samplesController.restoreSample);

router.get('/:id', samplesController.getSampleDetails);
router.put('/:id', samplesController.updateSampleById);

// Protected routes
router.delete('/permanent-delete/:id', protect, samplesController.deleteSamplePermanently);
router.delete('/:id', protect, samplesController.deleteSample);

// PUT /api/samples/:id/take
router.put("/:id/take", samplesController.takeSample);
router.put("/putback/:id", samplesController.putBackSample);

router.patch("/increase-positions-by-shelf-division", samplesController.increasePositionsByShelfAndDivision)
router.patch("/increase-positions-by-amount", samplesController.increasePositionsByAmount)
router.patch("/decrease-positions-by-shelf-division", samplesController.decreasePositionsByShelfAndDivision)
router.patch("/normalize-positions-in-division", samplesController.normalizePositions)

module.exports = router;
