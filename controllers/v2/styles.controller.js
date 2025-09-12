const { db } = require("../../db");
const { ObjectId } = require("mongodb");
const { checkTeamEligibility } = require("../../utils/teamChecker");
const { checkUserVerification } = require("../../utils/userVerificationChecker");

// Collection References
const stylesCollection = db.collection("styles");
const teamsCollection = db.collection("teams");

// CREATE - add a new team
exports.createStyle = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.send("User data not found")
  }
  try {
    const formData = req.body;
    const newStyle = formData;
    newStyle.added_at = new Date();
    newStyle.added_by = user?.username;

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
  console.log('get all styles');
  const user = req.user;

  const verification = await checkUserVerification(user);
  if (!verification.eligible) {
    return res.status(403).json({
      success: false,
      message: verification.message
    });
  }
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
  const user = req.user;
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

    // Add global tracking fields
    const infoTracking = {
      info_updated_by: user?.username || "",
      info_update_at: req.body.updated_at || new Date().toISOString(),
    };

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
      updateOperations.$set = { ...fieldsToSet, ...infoTracking };
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

    // Add global tracking fields
    const samplingTracking = {
      sampling_updated_by: req.body.updated_by || req.body.added_by || "",
      sampling_update_at: req.body.updated_at || req.body.added_at || new Date().toISOString(),
    };


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

        updateQuery = { $set: { ...fieldsWithMeta, ...samplingTracking } };
        break;


      case "deleteField":
        // --- Remove a specific field ---
        if (!field) {
          return res.status(400).json({ success: false, message: "Missing field name to delete." });
        }
        updateQuery = { $unset: { [field]: "" }, $set: { ...samplingTracking } };
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

        updateQuery = { $set: { ...newSamplingField, ...samplingTracking } };
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

/**
 * Controller to manage production records within a style document.
 * This function handles adding, editing, and deleting records from the `productionRecords` array.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.updateStyleByProduction = async (req, res) => {
  console.log("Received production data for update:", req.body);

  try {
    const styleId = req.params.id;
    const { action, ...payload } = req.body;
    const currentUser = "sparkm"; // In a real app, this would come from an authenticated user session (e.g., req.user.username)

    // --- Validate styleId ---
    if (!styleId || !ObjectId.isValid(styleId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing Style ID." });
    }

    let updateQuery;
    let message;

    switch (action) {
      case "add": {
        const { factory_name, factory_code, po_size_range, totalQuantity } = payload;
        if (!factory_name || !totalQuantity) {
          return res.status(400).json({ success: false, message: "Missing required fields for adding a record." });
        }

        const newRecord = {
          factory_name,
          factory_code: factory_code || "",
          po_size_range: po_size_range || "",
          totalQuantity: totalQuantity,
          added_by: currentUser,
          added_at: new Date().toISOString(),
        };

        // Use $push to add a new record to the array
        updateQuery = { $push: { productionRecords: newRecord } };
        message = "Production record added successfully.";
        break;
      }

      case "edit": {
        const { recordToEdit, updatedData } = payload;
        if (!recordToEdit || !updatedData || !recordToEdit.added_by || !recordToEdit.added_at) {
          return res.status(400).json({ success: false, message: "Missing required fields for editing a record." });
        }

        const updatedRecord = {
          ...updatedData,
          added_by: recordToEdit.added_by,
          added_at: recordToEdit.added_at,
          updated_by: currentUser,
          updated_at: new Date().toISOString(),
        };

        // Use $set with arrayFilters to update a specific element in the array
        updateQuery = {
          $set: {
            "productionRecords.$[record]": updatedRecord,
          },
        };
        // Define the filter to find the correct record by its unique added_by and added_at combination
        req.body.arrayFilters = [
          { "record.added_by": recordToEdit.added_by, "record.added_at": recordToEdit.added_at },
        ];
        message = "Production record updated successfully.";
        break;
      }

      case "delete": {
        const { recordToDelete } = payload;
        if (!recordToDelete || !recordToDelete.added_by || !recordToDelete.added_at) {
          return res.status(400).json({ success: false, message: "Missing required fields for deleting a record." });
        }

        // Use $pull to remove a record from the array based on its unique fields
        updateQuery = {
          $pull: {
            productionRecords: {
              added_by: recordToDelete.added_by,
              added_at: recordToDelete.added_at,
            },
          },
        };
        message = "Production record deleted successfully.";
        break;
      }

      default:
        return res.status(400).json({ success: false, message: "Invalid action specified." });
    }

    // --- Execute the update query ---
    const filter = { _id: new ObjectId(styleId) };
    const options = req.body.arrayFilters ? { arrayFilters: req.body.arrayFilters } : {};

    const result = await stylesCollection.updateOne(filter, updateQuery, options);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Style not found." });
    }

    return res.status(200).json({
      success: true,
      message,
      result,
    });
  } catch (error) {
    console.error("Error updating production records:", error);
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
