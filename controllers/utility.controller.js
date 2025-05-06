const { db } = require("../db");
const { ObjectId } = require("mongodb");

const sampleCategoriesCollection = db.collection("sample-categories");

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