const {db} = require("../db");

async function logActivity(message) {
  try {
    if (!message) {
      console.warn("No message received");
      return;
    }

    const activitiesCollection = db.collection("activities");

    const activityDoc = {
      message: message.trim(),
      timestamp: new Date()
    };

    await activitiesCollection.insertOne(activityDoc);
    console.log("Activity logged:", message);
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}

module.exports = { logActivity };
