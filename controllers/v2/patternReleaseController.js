// const PatternLog = require('../models/PatternLog'); // Mongoose model is no longer used
const { ObjectId } = require('mongodb'); // Import ObjectId for handling MongoDB _id fields
const { db } = require('../../db');
const patternReleaseCollection = db.collection('pattern-releases'); // Your collection name

// @desc    Get all pattern logs from MongoDB collection
// @route   GET /api/logs
// @access  Public
exports.getAllLogs = async (req, res) => { // Assuming db is passed
    const user = req.user;
    const user_team = user?.team
    console.log(user);
    try {
        if (user?.role === 'admin') {
            // Fetch all documents, convert cursor to array, sort by date descending
            const logs = await patternReleaseCollection.find().sort({ date: -1, createdAt: -1 }).toArray();
            res.status(200).json(logs);
        }
        else {
            // Fetch all documents, convert cursor to array, sort by date descending
            const logs = await patternReleaseCollection.find({ user_team: user_team }).sort({ date: -1, createdAt: -1 }).toArray();
            res.status(200).json(logs);
        }
    } catch (error) {
        console.error('Error in getAllLogs:', error);
        res.status(500).json({ message: 'Server Error: Could not retrieve logs from MongoDB' });
    }
};

// @desc    Create a new pattern log in MongoDB collection
// @route   POST /api/pattern-release-logs
// @access  Public (consider adding authentication/authorization)
exports.createLog = async (req, res) => {
    console.log(req.body);
    try {
        const {
            date,
            buyer,
            style,
            item, // Now represents 'Category'
            body,
            size,
            status, // New field from frontend
            added_by,
            added_at,
            user_team,
            comments,
        } = req.body;

        // Basic validation for essential fields
        if (!date || !buyer || !style || !item || !status) {
            return res.status(400).json({ message: 'Please include all required fields: date, buyer, style, category, and status.' });
        }

        // Convert date string to Date object
        const logDate = new Date(date);

        // --- Duplicate Entry Check for Creation ---
        const existingLog = await patternReleaseCollection.findOne({
            date: logDate,
            buyer: buyer,
            style: style,
            item: item, // Category
            body: body || null, // Handle optional body
            size: size || null, // Handle optional size
        });

        if (existingLog) {
            return res.status(409).json({ message: 'A log with the same Date, Buyer, Style, Category, Body, and Size already exists.' });
        }
        // --- End Duplicate Check ---

        const newLog = {
            date: logDate,
            buyer,
            style,
            comments: comments || "",
            item, // This is now 'Category'
            body: body || '', // Default to empty string if not provided
            size: size || '', // Default to empty string if not provided
            status, // Include the new status field
            added_by: added_by || 'system', // Default or ensure user info
            added_at: added_at ? new Date(added_at) : new Date(), // Use provided or current date
            user_team,
            createdAt: new Date(), // Automatically set creation timestamp
            updatedAt: new Date(), // Automatically set update timestamp
        };

        const result = await patternReleaseCollection.insertOne(newLog);

        // Return the created log with its generated _id
        res.status(201).json({ _id: result.insertedId, ...newLog });
    } catch (error) {
        console.error('Error in createLog:', error);
        res.status(500).json({ message: 'Server Error: Could not create log.' });
    }
};

// @desc    Update a pattern log in MongoDB collection
// @route   PUT /api/pattern-release-logs/:id
// @access  Public (consider adding authentication/authorization)
exports.updateLog = async (req, res) => {
    try {
        const { id } = req.params;
        // Destructure to explicitly get the fields from frontend, excluding _id
        const {
            date,
            buyer,
            style,
            item,
            body,
            size,
            status,
            updated_by,
            last_updated_at,
            comments,
            // Exclude any other fields that shouldn't be directly updated
            _id, // Exclude _id if it's sent in req.body
            createdAt, // Exclude createdAt from direct update
            added_at, // Exclude added_at from direct update
            added_by, // Exclude added_by from direct update
            ...rest // Catch any other unexpected fields if necessary
        } = req.body;


        // Basic validation for essential fields
        if (!date || !buyer || !style || !item || !status) {
            return res.status(400).json({ message: 'Please include all required fields: date, buyer, style, category, and status.' });
        }

        // Convert string ID to ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid Log ID format.' });
        }
        const objectId = new ObjectId(id);

        // Prepare the update object, ensuring date is a Date object
        const updateFields = {
            date: new Date(date),
            buyer,
            style,
            item,
            body: body || '',
            size: size || '',
            comments: comments || "",
            status,
            updated_by: updated_by || 'system', // Default or ensure user info
            last_updated_at: last_updated_at ? new Date(last_updated_at) : new Date(), // Use provided or current date
            updatedAt: new Date(), // Always update this timestamp
        };

        // --- Duplicate Entry Check for Update ---
        // Find if another document with the same unique combination exists,
        // but make sure it's not the document we are currently updating.
        const existingLog = await patternReleaseCollection.findOne({
            date: updateFields.date,
            buyer: updateFields.buyer,
            style: updateFields.style,
            item: updateFields.item,
            body: updateFields.body || null,
            size: updateFields.size || null,
            _id: { $ne: objectId } // Exclude the current document from the check
        });

        if (existingLog) {
            return res.status(409).json({ message: 'An existing log already has this combination of Date, Buyer, Style, Category, Body, and Size.' });
        }
        // --- End Duplicate Check ---

        // Update the document by _id
        const result = await patternReleaseCollection.updateOne(
            { _id: objectId },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Log not found.' });
        }

        // Fetch the updated document to return the complete object
        const updatedLog = await patternReleaseCollection.findOne({ _id: objectId });
        res.status(200).json(updatedLog);
    } catch (error) {
        console.error('Error in updateLog:', error);
        res.status(500).json({ message: 'Server Error: Could not update log.' });
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


exports.addTeamToEmptyPatterns = async (req, res) => {
    try {
        const { teamName } = req.body;

        if (!teamName) {
            return res.status(400).json({ message: "teamName is required" });
        }

        const result = await patternReleaseCollection.updateMany(
            {
                $or: [
                    { user_team: { $exists: false } },
                    { user_team: "" },
                    { user_team: null }
                ]
            },
            { $set: { user_team: teamName } }
        );

        res.json({
            message: `Team name ${teamName} added successfully to ${result.modifiedCount} documents`,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Error updating team:", error);
        res.status(500).json({ message: "Server error", error });
    }
}