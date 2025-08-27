const express = require("express");
const { protect } = require("../../middlewares/authMiddlewares");
const { postActivity, getActivities } = require("../../controllers/v2/activities.controller");

const router = express.Router();

router.get("/", protect, getActivities);
router.post("/", protect, postActivity);

module.exports = router;
