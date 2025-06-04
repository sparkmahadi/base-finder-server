const { db } = require('../db');

const samplesCollection = db.collection('samples');

exports.checkPositionConflicts = async (req, res) => {
  console.log('check positional conflicts');
  const { shelf, division } = req.body;

  // Determine if specific shelf and division are provided
  // Includes checking for empty strings as well, as parseInt('') results in NaN.
  const hasSpecificShelfAndDivision = shelf !== undefined && division !== undefined && shelf !== '' && division !== '';

  let parsedShelf, parsedDivision;
  if (hasSpecificShelfAndDivision) {
    parsedShelf = parseInt(shelf);
    parsedDivision = parseInt(division);

    // Validate input only if they are provided
    if (isNaN(parsedShelf) || isNaN(parsedDivision)) {
      return res.status(400).json({
        message: 'Please provide valid "shelf" and "division" as numbers in the request body, or omit them to check all.',
        success: false,
        isConflicts: false,
      });
    }
    console.log(`Checking conflicts for Shelf: ${parsedShelf}, Division: ${parsedDivision} (excluding availability: "no").`);
  } else {
    console.log('Checking conflicts for ALL shelves and divisions (excluding availability: "no").');
  }

  try {
    const pipeline = [];

    // Stage 1: Exclude documents where availability field exists AND its value is "no"
    pipeline.push({
      $match: {
        $or: [
          { availability: { $exists: false } }, // Include documents where 'availability' field does NOT exist
          { availability: { $ne: "no" } }       // Include documents where 'availability' field is NOT "no"
        ]
      }
    });

    // Stage 2: Conditional $match - Apply filtering if specific shelf/division is provided
    // This filter runs BEFORE grouping, ensuring we only group relevant documents.
    const matchConditions = {};
    if (hasSpecificShelfAndDivision) {
      matchConditions.shelf = parsedShelf;
      matchConditions.division = parsedDivision;
    }
    // Only add $match stage if there are actual conditions to apply
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({
        $match: matchConditions,
      });
    }


    // --- CRITICAL FIX HERE: Stage 3: $group - ALWAYS group by shelf, division, and position ---
    // This ensures _id.shelf and _id.division always exist for the $project stage.
    pipeline.push({
      $group: {
        _id: {
          shelf: "$shelf",
          division: "$division",
          position: "$position"
        },
        count: { $sum: 1 },
        conflictingSamples: { $push: "$$ROOT" },
      },
    });

    // Stage 4: $match - Filter for actual duplicates (count > 1)
    pipeline.push({
      $match: {
        count: { $gt: 1 },
      },
    });

    // --- Stage 5: $project - Now shelf and division will ALWAYS come from $_id.shelf and $_id.division ---
    pipeline.push({
      $project: {
        _id: 0, // Exclude the default _id from the group stage
        shelf: "$_id.shelf",        // Always take from _id
        division: "$_id.division",  // Always take from _id
        conflictingPosition: "$_id.position",
        numberOfConflicts: "$count",
        conflictingSamples: "$conflictingSamples",
      },
    });

    const conflicts = await samplesCollection.aggregate(pipeline).toArray();

    let responseMessage;
    if (hasSpecificShelfAndDivision) {
      responseMessage = conflicts.length > 0
        ? `Position conflicts found in Shelf: ${parsedShelf}, Division: ${parsedDivision} (excluding availability: "no").`
        : `No conflicts found in Shelf: ${parsedShelf}, Division: ${parsedDivision} (excluding availability: "no").`;
    } else {
      responseMessage = conflicts.length > 0
        ? 'Conflicts found across various shelves and divisions (excluding availability: "no" samples).'
        : 'No conflicts found across all shelves and divisions (excluding availability: "no" samples).';
    }

    res.json({
      message: responseMessage,
      isConflicts: conflicts.length > 0,
      success: true,
      conflicts: conflicts,
    });

  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({
      message: 'Server error occurred while fetching conflicts.',
      success: false,
      isConflicts: false,
      error: error.message,
    });
  }
};