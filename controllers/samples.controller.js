const {db} = require("../db");

const samplesCollection = db.collection("samples");

// getting all the samples
module.exports.getSamples = async (req, res) => {
    console.log('hit getsamples');
    try {
        const samples = await samplesCollection.find().toArray();
        const medNum = samples.length; // Corrected this line to get the length of samples
        res.status(200).json({
            success: true,
            message: `${medNum} samples found successfully`, // Corrected this line to properly format the message
            data: samples
        });
    } catch (error) {
        console.log('error', error);
        res.status(500).json({
            success: false,
            message: "Something went wrong!!"
        });
    }
}



module.exports.postSample = async (req, res) => {
    const { date="", category="", style="", noOfSample="", s="", d="", status="", comments="", released="" } = req.body;
    console.log('hit');
    try {
      const result = await samplesCollection.insertOne({
        date,
        category,
        style,
        noOfSample,
        s,
        d,
        status,
        comments,
        released,
      });
      console.log(result);
      if(result.insertedId){
        res.send("Inserted")
      }
    } catch (error) {
      res.status(500).json({ message: 'Error creating sample', error });
    }
  };
  
  // Route to update an existing sample
  module.exports.updateSample = async (req, res) => {
    const { id } = req.params;
    const { date, category, style, noOfSample, s, d, status, comments, released } = req.body;
  
    try {
      const result = await samplesCollection.updateOne(
        { _id: new MongoClient.ObjectId(id) },
        { $set: { date, category, style, noOfSample, s, d, status, comments, released } }
      );
  
      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: 'Sample not found or no changes made' });
      }
  
      res.json({ message: 'Sample updated' });
    } catch (error) {
      res.status(500).json({ message: 'Error updating sample', error });
    }
  };
  
  // Route to delete a sample
  module.exports.deleteSample = async (req, res) => {
    console.log('hit delete sample');
    try {
      const db = getDb();
      const sampleId = req.params.id;
      const userId = req.user.id; // From your protect middleware
  
      const sample = await db.collection('samples').findOne({ _id: new ObjectId(sampleId) });
  
      if (!sample) {
        return res.status(404).json({ message: 'Sample not found' });
      }
  
      // Move to deleted_samples collection
      await db.collection('deleted_samples').insertOne({
        ...sample,
        deletedBy: userId,
        deletedAt: new Date()
      });
  
      // Delete from main samples
      await db.collection('samples').deleteOne({ _id: new ObjectId(sampleId) });
  
      res.status(200).json({ message: 'Sample moved to recycle bin' });
  
    } catch (error) {
      console.error('Error deleting sample:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  module.exports.restoreSample = async (req, res) => {
    try {
      const deletedSampleId = req.params.id;
  
      const deletedSample = await db.collection('deleted_samples').findOne({ _id: new ObjectId(deletedSampleId) });
  
      if (!deletedSample) {
        return res.status(404).json({ message: 'Deleted sample not found' });
      }
  
      // Insert back into samples collection
      const { _id, deletedBy, deletedAt, ...sampleData } = deletedSample;
      await db.collection('samples').insertOne(sampleData);
  
      // Delete from deleted_samples collection
      await db.collection('deleted_samples').deleteOne({ _id: new ObjectId(deletedSampleId) });
  
      res.status(200).json({ message: 'Sample restored successfully' });
    } catch (error) {
      console.error('Error restoring sample:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
module.exports.getDeletedSamples = async (req, res) => {
    try {
      const db = getDb();
      const deletedSamples = await db.collection('deleted_samples').find().toArray();
  
      res.status(200).json({ data: deletedSamples });
    } catch (error) {
      console.error('Error getting deleted samples:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  