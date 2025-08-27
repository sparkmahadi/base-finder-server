const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";


const { db } = require('../db');
const usersCollection = db.collection('users');

async function protect(req, res, next) {
  console.log('hit protect');
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('from protection: user not authorized- authHeader-', authHeader);
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id || decoded._id;

    if (!userId) {
      console.log('Invalid token payload: user ID missing');
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
    console.error("Auth middleware error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    } else if (error.name === "NotBeforeError") {
      return res.status(401).json({ message: "Token not active yet" });
    }

    return res.status(500).json({ message: "Internal authentication error" });
  }
}

module.exports = { protect };
