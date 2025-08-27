const { db } = require("../../db");
const { ObjectId } = require("mongodb");

// Collection References
const teamsCollection = db.collection("teams");

// CREATE - add a new team
exports.createTeam = async (req, res) => {
  try {
    const { team_name, buyers, members } = req.body;

    if (!team_name || !Array.isArray(buyers) || !Array.isArray(members)) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const newTeam = {
      team_name,
      buyers,
      members,
      created_at: new Date(),
    };

    const result = await teamsCollection.insertOne(newTeam);

    res.status(201).json({
      success: true,
      message: 'Team created',
      data: { _id: result.insertedId, ...newTeam },
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// READ - get all teams
exports.getAllTeams = async (req, res) => {
  console.log('get all teams');
  try {
    const teams = await teamsCollection.find().toArray();
    res.status(200).json({ success: true, data: teams });
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// READ - get one team by id
exports.getTeamById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const team = await teamsCollection.findOne({ _id: new ObjectId(id) });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    res.status(200).json({ success: true, data: team });
  } catch (error) {
    console.error('Get team by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// UPDATE - update a team by id
exports.updateTeam = async (req, res) => {
  try {
    const id = req.params.id;
    const updateFields = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    // Optional: validate updateFields as needed

    const result = await teamsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    res.status(200).json({ success: true, message: 'Team updated' });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE - delete a team by id
exports.deleteTeam = async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const result = await teamsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    res.status(200).json({ success: true, message: 'Team deleted' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
