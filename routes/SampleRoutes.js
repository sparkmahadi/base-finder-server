// backend/routes/sampleRoutes.js
const express = require('express');
const { getDb } = require('../db'); // Import MongoDB connection

const router = express.Router();

// Route to get all samples
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const samples = await db.collection('samples').find().toArray();
    res.json(samples);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving samples', error });
  }
});

// Route to create a new sample
router.post('/', async (req, res) => {
  const { date, category, style, noOfSample, s, d, status, comments, released } = req.body;

  try {
    const db = getDb();
    const result = await db.collection('samples').insertOne({
      date,
      category,
      style,
      noOfSample,
      s,
      d,
      status,
      comments,
      released,
    });
    res.json(result.ops[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating sample', error });
  }
});

// Route to update an existing sample
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { date, category, style, noOfSample, s, d, status, comments, released } = req.body;

  try {
    const db = getDb();
    const result = await db.collection('samples').updateOne(
      { _id: new MongoClient.ObjectId(id) },
      { $set: { date, category, style, noOfSample, s, d, status, comments, released } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Sample not found or no changes made' });
    }

    res.json({ message: 'Sample updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating sample', error });
  }
});

// Route to delete a sample
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const result = await db.collection('samples').deleteOne({ _id: new MongoClient.ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Sample not found' });
    }

    res.json({ message: 'Sample deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting sample', error });
  }
});

module.exports = router;
