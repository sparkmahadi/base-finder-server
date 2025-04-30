const { db } = require("../db");
const { ObjectId } = require("mongodb");

const samplesCollection = db.collection("samples");
const deletedSamplesCollection = db.collection("deleted_samples");

// Get all samples
exports.getSamples = async (req, res) => {
    console.log('GET /samples');
    try {
        const result = await samplesCollection.find().toArray();
        res.status(200).json({
            success: true,
            message: `${result.length} samples found`,
            samples: result,
        });
    } catch (error) {
        console.error('Error fetching samples:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Add a new sample
exports.postSample = async (req, res) => {
    console.log('POST /samples');
    try {
        const newSample = req.body;
        const result = await samplesCollection.insertOne(newSample);

        if (result.insertedId) {
            return res.status(201).json({ success: true, message: 'Sample inserted', id: result.insertedId });
        }
        res.status(400).json({ success: false, message: 'Failed to insert sample' });
    } catch (error) {
        console.error('Error inserting sample:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Upload samples from Excel
exports.uploadSamplesFromExcel = async (req, res) => {
    console.log('POST /samples/upload-excel');
    try {
        const { samples } = req.body;

        if (!Array.isArray(samples)) {
            return res.status(400).json({ success: false, message: 'Invalid samples data' });
        }

        let insertedCount = 0;
        for (const sample of samples) {
            const exists = await samplesCollection.findOne({ style: sample.style, category: sample.category });
            if (!exists) {
                await samplesCollection.insertOne(sample);
                insertedCount++;
            }
        }

        res.status(200).json({ success: true, message: `${insertedCount} new samples uploaded successfully` });
    } catch (error) {
        console.error('Error uploading samples:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update an existing sample
exports.updateSample = async (req, res) => {
    console.log('PUT /samples/:id');
    const { id } = req.params;
    const updateData = req.body; // Frontend sends updated data
    
    // Ensure only the expected fields are updated
    const allowedFields = [
        'date', 'category', 'style', 'no_of_sample', 'shelf', 'division', 'position', 
        'status', 'comments', 'taken', 'purpose_of_taking', 'released'
    ];

    // Filter out any unwanted fields from the request body
    const filteredUpdateData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
        }, {});

    console.log(filteredUpdateData);  // Logging the filtered data

    try {
        // Update the sample in the database
        const result = await samplesCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: filteredUpdateData }
        );

        if (result.modifiedCount === 0) {
            return res.status(200).json({ success: false, message: 'Sample not found or no changes made' });
        }

        res.status(200).json({ success: true, message: 'Sample updated successfully' });
    } catch (error) {
        console.error('Error updating sample:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// In routes/samples.js
exports.takeSample = async (req, res) => {
  try {
    const sampleId = req.params.id;
    const { taken_by, purpose } = req.body;
    console.log(taken_by, purpose);

    if (!taken_by || !purpose) {
      return res.status(400).json({ success: false, message: "Missing taken_by or purpose" });
    }

    const timestamp = new Date().toISOString();

    // Fetch current sample to count existing take logs
    const sample = await samplesCollection.findOne({ _id: new ObjectId(sampleId) });

    if (!sample) {
      return res.status(404).json({ success: false, message: "Sample not found" });
    }

    // Count how many take logs already exist
    const takenLogCount = Object.keys(sample).filter((key) => key.startsWith("taken_log_")).length;
    const newLogField = `taken_log_${takenLogCount + 1}`;

    const updateDoc = {
      $set: {
        last_taken_by: taken_by,
        last_taken_at: timestamp,
      },
      $setOnInsert: {},
    };

    updateDoc.$set[newLogField] = `Taken by ${taken_by} at ${timestamp} for "${purpose}"`;

    const result = await samplesCollection.updateOne(
      { _id: new ObjectId(sampleId) },
      updateDoc
    );

    res.json({
      success: true,
      message: "Sample taken",
      log_field: newLogField,
      taken_by,
      taken_at: timestamp,
      purpose,
    });
  } catch (err) {
    console.error("Error in /take:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Soft delete a sample
exports.deleteSample = async (req, res) => {
    console.log('DELETE /samples/:id');
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const sample = await samplesCollection.findOne({ _id: new ObjectId(id) });

        if (!sample) {
            return res.status(404).json({ success: false, message: 'Sample not found' });
        }

        await deletedSamplesCollection.insertOne({
            ...sample,
            deletedBy: userId,
            deletedAt: new Date(),
        });

        await samplesCollection.deleteOne({ _id: new ObjectId(id) });

        res.status(200).json({ success: true, message: 'Sample moved to recycle bin' });
    } catch (error) {
        console.error('Error deleting sample:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get deleted samples
exports.getDeletedSamples = async (req, res) => {
    console.log('GET /samples/deleted-samples');
    try {
        const deletedSamples = await deletedSamplesCollection.find().toArray();
        res.status(200).json({ success: true, data: deletedSamples });
    } catch (error) {
        console.error('Error fetching deleted samples:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Restore a deleted sample
exports.restoreSample = async (req, res) => {
    console.log('POST /samples/deleted-samples/restore/:id');
    const { id } = req.params;

    try {
        const deletedSample = await deletedSamplesCollection.findOne({ _id: new ObjectId(id) });

        if (!deletedSample) {
            return res.status(404).json({ success: false, message: 'Deleted sample not found' });
        }

        const { _id, deletedBy, deletedAt, ...sampleData } = deletedSample;

        await samplesCollection.insertOne(sampleData);
        await deletedSamplesCollection.deleteOne({ _id: new ObjectId(id) });

        res.status(200).json({ success: true, message: 'Sample restored successfully' });
    } catch (error) {
        console.error('Error restoring sample:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
