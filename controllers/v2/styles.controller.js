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

exports.updateStyle = async (req, res) => {
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

    // 1. Logic for pushing to 'sampling' and 'prod' arrays
    if (sampling || prod) {
      updateOperations.$push = {};

      if (sampling) {
        const { date, pattern_id } = sampling;
        if (date && pattern_id) {
          updateOperations.$push.sampling = {
            pp: date,
            pattern_id: pattern_id,
          };
        }
      }

      if (prod) {
        const { pro, pro_sc } = prod;
        if (pro || pro_sc) {
          const newProdData = {};
          if (pro) newProdData.pro = pro;
          if (pro_sc) newProdData.pro_sc = pro_sc;
          updateOperations.$push.prod = newProdData;
        }
      }

      // If no valid data for $push, remove the operator
      if (Object.keys(updateOperations.$push).length === 0) {
        delete updateOperations.$push;
      }
    }

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

exports.updateStyleSampling = async (req, res) => {
  console.log('Received sampling data for update:', req.body);
  try {
    const styleId = req.params.id;
    // Destructure all necessary fields from the request body
    const { status, date, pattern_id } = req.body;

    // Basic validation for the style ID
    if (!styleId) {
      return res.status(400).json({ success: false, message: 'Style ID is missing.' });
    }
    if (!ObjectId.isValid(styleId)) {
      return res.status(400).json({ success: false, message: 'Invalid Style ID format.' });
    }

    // Validate that the required fields for the new sampling item are present
    if (!status || !date || !pattern_id) {
      return res.status(400).json({ success: false, message: 'Missing "status", "date", or "pattern_id" in request body.' });
    }

    // Construct the new object to be pushed with a dynamic key using bracket notation
    const newSamplingItem = {
      [status]: date,
      pattern_id: pattern_id,
      comments: req.body.comments, // Include other relevant fields if needed
      added_by: req.body.added_by,
      added_at: req.body.added_at
    };

    const result = await stylesCollection.updateOne(
      { _id: new ObjectId(styleId) },
      { $push: { sampling: newSamplingItem } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Style not found.' });
    }

    return res.status(200).json({ success: true, message: 'Sampling data added successfully.', result });

  } catch (error) {
    console.error('Error updating style:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// DELETE - delete a team by id
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
