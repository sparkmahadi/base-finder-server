const { db } = require("../../db");
const { ObjectId } = require("mongodb");
const { getUserTeam } = require("../../utils/teamUtils");
// const normalizeFieldsToNumbers = require("../../utils/nomalizeFieldsToNumbers");

const sampleCategoriesCollection = db.collection("sample-categories");
const samplesCollection = db.collection("samples");
const teamsCollection = db.collection("teams");
const utilitiesCollection = db.collection("utilities");

// Get all SampleCategories
module.exports.getSampleCategories = async (req, res) => {
  const user = req.user;
  const { success, team, buyersList, message } = await getUserTeam(user);
  if (!success) {
    return res.status(404).json({ success: false, message });
  }
  console.log('GET /SampleCategories by', user.username, 'team', team.team_name);
  try {
    const result = await sampleCategoriesCollection.find({ user_team: team.team_name }).toArray();
    res.status(200).json({
      success: true,
      message: `${result.length} Sample Categories found`,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching Sample Categories:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  console.log('attempt delete category');
  try {
    const result = await sampleCategoriesCollection.deleteOne({ _id: new ObjectId(id) });
    console.log(result);
    if (result.deletedCount > 0) {
      res.send({ success: true, message: 'Category deleted successfully' });
    } else {
      res.send({ success: false, message: "Category not found" });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error deleting category', error });
  }
};

module.exports.postCategory = async (req, res) => {
  console.log('hit post category with data', req.body);
  const { value, createdBy } = req.body;
  console.log(value, createdBy);

  if (!value || !createdBy) {
    console.log('entered error');
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const user = req.user;
  const { success, team, buyersList, message } = await getUserTeam(user);
  if (!success) {
    return res.status(404).json({ success: false, message });
  }

  const user_team = team.team_name;


  try {
    // Check for existing category with same value and buyer_name
    const existingCategory = await sampleCategoriesCollection.findOne({
      value: value.trim(), user_team
    });
    if (existingCategory) {
      return res.send({
        success: false,
        redirect: true,
        message: 'A category with the same name and buyer already exists',
      });
    }

    // If no duplicate, insert new category
    const newCategory = { value, user_team, createdBy, createdAt: new Date() };
    const result = await sampleCategoriesCollection.insertOne(newCategory);
    console.log(result);
    if (result.acknowledged) {
      return res.status(201).json({
        success: true,
        message: 'Added Sample Category Successfully!!!',
      });
    } else {
      return res.status(500).json({ success: false, message: 'Insertion failed' });
    }
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ success: false, message: 'Server error', error });
  }
}

// Controller for creating a new Buyer
module.exports.postBuyer = async (req, res) => {
  console.log("post buyer");
  const user = req.user;
  if (user.role !== "admin") {
    return res.json({ success: false, message: "Sorry, You're not eligible to add buyer" })
  }
  const { value, createdBy } = req.body; // Destructure 'createdBy' from req.body
  console.log(value, createdBy);
  if (!value || value.trim() === '') {
    return res.status(400).json({ success: false, message: 'Buyer name is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.status(400).json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingBuyer = await utilitiesCollection.findOne({
      utility_type: 'buyer', // Renamed from 'type'
      value: value.trim(),    // Renamed from 'name'
    });

    if (existingBuyer) {
      return res.send({
        success: false,
        redirect: true,
        message: 'A buyer with this name already exists',
      });
    }

    const newBuyer = {
      utility_type: 'buyer',
      value: value.trim(),
      createdBy: createdBy.trim(), // Assign createdBy
      createdAt: new Date()
    };
    const result = await utilitiesCollection.insertOne(newBuyer);

    if (result.acknowledged) {
      return res.status(201).json({
        success: true,
        message: 'Buyer added successfully!',
      });
    } else {
      return res.status(500).json({ success: false, message: 'Insertion failed' });
    }
  } catch (error) {
    console.error('Error creating buyer:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports.postFabrication = async (req, res) => {
  console.log("post fabrication");
  const user = req.user;

  const { value, createdBy } = req.body; // Destructure 'createdBy' from req.body
  console.log(value, createdBy);
  if (!value || value.trim() === '') {
    return res.json({ success: false, message: 'Fabrication name is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingFabrication = await utilitiesCollection.findOne({
      utility_type: 'fabric', // Renamed from 'type'
      value: value.trim(),    // Renamed from 'name'
    });

    if (existingFabrication) {
      return res.send({
        success: false,
        redirect: true,
        message: 'A Fabrication with this name already exists',
      });
    }

    const newFabrication = {
      utility_type: 'fabric',
      value: value.trim(),
      createdBy: createdBy.trim(), // Assign createdBy
      createdAt: new Date()
    };
    const result = await utilitiesCollection.insertOne(newFabrication);

    if (result.acknowledged) {
      return res.status(201).json({
        success: true,
        message: 'Fabrication added successfully!',
      });
    } else {
      return res.json({ success: false, message: 'Insertion failed' });
    }
  } catch (error) {
    console.error('Error creating Fabrication:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller for creating a new season
module.exports.postSeason = async (req, res) => {
  console.log("post season");
  const { value, createdBy } = req.body; // Destructure 'createdBy' from req.body
  console.log(value, createdBy);
  if (!value || value.trim() === '') {
    return res.status(400).json({ success: false, message: 'Season name is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.status(400).json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingBuyer = await utilitiesCollection.findOne({
      utility_type: 'season', // Renamed from 'type'
      value: value.trim(),    // Renamed from 'name'
    });

    if (existingBuyer) {
      return res.send({
        success: false,
        redirect: true,
        message: 'A season with this name already exists',
      });
    }

    const newSeason = {
      utility_type: 'season',
      value: value.trim(),
      createdBy: createdBy.trim(), // Assign createdBy
      createdAt: new Date()
    };
    const result = await utilitiesCollection.insertOne(newSeason);

    if (result.acknowledged) {
      return res.status(201).json({
        success: true,
        message: 'Season added successfully!',
      });
    } else {
      return res.status(500).json({ success: false, message: 'Insertion failed' });
    }
  } catch (error) {
    console.error('Error creating season:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller for creating a new Status
module.exports.postStatus = async (req, res) => {
  const { value, createdBy } = req.body; // Destructure 'createdBy' from req.body
  if (!value || value.trim() === '') {
    return res.status(400).json({ success: false, message: 'Status name is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.status(400).json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingStatus = await utilitiesCollection.findOne({
      utility_type: 'status', // Renamed from 'type'
      value: value.trim(),    // Renamed from 'name'
    });

    if (existingStatus) {
      return res.send({
        success: false,
        redirect: true,
        message: 'A status with this name already exists',
      });
    }

    const newStatus = {
      utility_type: 'status',
      value: value.trim(),
      createdBy: createdBy.trim(), // Assign createdBy
      createdAt: new Date()
    };
    const result = await utilitiesCollection.insertOne(newStatus);

    if (result.acknowledged) {
      return res.status(201).json({
        success: true,
        message: 'Status added successfully!',
      });
    } else {
      return res.status(500).json({ success: false, message: 'Insertion failed' });
    }
  } catch (error) {
    console.error('Error creating status:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller for creating a new Shelf
module.exports.postShelf = async (req, res) => {
  const { value, createdBy } = req.body; // Destructure 'createdBy' from req.body

  if (!value || String(value).trim() === '') {
    return res.status(400).json({ success: false, message: 'Shelf number is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.status(400).json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingShelf = await utilitiesCollection.findOne({
      utility_type: 'shelf', // Renamed from 'type'
      value: String(value).trim(), // Renamed from 'number'
    });

    if (existingShelf) {
      return res.send({
        success: false,
        redirect: true,
        message: 'A shelf with this number already exists',
      });
    }

    const newShelf = {
      utility_type: 'shelf',
      value: String(value).trim(),
      createdBy: createdBy.trim(), // Assign createdBy
      createdAt: new Date()
    };
    const result = await utilitiesCollection.insertOne(newShelf);

    if (result.acknowledged) {
      return res.status(201).json({
        success: true,
        message: 'Shelf added successfully!',
      });
    } else {
      return res.status(500).json({ success: false, message: 'Insertion failed' });
    }
  } catch (error) {
    console.error('Error creating shelf:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller for creating a new Division
module.exports.postDivision = async (req, res) => {
  const { value, createdBy } = req.body; // Destructure 'createdBy' from req.body

  if (!value || String(value).trim() === '') {
    return res.status(400).json({ success: false, message: 'Division number is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.status(400).json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingDivision = await utilitiesCollection.findOne({
      utility_type: 'division', // Renamed from 'type'
      value: String(value).trim(), // Renamed from 'number'
    });

    if (existingDivision) {
      return res.send({
        success: false,
        redirect: true,
        message: 'A division with this number already exists',
      });
    }

    const newDivision = {
      utility_type: 'division',
      value: String(value).trim(),
      createdBy: createdBy.trim(), // Assign createdBy
      createdAt: new Date()
    };
    const result = await utilitiesCollection.insertOne(newDivision);

    if (result.acknowledged) {
      return res.status(201).json({
        success: true,
        message: 'Division added successfully!',
      });
    } else {
      return res.status(500).json({ success: false, message: 'Insertion failed' });
    }
  } catch (error) {
    console.error('Error creating division:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller to get all Buyers
module.exports.getBuyers = async (req, res) => {
  const user = req.user;
  const userId = req.user?._id || req.user?.id;
  const userRole = req.user?.role;
  console.log('get buyers by user', userId, 'role', userRole);
  try {

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User not found in request' });
    }

    if (userRole === 'superuser' || "admin") {
      // Admin: return all buyers
      const buyers = await utilitiesCollection.find({ utility_type: 'buyer' }).toArray();

      if (buyers.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'All buyers retrieved successfully (admin access)!',
          data: buyers,
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'No buyers found.',
          data: [],
        });
      }
    }



    // Non-admin: find the team that the user belongs to

    const { success, team, buyersList, message } = await getUserTeam(user);

    if (!success) {
      return res.status(404).json({ success: false, message });
    }


    if (!team || !team.buyers || team.buyers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No buyers assigned to your team.',
        data: [],
      });
    }

    // Return buyers filtered by team's buyer list
    // const buyers = await utilitiesCollection
    //   .find({ utility_type: 'buyer', value: { $in: team.buyers } })
    //   .toArray();

    const buyers = await utilitiesCollection.find({
      utility_type: "buyer",
      $or: [
        {
          // Case 1: Match team buyers when user_team exists
          value: { $in: team.buyers }
        },
        {
          // Case 2: Include buyers with no user_team or null user_team
          $or: [
            { user_team: null },
            { user_team: { $exists: false } }
          ]
        }
      ]
    }).toArray();


    console.log("buyers", buyers)


    if (buyers.length > 0) {
      return res.status(200).json({
        success: true,
        message: `Buyers retrieved successfully for team ${team.team_name}!`,
        data: buyers,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No matching buyers found for your team.',
        data: [],
      });
    }
  } catch (error) {
    console.error('Error fetching buyers:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller to get all Buyers
module.exports.getSeasons = async (req, res) => {
  const user = req.user;
  const userId = req.user?._id || req.user?.id;
  const userRole = req.user?.role;
  console.log('get buyers by user', userId, 'role', userRole);
  try {

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User not found in request' });
    }

    if (userRole === 'superuser') {
      // Admin: return all buyers
      const buyers = await utilitiesCollection.find({ utility_type: 'season' }).toArray();

      if (buyers.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'All buyers retrieved successfully (admin access)!',
          data: buyers,
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'No buyers found.',
          data: [],
        });
      }
    }



    // Non-admin: find the team that the user belongs to

    const { success, team, buyersList, message } = await getUserTeam(user);

    if (!success) {
      return res.status(404).json({ success: false, message });
    }


    if (!team || !team.buyers || team.buyers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No buyers assigned to your team.',
        data: [],
      });
    }

    // Return buyers filtered by team's buyer list
    // const buyers = await utilitiesCollection
    //   .find({ utility_type: 'buyer', value: { $in: team.buyers } })
    //   .toArray();

    const seasons = await utilitiesCollection.find({
      utility_type: "season",
      $or: [
        {
          // Case 1: Match team buyers when user_team exists
          value: { $in: team.buyers }
        },
        {
          // Case 2: Include buyers with no user_team or null user_team
          $or: [
            { user_team: null },
            { user_team: { $exists: false } }
          ]
        }
      ]
    }).toArray();


    // console.log("seasons", seasons)


    if (seasons.length > 0) {
      return res.status(200).json({
        success: true,
        message: `seasons retrieved successfully for team ${team.team_name}!`,
        data: seasons,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No matching seasons found for your team.',
        data: [],
      });
    }
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// Controller to get all Statuses
module.exports.getStatuses = async (req, res) => {
  try {
    const statuses = await utilitiesCollection.find({ utility_type: 'status' }).toArray();
    if (statuses.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Statuses retrieved successfully!',
        data: statuses,
      });
    } else {
      return res.status(405).json({
        success: false,
        message: 'No statuses found.',
        data: [],
      });
    }
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller to get all Shelves
module.exports.getShelves = async (req, res) => {
  console.log('hit getshelves');
  try {
    const shelves = await utilitiesCollection.find({ utility_type: 'shelf' }).toArray();
    if (shelves.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Shelves retrieved successfully!',
        data: shelves,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No shelves found.',
        data: [],
      });
    }
  } catch (error) {
    console.error('Error fetching shelves:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller to get all Divisions
module.exports.getDivisions = async (req, res) => {
  console.log("hit get divisions")
  try {
    const divisions = await utilitiesCollection.find({ utility_type: 'division' }).toArray();
    if (divisions.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Divisions retrieved successfully!',
        data: divisions,
      });
    } else {
      return res.json({
        success: false,
        message: 'No divisions found.',
        data: [],
      });
    }
  } catch (error) {
    console.error('Error fetching divisions:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports.getFabrications = async (req, res) => {
  const user = req.user;
  const userId = req.user?._id || req.user?.id;
  const userRole = req.user?.role;
  console.log('get fabrics by user', userId, 'role', userRole);
  try {

    if (!userId) {
      return res.json({ success: false, message: 'Unauthorized: User not found in request' });
    }

    if (userRole === 'superuser') {
      // Admin: return all buyers
      const fabrics = await utilitiesCollection.find({ utility_type: 'fabric' }).toArray();

      if (fabrics.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'All fabrics retrieved successfully (admin access)!',
          data: fabrics,
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'No fabrics found.',
          data: [],
        });
      }
    }

    // Non-admin: find the team that the user belongs to
    const { success, team, buyersList, message } = await getUserTeam(user);

    if (!success) {
      return res.status(404).json({ success: false, message });
    }


    if (!team || !team.buyers || team.buyers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No buyers assigned to your team.',
        data: [],
      });
    }

    // Return buyers filtered by team's buyer list
    // const buyers = await utilitiesCollection
    //   .find({ utility_type: 'buyer', value: { $in: team.buyers } })
    //   .toArray();

    const fabrics = await utilitiesCollection.find({
      utility_type: "fabric",
      $or: [
        {
          // Case 1: Match team buyers when user_team exists
          value: { $in: team.buyers }
        },
        {
          // Case 2: Include buyers with no user_team or null user_team
          $or: [
            { user_team: null },
            { user_team: { $exists: false } }
          ]
        }
      ]
    }).toArray();


    console.log("fabrics", fabrics)


    if (fabrics.length > 0) {
      return res.status(200).json({
        success: true,
        message: `fabrics retrieved successfully for team ${team.team_name}!`,
        data: fabrics,
      });
    } else {
      return res.json({
        success: false,
        message: 'No matching fabrics found for your team.',
        data: [],
      });
    }
  } catch (error) {
    console.error('Error fetching fabrics:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// Controller to update an existing Category
module.exports.updateCategory = async (req, res) => {
  console.log('update category');
  const { _id, value, status, totalSamples, createdBy } = req.body;

  if (!_id || !value || !status || totalSamples === undefined || !createdBy) {
    return res.status(400).json({ success: false, message: 'Missing required fields for update' });
  }

  try {
    const objectId = new ObjectId(_id); // Convert string ID to ObjectId

    const result = await sampleCategoriesCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          value: value.trim(),
          status: status.trim(),
          totalSamples: Number(totalSamples),
          createdBy: createdBy.trim(),
          updatedAt: new Date() // Add an updatedAt timestamp
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (result.modifiedCount === 0) {
      return res.status(200).json({ success: true, message: 'No changes detected for category' });
    }

    return res.status(200).json({ success: true, message: 'Category updated successfully!' });
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.name === 'BSONError') { // Catch invalid ObjectId format
      return res.status(400).json({ success: false, message: 'Invalid Category ID format' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller to update an existing Utility (Buyer, Status, Shelf, Division)
module.exports.updateUtility = async (req, res) => {
  console.log("update utility");
  const { _id, utility_type, value, createdBy } = req.body;
  console.log(_id, utility_type, value, createdBy);
  if (!_id || !utility_type || !value || !createdBy) {
    return res.status(400).json({ success: false, message: 'Missing required fields for update' });
  }

  try {
    const objectId = new ObjectId(_id); // Convert string ID to ObjectId

    const result = await utilitiesCollection.updateOne(
      { _id: objectId, utility_type: utility_type.trim() }, // Ensure type matches too
      {
        $set: {
          value: value.trim(),
          createdBy: createdBy.trim(),
          updatedAt: new Date() // Add an updatedAt timestamp
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: `${utility_type} not found or type mismatch` });
    }
    if (result.modifiedCount === 0) {
      return res.status(200).json({ success: true, message: `No changes detected for ${utility_type}` });
    }

    return res.status(200).json({ success: true, message: `${utility_type} updated successfully!` });
  } catch (error) {
    console.error('Error updating utility:', error);
    if (error.name === 'BSONError') { // Catch invalid ObjectId format
      return res.status(400).json({ success: false, message: 'Invalid Utility ID format' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// --- DELETE Controllers ---

// Controller to delete an existing Category
module.exports.deleteCategory = async (req, res) => {
  const { id } = req.params; // Expect ID in URL params

  if (!id) {
    return res.status(400).json({ success: false, message: 'Category ID is required for deletion' });
  }

  try {
    const objectId = new ObjectId(id); // Convert string ID to ObjectId
    const result = await sampleCategoriesCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    return res.status(200).json({ success: true, message: 'Category deleted successfully!' });
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error.name === 'BSONError') {
      return res.status(400).json({ success: false, message: 'Invalid Category ID format' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Controller to delete an existing Utility (Buyer, Status, Shelf, Division)
module.exports.deleteUtility = async (req, res) => {
  console.log('hit delete utility');
  const { id, type } = req.params; // Expect ID and type in URL params
  console.log(id, type);
  if (!id || !type) {
    return res.status(400).json({ success: false, message: 'Utility ID and type are required for deletion' });
  }

  try {
    const objectId = new ObjectId(id); // Convert string ID to ObjectId
    console.log(objectId);
    const result = await utilitiesCollection.deleteOne({ _id: objectId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: `${type} not found or type mismatch` });
    }

    return res.status(200).json({ success: true, message: `${type} deleted successfully!` });
  } catch (error) {
    console.error('Error deleting utility:', error);
    if (error.name === 'BSONError') {
      return res.status(400).json({ success: false, message: 'Invalid Utility ID format' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.convertFieldsToNumbers = async (req, res) => {
  console.log('hit convert positions');

  try {
    // ✅ Step 1: Normalize all shelf, division, and position fields to numbers
    let updatedCount = 0;

    const cursor = samplesCollection.find({});

    for await (const doc of cursor) {
      const update = {};
      const numericShelf = parseInt(doc.shelf);
      const numericDivision = parseInt(doc.division);
      const numericPosition = parseInt(doc.position);

      if (!isNaN(numericShelf)) update.shelf = numericShelf;
      if (!isNaN(numericDivision)) update.division = numericDivision;
      if (!isNaN(numericPosition)) update.position = numericPosition;

      if (Object.keys(update).length > 0) {
        const result = await samplesCollection.updateOne({ _id: doc._id }, { $set: update });
        if (result.modifiedCount) {
          updatedCount++;
        }
        // console.log(result, updatedCount);
      }
    }

    if (updatedCount > 0) {
      res.json({
        success: true,
        message: `${updatedCount} Fields converted successfully`,
      });
    } else {
      res.json({
        message: 'No matching documents found to convert',
      });
    }

  } catch (err) {
    console.error('convertion Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
