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
    const { id } = req.params;
  
    try {
      const result = await samplesCollection.deleteOne({ _id: new MongoClient.ObjectId(id) });
  
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Sample not found' });
      }
  
      res.json({ message: 'Sample deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting sample', error });
    }
  };