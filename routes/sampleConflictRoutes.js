// backend/routes/sampleRoutes.js

const express = require('express');
const router = express.Router();

const  sampleConflictController  = require('../controllers/sampleConflictController');

// Public routes
router.route('/').post(sampleConflictController.checkPositionConflicts);

module.exports = router;
