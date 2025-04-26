
const {db} = require("../db");
const bcrypt = require("bcrypt");

const usersCollection = db.collection("users");

// Register a new user
async function registerUser(username, password) {
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      console.log(username, password);
    throw new Error("Username already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    username,
    password: hashedPassword,
    createdAt: new Date(),
  };

  const result = await usersCollection.insertOne(newUser);
  console.log(result);
  return result;
}

// Login user
async function loginUser(username, password) {
    console.log(username, password);
  const user = await usersCollection.findOne({ username });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  return user;
}

module.exports = { registerUser, loginUser };
