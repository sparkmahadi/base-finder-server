// backend/routes/sampleRoutes.js

const express = require('express');
const router = express.Router();
const samplesController = require('../../controllers/v2/samples.controller');
const { protect } = require('../../middlewares/authMiddlewares'); // Assuming 'protect' is for authentication

// --- Public Routes ---

// 1. **Most Specific, Static Routes First**
// These should always come before any dynamic routes like `/:id`

// Excel operations
router.post('/upload-excel', samplesController.uploadSamplesFromExcel); // Upload samples via Excel
router.patch('/add-unique-ids-to-existing-samples', samplesController.addSampleIdsToExistingDocuments);
router.patch('/reset-and-reassign-unique-ids-to-existing-samples', samplesController.resetAndReassignSampleIds);


// Utility and Query Routes (more specific than /:id)
router.get('/unique', samplesController.getUniqueFieldValues); // Get unique values for specified fields (e.g., categories, buyers)
router.get('/check-position-availability', samplesController.checkPositionAvailability); // Check if a position is available
router.get('/get-by-shelf-and-division', samplesController.getSamplesByShelfAndDivision); // Get samples based on shelf and division
router.get('/taken-samples', samplesController.getTakenSamples); // Get samples currently marked as 'taken'
router.get('/buyers', samplesController.getBuyers); // Get a list of buyers

// Deleted Samples and Restore (Public as per original file, consider if restore should be protected)
router.get('/deleted-samples', samplesController.getDeletedSamples); // View deleted samples (recycle bin)
router.put('/deleted-samples/restore/:id', samplesController.restoreSample); // Restore a deleted sample

// Sample lifecycle management (take, put back)
router.put('/:id/take', protect, samplesController.takeSample); // Mark a sample as 'taken'
router.put('/putback/:id', protect, samplesController.putBackSample); // Mark a sample as 'put back'

// --- Position Management/Normalization Routes ---
router.patch('/increase-positions-by-shelf-division', protect, samplesController.increasePositionsByShelfAndDivision); // Increase positions for samples in a specific shelf/division
router.patch('/increase-positions-by-amount', protect, samplesController.increasePositionsByAmount); // Increase positions by a general amount
router.patch('/decrease-positions-by-shelf-division', protect, samplesController.decreasePositionsByShelfAndDivision); // Decrease positions for samples in a specific shelf/division
router.patch('/normalize-positions-in-division', protect, samplesController.normalizePositions); // Normalize positions within a division

// 2. **Base Sample Routes (General)**
router.route('/')
  .get(protect, samplesController.getAllSamples) // Get all samples
  .post(protect, samplesController.postSample); // Create a new sample

// 3. **Dynamic Routes (Least Specific)**
router.route('/:id')
  .get(samplesController.getSampleDetails) // Get details for a specific sample
  .put(samplesController.updateSampleById); // Update a specific sample by ID

// --- Protected Routes (Require Authentication) ---
router.delete('/permanent-delete/:id', protect, samplesController.deleteSamplePermanently); // Permanently delete a sample
// DELETE all permanently deleted samples
router.delete(
  '/permanent-delete-all', protect, samplesController.deleteAllSamplePermanently
);
router.delete('/:id', protect, samplesController.deleteSample); // Soft delete a sample (move to recycle bin)

module.exports = router;