// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require("jsonwebtoken");


const { connectToDB } = require('./db');
const { db } = require("./db");

const sampleRoutes = require('./routes/sampleRoutes')
const authRoutes = require('./routes/authRoutes');
const utilityRoutes = require('./routes/utilityRoutes');
const userRoutes = require('./routes/userRoutes');
const { ObjectId } = require('mongodb');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
connectToDB()
  .then(() => {
    app.listen(port, () => { console.log(`Base Finder server is running on port ${port}`); })
  })
  .catch((err) => {
    console.error('Error starting server:', err);
  });

const categoriesCollection = db.collection("sample-categories");
const usersCollection = db.collection("users");
const samplesCollection = db.collection("samples");


// Routes
app.get('/', (req, res) => {
  res.send('Base Finder by Mahadi, Server is running')
})

// app.use('/api/samples', sampleRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/utilities', utilityRoutes);

// 404 handler (keep at the end)
// app.use((req, res) => {
//   res.json({ message: "Route not found" });
// });


// **READ** - Get all categories
app.get('/api/utilities/categories', async (req, res) => {
  try {
    const categories = await categoriesCollection.find().toArray();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error });
  }
});

// **READ** - Get category by cat_id
app.get('/api/utilities/categories/:cat_id', async (req, res) => {
  const { cat_id } = req.params;
  try {
    const category = await categoriesCollection.findOne({ cat_id });
    if (!category) {
      return res.json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category', error });
  }
});

// **UPDATE** - Update a category by cat_id
app.put('/api/utilities/categories/:cat_id', async (req, res) => {
  const { cat_id } = req.params;
  const { cat_name, buyer_name, status, totalSamples } = req.body;
  console.log(cat_id, req.body);

  try {
    const updatedCategory = await categoriesCollection.findOneAndUpdate(
      { cat_id },
      { $set: { cat_name, buyer_name, status, totalSamples } },
      { returnDocument: 'after' }
    );
    if (!updatedCategory.value) {
      return res.json({ message: 'Category not found' });
    }
    res.send("sample category updated");
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error });
  }
});

// **DELETE** - Delete a category by cat_id


// GET unique category + buyer pairs with totalSamples from samplesCollection
app.get('/api/utilities/unique-category-buyers', async (req, res) => {
  console.log('hit get unique category');
  try {
    const uniquePairs = await samplesCollection.aggregate([
      {
        $group: {
          _id: { category: "$category", buyer: "$buyer" },
          totalSamples: { $sum: "$no_of_sample" }
        }
      },
      {
        $project: {
          cat_name: "$_id.category",
          buyer_name: "$_id.buyer",
          totalSamples: 1 // <- This includes the summed value
        }
      }
    ]).toArray();

    // console.log(uniquePairs);

    if (uniquePairs.length) {
      res.send({ success: true, categories: uniquePairs });
    } else {
      res.send({ message: "No unique pairs found", success: false });
    }
  } catch (error) {
    console.error("Error fetching unique category-buyer pairs:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch unique category-buyer pairs', error });
  }
});

app.post('/api/utilities/categories/bulk', async (req, res) => {
  const { categories } = req.body;
  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ success: false, message: 'No categories provided' });
  }

  try {
    const queries = categories.map(({ cat_name, buyer_name }) => ({
      cat_name,
      buyer_name
    }));

    // Check existing entries
    const existing = await categoriesCollection
      .find({ $or: queries })
      .toArray();

    if (existing.length > 0) {
      return res.status(409).json({
        redirect: true,
        message: 'Some categories already exist in DB',
        existing
      });
    }

    // Add new entries
    const formatted = categories.map(({ cat_name, buyer_name, totalSamples }) => ({
      cat_name,
      buyer_name,
      totalSamples,
      status: "Pending", // or req.body.status if needed
    }));

    const result = await categoriesCollection.insertMany(formatted);
    res.json({ success: true, insertedCount: result.insertedCount });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error uploading categories', error });
  }
});





// Middleware to verify the JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from 'Bearer token' format
  // console.log(token);

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = decoded; // Attach decoded user data to request object
    next();
  });
};

// API to get user info
app.get('/api/auth/user', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Assuming JWT payload has user id
    const query = { _id: new ObjectId(userId) };
    const user = await usersCollection.findOne(
      query,       // Query by ObjectId
      { projection: { password: 0 } }      // Exclude 'password' field
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.send(user);
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET samples by shelf and division
app.get('/api/samples-by-location', async (req, res) => {
  const { shelf, division } = req.query; // Get shelf and division from query parameters
  console.log(shelf, division);
  if (!shelf || !division) {
    return res.status(400).json({ success: false, message: 'Shelf and Division are required query parameters.' });
  }

  try {
    // Convert to number for proper querying if they are stored as numbers
    const queryShelf = parseInt(shelf);
    const queryDivision = parseInt(division);

    if (isNaN(queryShelf) || isNaN(queryDivision)) {
      return res.status(400).json({ success: false, message: 'Shelf and Division must be valid numbers.' });
    }

    const samples = await samplesCollection.find({
      shelf: queryShelf,
      division: queryDivision
    }).toArray(); // Convert cursor to array

    res.status(200).json({ success: true, samples: samples });
  } catch (error) {
    console.error('Error fetching samples by location:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch samples by location.' });
  }
});


app.use('/api/samples', sampleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/users', userRoutes); // Mount user routes