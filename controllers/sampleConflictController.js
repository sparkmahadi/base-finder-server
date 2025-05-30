const { ObjectId } = require('mongodb'); // For MongoDB native driver
const {db} = require('../db');

 const samplesCollection = db.collection('samples'); // Assuming your collection is named 'samples'

// Utility function to safely parse integers
const safeParseInt = (value) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? undefined : parsed;
};

/**
 * @desc Checks for samples conflicting at a given shelf, division, and position.
 * @route POST /api/samples/check-position-conflict
 * @param {Object} req.body - Contains shelf, division, and position.
 * @returns {Object} { success: true, conflict: boolean, conflictingSamples: Array }
 */
exports.checkPositionConflicts = async (req, res) => {
    console.log('check conflicts');
  try {
    const { shelf, division, position } = req.body;
    console.log(req.body);

    const parsedShelf = safeParseInt(shelf);
    const parsedDivision = safeParseInt(division);
    const parsedPosition = safeParseInt(position);

    if (parsedShelf === undefined || parsedDivision === undefined || parsedPosition === undefined) {
      return res.status(400).json({ success: false, message: "Shelf, Division, and Position must be valid numbers." });
    }

    const conflictingSamples = await samplesCollection.find({
      shelf: parsedShelf,
      division: parsedDivision,
      position: parsedPosition,
      availability: 'yes' // Only available samples cause conflicts
    }).project({ _id: 1, style: 1, category: 1, no_of_sample: 1, sample_date: 1 }).toArray();

    if (conflictingSamples.length > 0) {
      return res.status(200).json({
        success: true,
        conflict: true,
        message: "Conflicts found at this shelf, division, and position.",
        conflictingSamples: conflictingSamples.map(sample => ({
          ...sample,
          _id: sample._id.toString() // Convert ObjectId to string for frontend
        }))
      });
    } else {
      return res.status(200).json({ success: true, conflict: false, message: "No conflicts found." });
    }
  } catch (error) {
    sendErrorResponse(res, error, "Failed to check for position conflicts.");
  } finally {
    if (client) client.close();
  }
};

/**
 * @desc Increase position numbers for samples at or above a given position within a shelf and division.
 * This effectively "shifts samples down" to make space.
 * @route PATCH /api/samples/increase-positions-by-shelf-division
 * @param {Object} req.body - Contains shelf, division, and currentPosition (where the new sample will go).
 * @returns {Object} { success: true, message: string, modifiedCount: number }
 */
exports.increasePositions = async (req, res) => {
  let client;
  try {
    const { shelf, division, currentPosition } = req.body;

    const parsedShelf = safeParseInt(shelf);
    const parsedDivision = safeParseInt(division);
    const parsedCurrentPosition = safeParseInt(currentPosition);

    if (parsedShelf === undefined || parsedDivision === undefined || parsedCurrentPosition === undefined) {
      return res.status(400).json({ success: false, message: "Shelf, Division, and currentPosition must be valid numbers." });
    }

    client = await MongoClient.connect(DB_URI);
    const db = client.db(DB_NAME);
    const samplesCollection = db.collection('samples');

    const result = await samplesCollection.updateMany(
      {
        shelf: parsedShelf,
        division: parsedDivision,
        position: { $gte: parsedCurrentPosition }
      },
      { $inc: { position: 1 } } // Increment position by 1
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ success: true, message: 'Samples shifted down successfully.', modifiedCount: result.modifiedCount });
    } else {
      res.status(200).json({ success: false, message: 'No samples needed shifting or none found at/after this position.', modifiedCount: 0 });
    }
  } catch (error) {
    sendErrorResponse(res, error, "Failed to shift samples down.");
  } finally {
    if (client) client.close();
  }
};

/**
 * @desc Resolves conflicts based on the specified resolution type.
 * @route POST /api/samples/resolve-conflict
 * @param {string} req.body.resolutionType - 'overwrite', 'deleteSelected', 'keepOne'
 * @param {Object} req.body.data - Specific data for the resolution type
 * @returns {Object} { success: true, message: string }
 */
exports.resolveConflicts = async (req, res) => {
  let client;
  try {
    const { resolutionType, data } = req.body;

    client = await MongoClient.connect(DB_URI);
    const db = client.db(DB_NAME);
    const samplesCollection = db.collection('samples');

    let result;
    switch (resolutionType) {
      case 'overwrite':
        const o_shelf = safeParseInt(data.shelf);
        const o_division = safeParseInt(data.division);
        const o_position = safeParseInt(data.position);
        if (o_shelf === undefined || o_division === undefined || o_position === undefined) {
          return res.status(400).json({ success: false, message: "Missing shelf, division, or position for overwrite." });
        }
        const overwriteRes = await samplesCollection.deleteMany({
          shelf: o_shelf,
          division: o_division,
          position: o_position
        });
        result = { message: `Successfully cleared ${overwriteRes.deletedCount} existing samples for overwrite.` };
        break;

      case 'deleteSelected':
        if (!Array.isArray(data.sampleIdsToDelete) || data.sampleIdsToDelete.length === 0) {
          return res.status(400).json({ success: false, message: "No samples selected for deletion." });
        }
        // Convert string IDs back to ObjectId for MongoDB query
        const deleteObjectIds = data.sampleIdsToDelete.map(id => new ObjectId(id));
        const deleteRes = await samplesCollection.deleteMany({ _id: { $in: deleteObjectIds } });
        result = { message: `Successfully deleted ${deleteRes.deletedCount} selected samples.` };
        break;

      case 'keepOne':
        const k_shelf = safeParseInt(data.shelf);
        const k_division = safeParseInt(data.division);
        const k_position = safeParseInt(data.position);
        if (!data.keepSampleId || k_shelf === undefined || k_division === undefined || k_position === undefined) {
          return res.status(400).json({ success: false, message: "Missing sample ID or location for 'keep one'." });
        }
        // Convert string ID to ObjectId for MongoDB query
        const keepObjectId = new ObjectId(data.keepSampleId);
        const keepRes = await samplesCollection.deleteMany({
          shelf: k_shelf,
          division: k_division,
          position: k_position,
          _id: { $ne: keepObjectId } // Delete all *except* the one specified
        });
        result = { message: `Kept one sample and deleted ${keepRes.deletedCount} others.` };
        break;

      default:
        return res.status(400).json({ success: false, message: "Invalid resolution type." });
    }
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    sendErrorResponse(res, error, "Failed to resolve conflicts.");
  } finally {
    if (client) client.close();
  }
};