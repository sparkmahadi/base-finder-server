const { db } = require("../db");
const { ObjectId } = require("mongodb");

const sampleCategoriesCollection = db.collection("sample-categories");

// Get all SampleCategories
exports.getSampleCategories = async (req, res) => {
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