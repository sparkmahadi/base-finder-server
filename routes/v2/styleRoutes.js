const express = require('express');
const router = express.Router();
const { protect } = require('../../middlewares/authMiddlewares'); // Assuming 'protect' is for authentication
const { createStyle, getAllStyles, getStyleById, deleteStyle, uploadStyles, updateStyleSampling, updateBasicStyle, updateStyleByProduction, deleteSpecificFieldInStyles, bulkUpdateStyles } = require('../../controllers/v2/styles.controller');

// --- Public Routes ---


// Utility and Query Routes (more specific than /:id)
router.route('/')
    .get(protect, getAllStyles)
    .post(protect, createStyle);

router.route("/excel-upload").post(uploadStyles)

router.route("/update-style-sampling/:id").put(protect, updateStyleSampling);
router.route("/update-style-production/:id").put(protect, updateStyleByProduction);

router.delete("/delete-field", protect, deleteSpecificFieldInStyles);

// Bulk update multiple styles
router.put("/bulk-update", protect, bulkUpdateStyles);


// dynamic routes
router.route("/:id").get(getStyleById)
    .put(protect, updateBasicStyle)
    .delete(deleteStyle)


module.exports = router;