const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";


const { db } = require('../db');
const usersCollection = db.collection('users');


// You need to import or get your usersCollection instance here
// For example, if you have a db connection helper:
// const { usersCollection } = require('../db'); 
// Adjust the import according to your project structure

async function protect(req, res, next) {
  console.log('hit protect');
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id || decoded._id;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload: user ID missing" });
    }

    // Fetch user from DB to get role and other details
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user info including role to req.user
    req.user = {
      _id: user._id.toString(),
      username: user.username,
      role: user.role,
      team: user.team,
      email: user.email,
      // add other fields you want available
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: "Token invalid or expired" });
  }
}

module.exports = { protect };
