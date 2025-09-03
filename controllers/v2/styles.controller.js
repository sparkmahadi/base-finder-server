const { db } = require("../../db");
const { ObjectId } = require("mongodb");

// Collection References
const stylesCollection = db.collection("styles");
const teamsCollection = db.collection("teams");

// CREATE - add a new team
exports.createStyle = async (req, res) => {
  try {
    const formData = req.body;

    // if (!team_name || !Array.isArray(buyers) || !Array.isArray(members)) {
    //   return res.status(400).json({ success: false, message: 'Invalid input' });
    // }

    const newStyle = formData;

    const result = await stylesCollection.insertOne(newStyle);

    res.status(201).json({
      success: true,
      message: 'Style created',
      data: { _id: result.insertedId, ...newStyle },
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// READ - get all teams
exports.getAllStyles = async (req, res) => {
  console.log('get all teams');
  try {
    const styles = await stylesCollection.find().toArray();
    res.status(200).json({ success: true, data: styles });
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Upload JSON Data (from Excel frontend)
exports.uploadStyles = async (req, res) => {
  try {
    const { styles } = req.body; // expecting { styles: [...] }

    if (!styles || !Array.isArray(styles)) {
      return res.status(400).json({ message: "Invalid data format. Expected array." });
    }

    const result = await stylesCollection.insertMany(styles);
    res.status(201).json({
      message: "Styles uploaded successfully",
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error("Error uploading styles:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// READ - get one team by id
exports.getStyleById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const style = await stylesCollection.findOne({ _id: new ObjectId(id) });
    if (!style) {
      return res.status(404).json({ success: false, message: 'style not found' });
    }

    res.status(200).json({ success: true, data: style });
  } catch (error) {
    console.error('Get style by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateBasicStyle = async (req, res) => {
  console.log('Received data for update:', req.body);
  try {
    const styleId = req.params.id;
    const { sampling, prod, ...otherFields } = req.body;

    if (!styleId) {
      return res.status(400).json({ success: false, message: 'Style ID is missing.' });
    }

    if (!ObjectId.isValid(styleId)) {
      return res.status(400).json({ success: false, message: 'Invalid Style ID format.' });
    }

    const updateOperations = {};

    // 2. Logic for updating other basic fields using $set
    const fieldsToSet = {};
    const allowedFields = ['style', 'buyer', 'season', 'descr', 'version', 'fabric', 'status', 'item', 'similar', 'prints'];

    // Iterate over the rest of the body to find fields to update
    for (const key of allowedFields) {
      if (otherFields[key] !== undefined) {
        fieldsToSet[key] = otherFields[key];
      }
    }

    if (Object.keys(fieldsToSet).length > 0) {
      updateOperations.$set = fieldsToSet;
    }

    // Check if there is anything to update at all
    if (Object.keys(updateOperations).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid update data provided.' });
    }

    const result = await stylesCollection.updateOne(
      { _id: new ObjectId(styleId) },
      updateOperations
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Style not found.' });
    }

    return res.status(200).json({ success: true, message: 'Style updated successfully.', result });
  } catch (error) {
    console.error('Error updating style:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};


// exports.updateStyleSampling = async (req, res) => {
//   console.log("Received sampling data for update:", req.body);

//   try {
//     const styleId = req.params.id;
//     const { action, updatedSampling, status, date, pattern_id, ...otherFields } = req.body;

//     // --- Validate styleId ---
//     if (!styleId) {
//       return res.status(400).json({ success: false, message: "Style ID is missing." });
//     }
//     if (!ObjectId.isValid(styleId)) {
//       return res.status(400).json({ success: false, message: "Invalid Style ID format." });
//     }

//     let updateQuery;

//     switch (action) {
//       case "replace":
//         // --- Replace entire sampling array ---
//         if (!Array.isArray(updatedSampling)) {
//           return res.status(400).json({ success: false, message: "Invalid sampling array." });
//         }

//         const replacedArray = updatedSampling.map(item => ({
//           ...item,
//           updated_by: req.body.updated_by,
//           updated_at: req.body.updated_at,
//         }));

//         updateQuery = { $set: { sampling: replacedArray } };
//         break;

//       case "delete":
//         // --- Delete a sampling based on dynamic field (like PP/Test) ---
//         const keyToDelete = Object.keys(otherFields)[0];
//         const valueToDelete = otherFields[keyToDelete];

//         updateQuery = {
//           $pull: { sampling: { [keyToDelete]: valueToDelete } },
//         };
//         break;

//       case "add":
//         // --- Add new sampling item ---
//         if (!status || !date || !pattern_id) {
//           console.log(status, date, pattern_id);
//           return res.status(400).json({
//             success: false,
//             message: 'Missing "status", "date", or "pattern_id" in request body.',
//           });
//         }

//         const newSamplingItem = {
//           [status]: date,
//           pattern_id,
//           comments: req.body.comments,
//           added_by: req.body.added_by,
//           added_at: req.body.added_at,
//         };

//         updateQuery = { $push: { sampling: newSamplingItem } };
//         break;

//       case "edit":
//         // --- Edit an existing sampling ---
//         if (!pattern_id) {
//           return res.status(400).json({ success: false, message: "Missing pattern_id for edit." });
//         }

//         const updateFields = {};
//         if (status && date) updateFields[status] = date;
//         if (req.body.comments) updateFields.comments = req.body.comments;
//         if (req.body.added_by) updateFields.added_by = req.body.added_by;
//         if (req.body.added_at) updateFields.added_at = req.body.added_at;

//         updateQuery = { $set: { "sampling.$": { pattern_id, ...updateFields } } };
//         break;

//       default:
//         return res.status(400).json({ success: false, message: "Invalid action." });
//     }

//     // --- Build filter ---
//     const filter = { _id: new ObjectId(styleId) };
//     if (action === "edit") filter["sampling.pattern_id"] = pattern_id;

//     // --- Execute update ---
//     const result = await stylesCollection.updateOne(filter, updateQuery);

//     if (result.matchedCount === 0) {
//       return res.status(404).json({ success: false, message: "Style or sampling not found." });
//     }

//     // --- Success response ---
//     const messages = {
//       replace: "Sampling array replaced successfully.",
//       delete: "Sampling deleted successfully.",
//       edit: "Sampling updated successfully.",
//       add: "Sampling added successfully.",
//     };

//     return res.status(200).json({
//       success: true,
//       message: messages[action] || "Sampling updated successfully.",
//       result,
//     });

//   } catch (error) {
//     console.error("Error updating style sampling:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error.",
//       error: error.message,
//     });
//   }
// };





// DELETE - delete a team by id

exports.updateStyleSampling = async (req, res) => {
  console.log("Received sampling data for update:", req.body);

  try {
    const styleId = req.params.id;
    const { action, updatedFields, field, status, date, pattern_id, ...otherFields } = req.body;

    // --- Validate styleId ---
    if (!styleId) {
      return res.status(400).json({ success: false, message: "Style ID is missing." });
    }
    if (!ObjectId.isValid(styleId)) {
      return res.status(400).json({ success: false, message: "Invalid Style ID format." });
    }

    let updateQuery;

    switch (action) {
      case "replaceFields":
  if (!updatedFields || typeof updatedFields !== "object") {
    return res.status(400).json({ success: false, message: "Invalid or missing updatedFields object." });
  }

  const currentDoc = await stylesCollection.findOne({ _id: new ObjectId(styleId) });
  const fieldsWithMeta = {};

  for (const key in updatedFields) {
    if (!updatedFields.hasOwnProperty(key)) continue;

    const newValue = updatedFields[key];
    const currentValue = currentDoc[key];

    // If value is an object (like PP)
    if (typeof newValue === "object" && newValue !== null) {
      const updatedNested = {};
      for (const subKey in newValue) {
        if (!newValue.hasOwnProperty(subKey)) continue;

        // Only add updated_by/updated_at to changed subfields
        if (currentValue?.[subKey] !== newValue[subKey]) {
          updatedNested[subKey] = newValue[subKey];
          updatedNested.updated_by = req.body.updated_by;
          updatedNested.updated_at = req.body.updated_at;
        } else {
          updatedNested[subKey] = currentValue[subKey]; // keep original
        }
      }
      fieldsWithMeta[key] = updatedNested;
    } else {
      // primitive field
      if (newValue !== currentValue) {
        fieldsWithMeta[key] = newValue;
        fieldsWithMeta[`${key}_updated_by`] = req.body.updated_by;
        fieldsWithMeta[`${key}_updated_at`] = req.body.updated_at;
      }
    }
  }

  if (Object.keys(fieldsWithMeta).length === 0) {
    return res.status(200).json({ success: true, message: "No changes detected." });
  }

  updateQuery = { $set: fieldsWithMeta };
  break;


      case "deleteField":
        // --- Remove a specific field ---
        if (!field) {
          return res.status(400).json({ success: false, message: "Missing field name to delete." });
        }
        updateQuery = { $unset: { [field]: "" } };
        break;

      case "add":
        if (!status || !date) {
          return res.status(400).json({
            success: false,
            message: 'Missing "status" or "date" in request body.',
          });
        }

        const newSamplingField = {
          [status]: {
            date,
            pattern_id: pattern_id,
            added_by: req.body.added_by || "",
            added_at: req.body.added_at || new Date().toISOString(),
          },
        };

        updateQuery = { $set: newSamplingField };
        break;

      default:
        return res.status(400).json({ success: false, message: "Invalid action." });
    }

    // --- Execute update ---
    const filter = { _id: new ObjectId(styleId) };
    const result = await stylesCollection.updateOne(filter, updateQuery);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Style not found." });
    }

    // --- Success messages ---
    const messages = {
      replaceFields: "Fields updated successfully.",
      deleteField: "Field deleted successfully.",
    };

    return res.status(200).json({
      success: true,
      message: messages[action] || "Update successful.",
      result,
    });
  } catch (error) {
    console.error("Error updating style sampling:", error);
    return res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};


exports.deleteStyle = async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const result = await stylesCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    res.status(200).json({ success: true, message: 'Team deleted' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
