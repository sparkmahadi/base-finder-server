// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const { registerUser, loginUser } = require("../models/userModel");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key"; // put this in .env

// Register Controller
async function register(req, res) {
  const { username, password } = req.body;


  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    await registerUser(username, password);
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

// Login Controller
async function login(req, res) {
  const { username, password } = req.body;
 console.log('hit login controller');
  try {
    const user = await loginUser(username, password);
    
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, username: user.username });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

module.exports = { register, login };
