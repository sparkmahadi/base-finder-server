// const PatternLog = require('../models/PatternLog'); // Mongoose model is no longer used
const { ObjectId } = require('mongodb'); // Import ObjectId for handling MongoDB _id fields
const {db} = require('../db');
const patternReleaseCollection = db.collection('pattern-releases'); // Your collection name

// @desc    Get all pattern logs from MongoDB collection
// @route   GET /api/logs
// @access  Public
exports.getAllLogs = async (req, res) => { // Assuming db is passed
  try {
    // Fetch all documents, convert cursor to array, sort by date descending
    const logs = await patternReleaseCollection.find({}).sort({ date: -1, createdAt: -1 }).toArray();
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error in getAllLogs:', error);
    res.status(500).json({ message: 'Server Error: Could not retrieve logs from MongoDB' });
  }
};

// @desc    Create a new pattern log in MongoDB collection
// @route   POST /api/logs
// @access  Public
exports.createLog = async (req, res) => { // Assuming db is passed
  try {
    const { date, buyer, style, item, testingDevelop, fitPp, gssProduction, body, size, printPatternRelease, consumption, added_by, added_at,  } = req.body;

    // Basic validation
    if (!date || !buyer || !style || !item) {
      return res.status(400).json({ message: 'Please include all required fields: date, buyer, style, item' });
    }

    const newLog = {
      date: new Date(date), // Convert date string to Date object
      buyer,added_by, added_at,
      style,
      item,
      testingDevelop: testingDevelop || '',
      fitPp: fitPp || '',
      gssProduction: gssProduction || '',
      body: body || '',
      size: size || '',
      printPatternRelease: printPatternRelease || '',
      consumption: consumption || '',
      createdAt: new Date(), // Manually add createdAt for sorting consistency
      updatedAt: new Date(),
    };

    const result = await patternReleaseCollection.insertOne(newLog);
    res.status(201).json({ _id: result.insertedId, ...newLog }); // Return the created log with its generated _id
  } catch (error) {
    console.error('Error in createLog:', error);
    res.status(500).json({ message: 'Server Error: Could not create log in MongoDB' });
  }
};

// @desc    Update a pattern log in MongoDB collection
// @route   PUT /api/logs/:id
// @access  Public
exports.updateLog = async (req, res) => { // Assuming db is passed
    try {
        const { id } = req.params;
        const {_id, ...updatedData} = req.body;
        console.log(updatedData);

    // Convert string ID to ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Log ID format' });
    }
    const objectId = new ObjectId(id);

    // Update the document by _id
    const result = await patternReleaseCollection.updateOne(
      { _id: objectId },
      { $set: { ...updatedData, updatedAt: new Date() } } // Update updatedAt field
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }

    // Fetch the updated document to return the complete object
    const updatedLog = await patternReleaseCollection.findOne({ _id: objectId });
    res.status(200).json(updatedLog);
  } catch (error) {
    console.error('Error in updateLog:', error);
    res.status(500).json({ message: 'Server Error: Could not update log in MongoDB' });
  }
};

// @desc    Delete a pattern log from MongoDB collection
// @route   DELETE /api/logs/:id
// @access  Public
exports.deleteLog = async (req, res) => { // Assuming db is passed
  try {
    const { id } = req.params;

    // Convert string ID to ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Log ID format' });
    }
    const objectId = new ObjectId(id);

    // Delete the document by _id
    const result = await patternReleaseCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }

    res.status(200).json({ message: 'Log deleted successfully from MongoDB' });
  } catch (error) {
    console.error('Error in deleteLog:', error);
    res.status(500).json({ message: 'Server Error: Could not delete log from MongoDB' });
  }
};
