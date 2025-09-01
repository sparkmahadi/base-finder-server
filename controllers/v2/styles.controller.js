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

// UPDATE - update a team by id
// Update style sampling and production
exports.updateStyle = async (req, res) => {
  try {
    const styleId = req.params.id;
    const { sampling, production } = req.body;

    // Prepare update object
    const updateFields = {};

    if (sampling) {
      // Optionally, if you want to push into an array instead of replace:
      await stylesCollection.updateOne(
        { _id: new ObjectId(styleId) },
        { $push: { samplings: sampling } }
      );
    }

    if (production) {
      updateFields.productions = production;
      // Optionally, push to array:
      await stylesCollection.updateOne(
        { _id: new ObjectId(styleId) },
        { $push: { productions: production } }
      );
    }

    // Update the style document (replace fields)
    const result = await stylesCollection.updateOne(
      { _id: new ObjectId(styleId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Style not found" });
    }

    return res.status(200).json({ message: "Style updated successfully" });
  } catch (error) {
    console.error("Error updating style:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
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
