// backend/db.js
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

let db = null;

console.log(process.env.MONGO_URI);

const connectDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGO_URI);

    await client.connect();
    db = client.db('base-finder'); // ← replace with your DB name
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
};

module.exports = { connectDB, getDb };
