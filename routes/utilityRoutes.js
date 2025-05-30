const express = require('express');
const router = express.Router();
const samplesController = require('../controllers/samples.controller');
const utilityController = require('../controllers/utility.controller');

// Public routes
router.route('/categories').get(samplesController.getSamples)
    .post(utilityController.postCategory);

router.route("/buyers").post(utilityController.postBuyer);
router.route("/statuses").post(utilityController.postStatus);
router.route("/shelfs").post(utilityController.postShelf);
router.route("/divisions").post(utilityController.postDivision);

router.get('/buyers', utilityController.getBuyers);
router.get('/statuses', utilityController.getStatuses);
router.get('/shelfs', utilityController.getShelves);
router.get('/divisions', utilityController.getDivisions);

// UPDATE routes
router.put('/categories', utilityController.updateUtility); // PUT request to update by ID in body
router.put('/', utilityController.updateUtility);   // PUT request to update by ID in body


router.patch('/convert-shelfs-divisions-positions-to-numbers', utilityController.convertFieldsToNumbers);   // PUT request to update by ID in body

// DELETE routes
router.delete('/categories/:id', utilityController.deleteCategory); // DELETE request with ID in URL param
router.delete('/:type/:id', utilityController.deleteUtility); // DELETE request with type and ID in URL params

router.route("/categories/:id").delete(utilityController.deleteCategory);

module.exports = router;
