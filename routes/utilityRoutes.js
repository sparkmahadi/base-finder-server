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

router.route("/categories/:id").delete(utilityController.deleteCategory);

module.exports = router;
