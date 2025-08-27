const { db } = require("../../db");
const activitiesCollection = db.collection("activities");

exports.postActivity = async (req, res) => {
  console.log('hit post activitiy manually');
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Activity message is required and must be a string."
      });
    }

    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found in request."
      });
    }


    const activityDoc = {
      message: message.trim(),
      timestamp: new Date()
    };

    await activitiesCollection.insertOne(activityDoc);

    res.status(201).json({
      success: true,
      message: "Activity recorded successfully",
      data: activityDoc
    });
  } catch (error) {
    console.error("Error posting activity:", error);
    res.status(500).json({
      success: false,
      message: "Server error while posting activity"
    });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const query = req.user.role === "admin"
      ? {}
      : { user_id: req.user._id };

    const activities = await activitiesCollection.find(query)
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
