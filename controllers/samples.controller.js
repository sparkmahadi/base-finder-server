const { db } = require("../db");
const { ObjectId } = require("mongodb");

const samplesCollection = db.collection("samples");
const takenSamplesCollection = db.collection("taken-samples");
const deletedSamplesCollection = db.collection("deleted-samples");

// Get all samples including taken ones - deprecated by mahadi
exports.getAllSamples = async (req, res) => {
  console.log('GET /samples');
  try {
    const result1 = await samplesCollection.find().toArray();
    const result2 = await takenSamplesCollection.find().toArray();
    const result = [...result1, ...result2];
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

// Get all samples - deprecated by mahadi
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

exports.getSampleDetails = async (req, res) => {
  console.log('GET /sampledetails');
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  if (typeof id === "string") {
    console.log('true');
    try {
      const result = await samplesCollection.findOne(query);
      res.status(200).json({
        success: true,
        message: `sample details found`,
        samples: result,
      }); console.log(result);
    } catch (error) {
      console.error('Error fetching samples:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
  else res.status(500).json({ success: false, message: 'Id is not a string' });
}

// GET /api/samples?page=1&limit=50&search=abc&taken=true
// single collection - deprecated by mahadi
exports.getPaginatedSamples = async (req, res) => {
  console.log('get paginated samples');

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';

    // Copy all other query params except page, limit, and search
    const filterParams = { ...req.query };
    delete filterParams.page;
    delete filterParams.limit;
    delete filterParams.search;

    const filter = {};

    // ✅ Search by multiple fields
    if (search) {
      filter.$or = [
        { buyer: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { style: { $regex: search, $options: 'i' } },
        { no_of_sample: { $regex: search, $options: 'i' } },
        { shelf: { $regex: search, $options: 'i' } },
        { division: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } },
        { season: { $regex: search, $options: 'i' } },
        { comments: { $regex: search, $options: 'i' } },
        { added_by: { $regex: search, $options: 'i' } },
      ];
    }



    // ✅ Apply dynamic filters (e.g. category, availability, shelf, rack, etc.)
    Object.entries(filterParams).forEach(([key, value]) => {
      if (value) {
        filter[key] = { $regex: value, $options: 'i' }; // case-insensitive
      }
    });

    console.log('Final Filter:', filter);

    const samples = await samplesCollection
      .find(filter)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await samplesCollection.countDocuments(filter);
    console.log('searched- ', search, "and found -", samples.length);
    res.status(200).json({
      samples,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch samples' });
  }
};



// Get taken samples separate collection
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
      sample_date: sample.sample_date ? new Date(sample.sample_date) : null,
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
  console.log('hit putback');
  try {
    const sampleId = req.params.id;
    const { position, returned_by, return_purpose } = req.body;

    const numericPosition = Number(position);
    if (!numericPosition || numericPosition < 1) {
      return res.status(400).json({ success: false, message: "Invalid position" });
    }

    const sample = await takenSamplesCollection.findOne({ _id: new ObjectId(sampleId) });
    if (!sample) {
      return res.status(404).json({ success: false, message: "Sample not found in takenSamples" });
    }

    const { shelf, division } = sample;

    // Step 1: Find all matching samples and shift positions manually
    const samplesToShift = await samplesCollection
      .find({ shelf, division })
      .toArray();

    for (const s of samplesToShift) {
      const currentPos = Number(s.position);
      if (!isNaN(currentPos) && currentPos >= numericPosition) {
        await samplesCollection.updateOne(
          { _id: s._id },
          { $set: { position: currentPos + 1 } }
        );
      }
    }


    // 🧾 Step 2: Prepare and insert back into samplesCollection
    const restoredSample = {
      ...sample,
      position: numericPosition,
      availability: "yes",
      returned_at: new Date(),
      returned_log: [
        ...(sample.returned_log || []),
        {
          returned_by,
          purpose: return_purpose,
          returned_at: new Date()
        }
      ]
    };

    delete restoredSample._id;

    const insertResult = await samplesCollection.insertOne(restoredSample);
    if (!insertResult.insertedId) {
      return res.status(500).json({ success: false, message: "Insert failed" });
    }

    // 🗑️ Step 3: Remove from takenSamples
    await takenSamplesCollection.deleteOne({ _id: new ObjectId(sampleId) });

    res.status(200).json({
      success: true,
      message: `Sample kept back at position ${numericPosition} on shelf ${shelf} - division ${division}`,
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
      availability: "no",
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
    if (positionUpdate.modifiedCount > 0) {
      console.log('positions updated');
    }


    // Delete from active samples collection
    const deleteResult = await samplesCollection.deleteOne({ _id: new ObjectId(sampleId) });
    if (deleteResult.deletedCount === 0) {
      return res.status(500).json({ success: false, message: "Archived the sample but Failed to delete original sample" });
    }
    console.log("sampleId", sampleId);
    return res.status(200).json({
      success: true,
      message: `${sample.status} Sample of ${sample.style} ${sample.category}, is taken for "${purpose}"`,
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
  console.log(userId);

  // ✅ Validate ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid sample ID' });
  }

  try {
    const objectId = new ObjectId(id);

    const sample = await samplesCollection.findOne({ _id: objectId });

    if (!sample) {
      return res.json({ success: false, message: 'Sorry, Sample not found' });
    }

    await deletedSamplesCollection.insertOne({
      ...sample,
      deletedBy: userId,
      deletedAt: new Date(),
    });

    await samplesCollection.deleteOne({ _id: objectId });

    res.status(200).json({ success: true, message: `Sample: ${id} moved to recycle bin` });
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
