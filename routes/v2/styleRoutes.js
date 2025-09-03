const express = require('express');
const router = express.Router();
const { protect } = require('../../middlewares/authMiddlewares'); // Assuming 'protect' is for authentication
const { createStyle, getAllStyles, getStyleById, deleteStyle, uploadStyles, updateStyleSampling, updateBasicStyle } = require('../../controllers/v2/styles.controller');

// --- Public Routes ---


// Utility and Query Routes (more specific than /:id)
router.route('/')
    .get(protect, getAllStyles)
    .post(protect, createStyle);

router.route("/excel-upload").post(uploadStyles)

router.route("/update-style-sampling/:id").put(updateStyleSampling);

// dynamic routes
router.route("/:id").get(getStyleById)
    .put(updateBasicStyle)
    .delete(deleteStyle)


module.exports = router;