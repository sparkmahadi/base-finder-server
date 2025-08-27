// backend/routes/authRoutes.js
const express = require("express");
const { register, login } = require("../../controllers/v2/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

module.exports = router;