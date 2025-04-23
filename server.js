// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./db'); // Import MongoDB connection function
const sampleRoutes = require('./routes/sampleRoutes');
dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/samples', sampleRoutes);

app.listen(5000, () => {
  console.log('Backend server is running on port 5000');
});
