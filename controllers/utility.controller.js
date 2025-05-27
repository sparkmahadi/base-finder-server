const { db } = require("../db");
const { ObjectId } = require("mongodb");

const sampleCategoriesCollection = db.collection("sample-categories");
const utilitiesCollection = db.collection("utilities");

// Get all SampleCategories
module.exports.getSampleCategories = async (req, res) => {
    console.log('GET /SampleCategories');
    try {
        const result = await sampleCategoriesCollection.find().toArray();
        res.status(200).json({
            success: true,
            message: `${result.length} Sample Categories found`,
            SampleCategories: result,
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
      } else{
        res.send({success: false, message: "Category not found"});
      }
    } catch (error) {
      res.status(500).send({ message: 'Error deleting category', error });
    }
  };
    
module.exports.postCategory = async (req, res) => {
  const { cat_name, status, totalSamples, createdBy } = req.body;

  if (!cat_name || !status || totalSamples || createdBy === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // Check for existing category with same cat_name and buyer_name
    const existingCategory = await sampleCategoriesCollection.findOne({
      cat_name: cat_name.trim()
    });

    if (existingCategory) {
      return res.send({
        success: false,
        redirect: true,
        message: 'A category with the same name and buyer already exists',
      });
    }

    // If no duplicate, insert new category
    const newCategory = { cat_name, status, totalSamples, createdBy, createdAt: new Date() };
    const result = await sampleCategoriesCollection.insertOne(newCategory);

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
  const { name, createdBy } = req.body; // Destructure 'createdBy' from req.body

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Buyer name is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.status(400).json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingBuyer = await utilitiesCollection.findOne({
      utility_type: 'buyer', // Renamed from 'type'
      value: name.trim(),    // Renamed from 'name'
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
      value: name.trim(),
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

// Controller for creating a new Status
module.exports.postStatus = async (req, res) => {
  const { name, createdBy } = req.body; // Destructure 'createdBy' from req.body

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Status name is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.status(400).json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingStatus = await utilitiesCollection.findOne({
      utility_type: 'status', // Renamed from 'type'
      value: name.trim(),    // Renamed from 'name'
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
      value: name.trim(),
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
  const { number, createdBy } = req.body; // Destructure 'createdBy' from req.body

  if (!number || String(number).trim() === '') {
    return res.status(400).json({ success: false, message: 'Shelf number is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.status(400).json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingShelf = await utilitiesCollection.findOne({
      utility_type: 'shelf', // Renamed from 'type'
      value: String(number).trim(), // Renamed from 'number'
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
      value: String(number).trim(),
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
  const { number, createdBy } = req.body; // Destructure 'createdBy' from req.body

  if (!number || String(number).trim() === '') {
    return res.status(400).json({ success: false, message: 'Division number is required' });
  }
  // Add validation for createdBy
  if (!createdBy || createdBy.trim() === '') {
    return res.status(400).json({ success: false, message: 'Creator information is required' });
  }

  try {
    const existingDivision = await utilitiesCollection.findOne({
      utility_type: 'division', // Renamed from 'type'
      value: String(number).trim(), // Renamed from 'number'
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
      value: String(number).trim(),
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
  try {
    const buyers = await utilitiesCollection.find({ utility_type: 'buyer' }).toArray();
    if (buyers.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Buyers retrieved successfully!',
        data: buyers,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No buyers found.',
        data: [],
      });
    }
  } catch (error) {
    console.error('Error fetching buyers:', error);
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
      return res.status(404).json({
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
  try {
    const divisions = await utilitiesCollection.find({ utility_type: 'division' }).toArray();
    if (divisions.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Divisions retrieved successfully!',
        data: divisions,
      });
    } else {
      return res.status(404).json({
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