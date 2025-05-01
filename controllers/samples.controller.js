const { db } = require("../db");
const { ObjectId } = require("mongodb");

const samplesCollection = db.collection("samples");
const takenSamplesCollection = db.collection("taken-samples");
const deletedSamplesCollection = db.collection("deleted-samples");

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

exports.getTakenSamples = async (req, res) => {
    console.log('GET /takensamples');
    try {
        const result = await takenSamplesCollection.find().toArray();
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
  try {
    const { samples } = req.body;

    if (!Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ message: 'No samples provided' });
    }

    const newSamples = samples.map((sample) => ({
      sample_date: new Date(sample.date) || new Date(),
      buyer: sample.buyer || '',
      category: sample.category || '',
      style: sample.style || '',
      no_of_sample: sample.no_of_sample || 0,
      shelf: sample.shelf || 0,
      division: sample.division || 0,
      position: sample.position || 0,
      status: sample.status || '',
      season: sample.season || '',
      comments: sample.comments || '',
      released: sample.released ? new Date(sample.released) : null,
      added_by: sample.added_by || 'unknown',
      createdAt: new Date(),
      added_at: new Date(),
    }));

    await samplesCollection.insertMany(newSamples);

    return res.status(201).json({ message: 'Samples uploaded successfully', count: newSamples.length });
  } catch (err) {
    console.error('Error uploading samples:', err);
    return res.status(500).json({ message: 'Failed to upload samples' });
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

// Controller: putBackSample.js
exports.putBackSample = async (req, res) => {
  try {
    const sampleId = req.params.id;
    const { position, returned_by } = req.body;

    if (!position || isNaN(position) || position < 1) {
      return res.status(400).json({ success: false, message: "Invalid position" });
    }

    if (!returned_by || typeof returned_by !== "string") {
      return res.status(400).json({ success: false, message: "Returned by is required." });
    }

    const sample = await takenSamplesCollection.findOne({ _id: new ObjectId(sampleId) });
    if (!sample) {
      return res.status(404).json({ success: false, message: "Sample not found in takenSamples" });
    }

    const { shelf, division } = sample;

    // Step 1: Shift down other samples' positions
    await samplesCollection.updateMany(
      { shelf, division, position: { $gte: parseInt(position) } },
      { $inc: { position: 1 } }
    );

    // Step 2: Prepare the return log
    const timestamp = new Date();
    const returnLog = {
      returned_by,
      returned_at: timestamp,
    };

    // Step 3: Insert updated sample
    const restoredSample = {
      ...sample,
      position: parseInt(position),
      last_returned_by: returned_by,
      last_returned_at: timestamp,
      availability: "yes",
      returned_logs: sample.returned_logs ? [...sample.returned_logs, returnLog] : [returnLog],
    };
    delete restoredSample._id;

    const insertResult = await samplesCollection.insertOne(restoredSample);
    if (!insertResult.insertedId) {
      return res.status(500).json({ success: false, message: "Insert failed" });
    }

    // Step 4: Delete from takenSamples
    await takenSamplesCollection.deleteOne({ _id: new ObjectId(sampleId) });

    res.status(200).json({
      success: true,
      message: `Sample put back at position ${position} on shelf ${shelf}/${division}`,
    });

  } catch (err) {
    console.error("Error in putBackSample:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};





// In routes/samples.js
exports.takeSample = async (req, res) => {
  console.log('hit take sample');
  try {
    const sampleId = req.params.id;
    const { taken_by, purpose } = req.body;

    if (!taken_by || !purpose) {
      return res.status(400).json({ success: false, message: "Missing taken_by or purpose" });
    }

    const timestamp = new Date();

    // Fetch the sample
    const sample = await samplesCollection.findOne({ _id: new ObjectId(sampleId) });
    if (!sample) {
      return res.status(404).json({ success: false, message: "Sample not found" });
    }

    // Prepare new fields
    const logEntry = {
      taken_by,
      purpose,
      taken_at: timestamp
    };

    const updatedSample = {
      ...sample,
      last_taken_by: taken_by,
      last_taken_at: timestamp,
      availability:"no",
      taken_logs: [...(sample.taken_logs || []), logEntry]
    };

    // Move to takenSamples collection
    const insertResult = await takenSamplesCollection.insertOne(updatedSample);
    if (!insertResult.insertedId) {
      return res.status(500).json({ success: false, message: "Failed to archive the sample" });
    }

    // Step 2: Adjust position of samples below in the same shelf/division
    const positionUpdate = await samplesCollection.updateMany(
      {
        shelf: sample.shelf,
        division: sample.division,
        position: { $gt: sample.position }
      },
      { $inc: { position: -1 } }
    );
    if(positionUpdate.modifiedCount>0){
      console.log('positions updated');
    }


    // Delete from active samples collection
    const deleteResult = await samplesCollection.deleteOne({ _id: new ObjectId(sampleId) });
    if (deleteResult.deletedCount === 0) {
      return res.status(500).json({ success: false, message: "Archived the sample but Failed to delete original sample" });
    }

    return res.status(200).json({
      success: true,
      message: `Sample ${sample.sampleId} moved to archive`,
      taken_by,
      taken_at: timestamp,
      purpose
    });

  } catch (err) {
    console.error("Error in /take:", err);
    return res.status(500).json({ success: false, message: "Server error" });
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
