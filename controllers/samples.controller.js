const { db } = require("../db");
const { ObjectId } = require("mongodb");

const samplesCollection = db.collection("samples");
const buyersCollection = db.collection("buyers");
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

exports.getSamplesByShelfAndDivision = async (req, res) => {
  console.log('GET /samples by shelf and division');
  const { shelf, division } = req.query;
  const query = { shelf: parseInt(shelf), division: parseInt(division) };
  try {
    const result = await samplesCollection.find(query).toArray();
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
exports.getBuyers = async (req, res) => {
  console.log('GET /samples');
  try {
    const result = await buyersCollection.find().toArray();
    res.status(200).json({
      success: true,
      message: `${result.length} buyers found`,
      buyers: result,
    });
  } catch (error) {
    console.error('Error fetching buyers:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getSampleDetails = async (req, res) => {
  console.log('GET /sampledetails');
  const id = req.params.id;
  console.log(id);
  const query = { _id: new ObjectId(id) };
  if (typeof id === "string") {
    try {
      const result = await samplesCollection.findOne(query);
      if (result) {
        return res.status(200).json({
          success: true,
          message: `sample details found`,
          sample: result,
        });
      } else if (!result) {
        const result2 = await takenSamplesCollection.findOne(query);
        if (result2) {
          res.status(200).json({
            success: true,
            message: `sample details found`,
            sample: result2,
          });
        }
      } else { res.send({ success: false, message: 'Sample not found', sample: null }); }
    }
    catch (error) {
      console.error('Error fetching samples:', error);
      res.json({ success: false, message: 'Server Error' });
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


// Add a new sample - old controller
// exports.postSample = async (req, res) => {
//   console.log('POST /samples');
//   try {
//     const { position, shelf, division } = req.body;

//     const numericPosition = Number(position);
//     if (!numericPosition || numericPosition < 1) {
//       return res.status(400).json({ success: false, message: "Invalid position" });
//     }

//     // Step 1: Find all matching samples and shift positions manually
//     const samplesToShift = await samplesCollection
//       .find({ shelf, division })
//       .toArray();

//     for (const s of samplesToShift) {
//       const currentPos = Number(s.position);
//       if (!isNaN(currentPos) && currentPos >= numericPosition) {
//         await samplesCollection.updateOne(
//           { _id: s._id },
//           { $set: { position: currentPos + 1 } }
//         );
//       }
//     }
//     const newSample = req.body;
//     const result = await samplesCollection.insertOne(newSample);

//     if (result.insertedId) {
//       return res.status(201).json({ success: true, message: 'Sample inserted', id: result.insertedId });
//     }
//     res.status(400).json({ success: false, message: 'Failed to insert sample' });
//   } catch (error) {
//     console.error('Error inserting sample:', error);
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// };

exports.postSample = async (req, res) => {
  console.log('POST /samples');
  try {
    const { position, shelf, division, ...otherSampleData } = req.body; // Destructure position, shelf, division

    const numericPosition = Number(position);
    if (isNaN(numericPosition) || numericPosition < 1) { // Use isNaN for robustness
      return res.status(400).json({ success: false, message: "Invalid position" });
    }

    // Step 1: Shift existing samples down by 1 position
    // This efficiently updates all relevant documents in a single operation
    await samplesCollection.updateMany(
      {
        shelf: shelf,
        division: division,
        position: { $gte: numericPosition } // Target samples at or after the new position
      },
      {
        $inc: { position: 1 } // Increment their position by 1
      }
    );

    // Step 2: Prepare the new sample with the specified position
    const newSample = {
      ...otherSampleData, // Include other data from req.body
      position: numericPosition, // Assign the desired position to the new sample
      shelf: shelf,       // Ensure shelf and division are included
      division: division,
      availability: "yes", // Assuming new samples are always available
      added_at: new Date(), // Add timestamp
      // You might also want 'added_by', 'status' etc.
    };

    // Step 3: Insert the new sample
    const result = await samplesCollection.insertOne(newSample);

    if (result.insertedId) {
      return res.status(201).json({ success: true, message: 'Sample inserted successfully', id: result.insertedId });
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

    return res.status(201).json({ success: true, message: 'Samples uploaded successfully', count: newSamples.length });
  } catch (err) {
    console.error('Error uploading samples:', err);
    return res.status(500).json({ message: 'Failed to upload samples' });
  }
};


// Update an existing sample
exports.updateSampleById = async (req, res) => {
  console.log('hit updatesample');
  try {
    const sampleId = req.params.id;
    const updatedData = req.body;

    if (!ObjectId.isValid(sampleId)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const objectId = new ObjectId(sampleId);
    let targetCollection = null;
    let existingSample = await samplesCollection.findOne({ _id: objectId });

    if (existingSample) {
      targetCollection = samplesCollection;
    } else {
      existingSample = await takenSamplesCollection.findOne({ _id: objectId });
      if (existingSample) {
        targetCollection = takenSamplesCollection;
      } else {
        return res.json({ success: false, message: 'Sample not found in either collection' });
      }
    }

    const updatedFields = { ...updatedData };
    delete updatedFields._id; // Prevent _id from being updated

    // Check for actual changes
    const hasChanges = Object.keys(updatedFields).some(
      key => JSON.stringify(existingSample[key]) !== JSON.stringify(updatedFields[key])
    );

    if (!hasChanges) {
      return res.status(200).json({ message: 'No changes detected. Document not updated.' });
    }

    // Proceed with update
    const updateResult = await targetCollection.updateOne(
      { _id: objectId },
      { $set: updatedFields }
    );
    if (updateResult.modifiedCount > 0) {
      const updatedSample = await targetCollection.findOne({ _id: objectId });
      res.status(200).json({
        success: true,
        message: 'Sample updated successfully',
        updatedSample,
      });
    } else {
      res.json({ success: false, message: "Failed to modify sample" })
    }

  } catch (error) {
    console.error('Error updating sample:', error);
    res.status(500).json({ message: 'Error updating sample', error });
  }
};


// Controller: putBackSample.js -------old controller
// exports.putBackSample = async (req, res) => {
//   console.log('hit putback');
//   try {
//     const sampleId = req.params.id;
//     const { position, returned_by, return_purpose } = req.body;

//     const numericPosition = Number(position);
//     if (!numericPosition || numericPosition < 1) {
//       return res.status(400).json({ success: false, message: "Invalid position" });
//     }

//     const sample = await takenSamplesCollection.findOne({ _id: new ObjectId(sampleId) });
//     if (!sample) {
//       return res.status(404).json({ success: false, message: "Sample not found in takenSamples" });
//     }

//     const { shelf, division } = sample;

//     // Step 1: Find all matching samples and shift positions manually
//     const samplesToShift = await samplesCollection
//       .find({ shelf, division })
//       .toArray();

//     for (const s of samplesToShift) {
//       const currentPos = Number(s.position);
//       if (!isNaN(currentPos) && currentPos >= numericPosition) {
//         await samplesCollection.updateOne(
//           { _id: s._id },
//           { $set: { position: currentPos + 1 } }
//         );
//       }
//     }


//     // 🧾 Step 2: Prepare and insert back into samplesCollection
//     const restoredSample = {
//       ...sample,
//       position: numericPosition,
//       availability: "yes",
//       returned_at: new Date(),
//       returned_log: [
//         ...(sample.returned_log || []),
//         {
//           returned_by,
//           purpose: return_purpose,
//           returned_at: new Date()
//         }
//       ]
//     };

//     delete restoredSample._id;

//     const insertResult = await samplesCollection.insertOne(restoredSample);
//     if (!insertResult.insertedId) {
//       console.log('insertion failed');
//       return res.status(500).json({ success: false, message: "Insert failed" });
//     }

//     // 🗑️ Step 3: Remove from takenSamples
//     const deletion = await takenSamplesCollection.deleteOne({ _id: new ObjectId(sampleId) });
//     if(deletion.deletedCount>0){
//       res.status(200).json({
//         success: true,
//         message: `Sample kept back at position ${numericPosition} on shelf ${shelf} - division ${division}`,
//       });
//     } else{
//       console.log('deletion failed');
//       res.send({success: false, message: "sample deletion failed"})
//     }

//   } catch (err) {
//     console.error("Error in putBackSample:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
// In routes/samples.js---------old controller
// exports.takeSample = async (req, res) => {
//   console.log('hit take sample');
//   try {
//     const sampleId = req.params.id;
//     const { taken_by, purpose } = req.body;
//     if (!taken_by || !purpose) {
//       return res.status(400).json({ success: false, message: "Missing taken_by or purpose" });
//     }

//     const timestamp = new Date();

//     // Fetch the sample
//     const sample = await samplesCollection.findOne({ _id: new ObjectId(sampleId) });
//     if (!sample) {
//       return res.status(404).json({ success: false, message: "Sample not found" });
//     }

//     // Prepare new fields
//     const logEntry = {
//       taken_by,
//       purpose,
//       taken_at: timestamp
//     };

//     const updatedSample = {
//       ...sample,
//       last_taken_by: taken_by,
//       last_taken_at: timestamp,
//       availability: "no",
//       taken_logs: [...(sample.taken_logs || []), logEntry]
//     };

//     // Move to takenSamples collection
//     const insertResult = await takenSamplesCollection.insertOne(updatedSample);
//     if (!insertResult.insertedId) {
//       return res.status(500).json({ success: false, message: "Failed to archive the sample" });
//     }

//     // Step 2: Adjust position of samples below in the same shelf/division
//     const positionUpdate = await samplesCollection.updateMany(
//       {
//         shelf: sample.shelf,
//         division: sample.division,
//         position: { $gt: sample.position }
//       },
//       { $inc: { position: -1 } }
//     );
//     if (positionUpdate.modifiedCount > 0) {
//       console.log('positions updated');
//     }


//     // Delete from active samples collection
//     const deleteResult = await samplesCollection.deleteOne({ _id: new ObjectId(sampleId) });
//     if (deleteResult.deletedCount === 0) {
//       return res.status(500).json({ success: false, message: "Archived the sample but Failed to delete original sample" });
//     }
//     console.log("sampleId", sampleId);
//     return res.status(200).json({
//       success: true,
//       message: `${sample.status} Sample of ${sample.style} ${sample.category}, is taken for "${purpose}"`,
//       taken_by,
//       taken_at: timestamp,
//       purpose
//     });

//   } catch (err) {
//     console.error("Error in /take:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// Controller: takeSample.js
exports.takeSample = async (req, res) => {
  console.log('hit take sample');
  try {
    const sampleId = req.params.id; // Original _id from samplesCollection
    const { taken_by, purpose } = req.body;
    if (!taken_by || !purpose) {
      return res.status(400).json({ success: false, message: "Missing taken_by or purpose" });
    }

    const timestamp = new Date();

    // Step 1: Fetch the sample from samplesCollection
    const sample = await samplesCollection.findOne({ _id: new ObjectId(sampleId) });
    if (!sample) {
      return res.status(404).json({ success: false, message: "Sample not found in samplesCollection" });
    }

    // Prepare log entry and update sample data for taken state
    const logEntry = {
      taken_by,
      purpose,
      taken_at: timestamp
    };

    // Remove the original _id before inserting into takenSamplesCollection
    const { _id, ...restOfSample } = sample;

    const updatedSampleForTaken = {
      ...restOfSample, // This will not include the original _id
      last_taken_by: taken_by,
      last_taken_at: timestamp,
      availability: "no",
      // Ensure taken_logs is an array, then append
      taken_logs: [...(sample.taken_logs || []), logEntry],
      // (Optional but Recommended) Store the original_sample_id for traceability
      original_sample_id: new ObjectId(sampleId)
    };

    // Step 2: Insert into takenSamples collection (this will generate a NEW _id)
    const insertResult = await takenSamplesCollection.insertOne(updatedSampleForTaken);
    if (!insertResult.insertedId) {
      return res.status(500).json({ success: false, message: "Failed to archive the sample" });
    }
    const newTakenSampleId = insertResult.insertedId; // Get the newly generated _id

    // Step 3: Adjust position of samples below in the same shelf/division
    await samplesCollection.updateMany(
      {
        shelf: sample.shelf,
        division: sample.division,
        position: { $gt: sample.position }
      },
      { $inc: { position: -1 } }
    );
    // console.log('positions updated after take'); // Keep or remove console log

    // Step 4: Delete the original sample from active samples collection
    const deleteResult = await samplesCollection.deleteOne({ _id: new ObjectId(sampleId) });
    if (deleteResult.deletedCount === 0) {
      // This indicates a problem: sample was inserted into taken but not deleted from main
      return res.status(500).json({ success: false, message: "Archived the sample but failed to delete original sample" });
    }

    return res.status(200).json({
      success: true,
      message: `${sample.status} Sample of ${sample.style} ${sample.category}, is taken for "${purpose}"`,
      taken_by,
      taken_at: timestamp,
      purpose,
      new_sample_id: newTakenSampleId // *** CRITICAL: Return the new ID ***
    });

  } catch (err) {
    console.error("Error in /take:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Controller: putBackSample.js
exports.putBackSample = async (req, res) => {
  console.log('hit putback');
  try {
    const sampleId = req.params.id; // This is the _id from takenSamplesCollection
    const { position, returned_by, return_purpose } = req.body; // Added return_purpose

    const numericPosition = Number(position);
    if (isNaN(numericPosition) || numericPosition < 1) { // Use isNaN for robustness
      return res.status(400).json({ success: false, message: "Invalid position" });
    }

    // Step 1: Find the sample in takenSamplesCollection using its current _id
    const sample = await takenSamplesCollection.findOne({ _id: new ObjectId(sampleId) });
    if (!sample) {
      return res.status(404).json({ success: false, message: "Sample not found in takenSamples" });
    }

    const { shelf, division } = sample; // Get shelf and division from the taken sample

    // Step 2: Delete from takenSamplesCollection first
    const deletionResult = await takenSamplesCollection.deleteOne({ _id: new ObjectId(sampleId) });
    if (deletionResult.deletedCount === 0) {
      return res.status(500).json({ success: false, message: "Failed to delete sample from takenSamples (might have already been returned)" });
    }

    // Step 3: Shift positions in samplesCollection for existing samples
    await samplesCollection.updateMany(
      { shelf, division, position: { $gte: numericPosition } },
      { $inc: { position: 1 } }
    );

    // Step 4: Prepare and insert back into samplesCollection (this will generate a NEW _id)
    // Exclude the current _id and original_sample_id (if present) from insertion to get a new _id
    const { _id, original_sample_id, ...restOfSample } = sample;

    const restoredSample = {
      ...restOfSample, // This will not include the current _id from takenSamples
      position: numericPosition,
      availability: "yes",
      returned_at: new Date(),
      returned_log: [
        ...(sample.returned_log || []),
        {
          returned_by,
          purpose: return_purpose, // Use the purpose provided in the request
          returned_at: new Date()
        }
      ],
      // Optionally unset last_taken_by, last_taken_at if the sample is fully "returned"
      last_taken_by: null,
      last_taken_at: null,
      // If you stored an original_sample_id in the taken sample, you might want to put it here too
      // (This will be the original ID from before it was ever taken, if it existed)
      ...(original_sample_id && { original_sample_id: original_sample_id })
    };

    const insertResult = await samplesCollection.insertOne(restoredSample);
    if (!insertResult.insertedId) {
      console.log('insertion failed for put back');
      return res.status(500).json({ success: false, message: "Insert failed" });
    }
    const newPutBackSampleId = insertResult.insertedId; // Get the newly generated _id

    return res.status(200).json({
      success: true,
      message: `Sample kept back at position ${numericPosition} on shelf ${shelf} - division ${division}`,
      new_sample_id: newPutBackSampleId // *** CRITICAL: Return the new ID ***
    });

  } catch (err) {
    console.error("Error in putBackSample:", err);
    res.status(500).json({ success: false, message: "Server error" });
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

// GET /api/samples/unique?fields=category
// Returns unique values of one field.

// GET /api/samples/unique?fields=category,buyer
// Returns unique combinations of multiple fields.

exports.getUniqueFieldValues = async (req, res) => {
  console.log('hit unique fvalues');
  const { fields } = req.query;

  if (!fields) {
    return res.status(400).json({ success: false, message: "fields query parameter is required" });
  }

  const fieldArray = fields.split(",").map(f => f.trim());

  try {
    if (fieldArray.length === 1) {
      // Single field: use distinct
      const values = await samplesCollection.distinct(fieldArray[0]);
      return res.status(200).json({ success: true, field: fieldArray[0], values });
    } else {
      // Multiple fields: use aggregation
      const pipeline = [
        {
          $group: {
            _id: fieldArray.reduce((acc, field) => {
              acc[field] = `$${field}`;
              return acc;
            }, {}),
          },
        },
        {
          $project: {
            _id: 0,
            ...fieldArray.reduce((acc, field) => {
              acc[field] = `$_id.${field}`;
              return acc;
            }, {}),
          },
        },
      ];

      const values = await samplesCollection.aggregate(pipeline).toArray();

      return res.status(200).json({ success: true, fields: fieldArray, combinations: values });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


exports.increasePositionsByShelfAndDivision = async (req, res) => {
  let { shelf, division, currentPosition } = req.body;

  // Convert inputs to numbers
  shelf = Number(shelf);
  division = Number(division);
  currentPosition = Number(currentPosition);

  console.log('Decrease positions for Shelf:', shelf, 'Division:', division, 'Above position:', currentPosition);

  if (isNaN(shelf) || isNaN(division) || isNaN(currentPosition)) {
    return res.status(400).json({ message: 'Invalid input types. All must be numbers.' });
  }

  try {
    // Step 1: Normalize DB fields to ensure numeric values
    const cursor = samplesCollection.find({
      $or: [
        { shelf: { $type: "string" } },
        { division: { $type: "string" } },
        { position: { $type: "string" } }
      ]
    });

    for await (const doc of cursor) {
      const numericShelf = parseInt(doc.shelf);
      const numericDivision = parseInt(doc.division);
      const numericPosition = parseInt(doc.position);

      const update = {};
      if (!isNaN(numericShelf)) update.shelf = numericShelf;
      if (!isNaN(numericDivision)) update.division = numericDivision;
      if (!isNaN(numericPosition)) update.position = numericPosition;

      if (Object.keys(update).length > 0) {
        await samplesCollection.updateOne({ _id: doc._id }, { $set: update });
      }
    }

    // Step 2: Perform the actual position update
    const query = {
      shelf: shelf,
      division: division,
      position: { $gt: currentPosition }
    };

    const preview = await samplesCollection.find(query).toArray();
    console.log(`Found ${preview.length} document(s) to update.`);

    const result = await samplesCollection.updateMany(query, {
      $inc: { position: 1 }
    });

    if (result.modifiedCount > 0) {
      return res.json({
        message: 'Positions decreased successfully',
        modifiedCount: result.modifiedCount
      });
    } else {
      return res.json({
        message: 'No positions were updated — no matching documents'
      });
    }

  } catch (err) {
    console.error('Error while decreasing positions:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

exports.decreasePositionsByShelfAndDivision = async (req, res) => {
  let { shelf, division, currentPosition } = req.body;

  // Convert inputs to numbers
  shelf = Number(shelf);
  division = Number(division);
  currentPosition = Number(currentPosition);

  console.log('Decrease positions for Shelf:', shelf, 'Division:', division, 'Above position:', currentPosition);

  if (isNaN(shelf) || isNaN(division) || isNaN(currentPosition)) {
    return res.status(400).json({ message: 'Invalid input types. All must be numbers.' });
  }

  try {
    // Step 1: Normalize DB fields to ensure numeric values
    const cursor = samplesCollection.find({
      $or: [
        { shelf: { $type: "string" } },
        { division: { $type: "string" } },
        { position: { $type: "string" } }
      ]
    });

    for await (const doc of cursor) {
      const numericShelf = parseInt(doc.shelf);
      const numericDivision = parseInt(doc.division);
      const numericPosition = parseInt(doc.position);

      const update = {};
      if (!isNaN(numericShelf)) update.shelf = numericShelf;
      if (!isNaN(numericDivision)) update.division = numericDivision;
      if (!isNaN(numericPosition)) update.position = numericPosition;

      if (Object.keys(update).length > 0) {
        await samplesCollection.updateOne({ _id: doc._id }, { $set: update });
      }
    }

    // Step 2: Perform the actual position update
    const query = {
      shelf: shelf,
      division: division,
      position: { $gt: currentPosition }
    };

    const preview = await samplesCollection.find(query).toArray();
    console.log(`Found ${preview.length} document(s) to update.`);

    const result = await samplesCollection.updateMany(query, {
      $inc: { position: -1 }
    });

    if (result.modifiedCount > 0) {
      return res.json({
        message: 'Positions decreased successfully',
        modifiedCount: result.modifiedCount
      });
    } else {
      return res.json({
        message: 'No positions were updated — no matching documents'
      });
    }

  } catch (err) {
    console.error('Error while decreasing positions:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const normalizeFieldsToNumbers = require('../utils/nomalizeFieldsToNumbers');

exports.normalizePositions = async (req, res) => {
  let { shelf, division } = req.body;
console.log('hit normalize positions');
  // Convert inputs to numbers
  shelf = parseInt(shelf);
  division = parseInt(division);

  if (isNaN(shelf) || isNaN(division)) {
    return res.status(400).json({ message: 'Invalid input types. Shelf and division must be numbers.' });
  }

  try {
    // ✅ Step 1: Normalize all shelf, division, and position fields to numbers
    const updatedCount = await normalizeFieldsToNumbers(samplesCollection);

    // ✅ Step 2: Fetch normalized and sorted documents for given shelf & division
    const docs = await samplesCollection.find({ shelf, division })
      .sort({ position: 1, _id: 1 })
      .toArray();

    // ✅ Step 3: Prepare bulk renumbering updates
    const bulkOps = docs.map((doc, index) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { position: index + 1 } }
      }
    }));

    if (bulkOps.length > 0) {
      const result = await samplesCollection.bulkWrite(bulkOps);
      res.json({
        success: true,
        message: 'Positions normalized successfully',
        normalizedFieldsUpdated: updatedCount?.updatedCount,
        positionsRenumbered: result.modifiedCount
      });
    } else {
      res.json({
        message: 'No matching documents found to normalize',
        normalizedFieldsUpdated: updatedCount?.updatedCount
      });
    }

  } catch (err) {
    console.error('Normalize Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
