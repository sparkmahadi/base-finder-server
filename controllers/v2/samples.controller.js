const { db } = require("../../db");
const { ObjectId } = require("mongodb");
const normalizeFieldsToNumbers = require('../../utils/nomalizeFieldsToNumbers');
const { logActivity } = require("../../utils/activityLogger");

// Collection References
const samplesCollection = db.collection("samples");
const usersCollection = db.collection("users");
const teamsCollection = db.collection("teams");
const buyersCollection = db.collection("buyers");
const takenSamplesCollection = db.collection("taken-samples");
const deletedSamplesCollection = db.collection("deleted-samples");

// --- Helper Functions (Internal to Controller) ---

/**
 * Validates if a string is a valid MongoDB ObjectId.
 * @param {string} id - The ID string to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
const isValidObjectId = (id) => ObjectId.isValid(id);

/**
 * Finds a sample in either samplesCollection or takenSamplesCollection.
 * @param {ObjectId} objectId - The ObjectId to search for.
 * @returns {Promise<{sample: object, collectionSource: string|null}>} - An object containing the sample and its source collection, or null if not found.
 */
const findSampleInCollections = async (idOrSampleId) => {
    console.log('Received identifier:', idOrSampleId);

    let query;

    // Try to interpret the value as a valid ObjectId
    if (ObjectId.isValid(idOrSampleId)) {
        query = { _id: (idOrSampleId) };
    } else {
        query = { sample_id: idOrSampleId };
    }

    let sample = await samplesCollection.findOne(query);
    if (sample) {
        console.log("found sample", "from collection", "samplesCollection");
        return { sample, collectionSource: 'samplesCollection' };
    }

    sample = await takenSamplesCollection.findOne(query);
    if (sample) {
        console.log("found sample", "from collection", "takenSamplesCollection");
        return { sample, collectionSource: 'takenSamplesCollection' };
    }
    console.log("not found sample", 'with query', query);
    return { sample: null, collectionSource: null };
};

/**
 * Normalizes 'shelf', 'division', and 'position' fields in a collection to numbers.
 * @param {object} collection - The MongoDB collection object.
 * @returns {Promise<number>} - The count of documents that had fields normalized.
 * @deprecated - This should ideally be a migration script, not run on every API call.
 */
const ensureNumericPositionFields = async (collection) => {
    // Given the previous code, I'll assume normalizeFieldsToNumbers does the job.
    return await normalizeFieldsToNumbers(collection);
};

// --- GET Operations ---

/**
 * Retrieves all samples from both active and taken collections.
 * Route: GET /api/samples/
 */
exports.getAllSamples = async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    console.log('GET /samples (all samples for user - )', userId);

    try {
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User not found in request' });
        }

        // Admin gets all samples
        if (userRole === 'admin') {
            const activeSamples = await samplesCollection.find().toArray();
            const takenSamples = await takenSamplesCollection.find().toArray();
            const allSamples = [...activeSamples, ...takenSamples];

            return res.status(200).json({
                success: true,
                message: `${allSamples.length} samples found (admin access)`,
                samples: allSamples,
            });
        }

        // 1️⃣ Find the team document that contains this user as member
        const team = await teamsCollection.findOne({
            'members.user_id': userId
        });

        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found for this user' });
        }

        // 2️⃣ Use the buyers array from the team document to filter samples
        const buyersList = team.buyers || [];

        // 3️⃣ Query samplesCollection and takenSamplesCollection by buyer in buyersList
        const activeSamples = await samplesCollection.find({ buyer: { $in: buyersList } }).toArray();
        const takenSamples = await takenSamplesCollection.find({ buyer: { $in: buyersList } }).toArray();

        const allSamples = [...activeSamples, ...takenSamples];

        res.status(200).json({
            success: true,
            message: `${allSamples.length} samples found for team ${team.team_name}`,
            samples: allSamples,
        });
    } catch (error) {
        console.error('Error fetching samples for user team:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred while fetching samples.' });
    }
};

/**
 * Retrieves sample details by ID, checking both active and taken collections.
 * Route: GET /api/samples/:id
 */

exports.getSampleDetails = async (req, res) => {
    console.log('GET /samples/:id');
    const { id } = req.params;

    try {
        let sample = null;
        let collectionSource = null;

        // Try ObjectId search if valid
        if (ObjectId.isValid(id)) {
            const objectId = new ObjectId(id);
            ({ sample, collectionSource } = await findSampleInCollections(objectId));
        }

        // If not found by ObjectId or not valid ObjectId, try string search
        if (!sample) {
            ({ sample, collectionSource } = await findSampleInCollections(id));
        }

        if (sample) {
            return res.status(200).json({
                success: true,
                message: `Sample details found in ${collectionSource}`,
                sample,
            });
        } else {
            return res.status(404).json({ success: false, message: 'Sample not found' });
        }
    } catch (error) {
        console.error('Error fetching sample details:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error occurred while fetching sample details.',
        });
    }
};


/**
 * Retrieves samples based on shelf and division.
 * Route: GET /api/samples/get-by-shelf-and-division
 */
exports.getSamplesByShelfAndDivision = async (req, res) => {
    console.log('GET /samples/get-by-shelf-and-division');
    const { shelf, division } = req.query;

    const numericShelf = parseInt(shelf);
    const numericDivision = parseInt(division);

    if (isNaN(numericShelf) || isNaN(numericDivision)) {
        return res.status(400).json({ success: false, message: 'Invalid shelf or division provided. Must be numbers.' });
    }

    try {
        const query = { shelf: numericShelf, division: numericDivision };
        const result = await samplesCollection.find(query).toArray();

        res.status(200).json({
            success: true,
            message: `${result.length} samples found for shelf ${numericShelf} and division ${numericDivision}`,
            samples: result,
        });
    } catch (error) {
        console.error('Error fetching samples by shelf and division:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred while fetching samples by shelf and division.' });
    }
};

/**
 * Retrieves all samples currently marked as 'taken'.
 * Route: GET /api/samples/taken-samples
 */
exports.getTakenSamples = async (req, res) => {
    console.log('GET /taken-samples');
    try {
        const query = { availability: "no" };
        const result = await samplesCollection.find(query).toArray();
        res.status(200).json({
            success: true,
            message: `${result.length} taken samples found`,
            samples: result,
        });
    } catch (error) {
        console.error('Error fetching taken samples:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred while fetching taken samples.' });
    }
};

/**
 * Retrieves a list of all buyers.
 * Route: GET /api/samples/buyers
 */
exports.getBuyers = async (req, res) => {
    console.log('GET /buyers');
    try {
        const result = await buyersCollection.find().toArray();
        res.status(200).json({
            success: true,
            message: `${result.length} buyers found`,
            buyers: result,
        });
    } catch (error) {
        console.error('Error fetching buyers:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred while fetching buyers.' });
    }
};

/**
 * Retrieves unique values for specified fields or unique combinations of multiple fields.
 * Route: GET /api/samples/unique?fields=category
 * Route: GET /api/samples/unique?fields=category,buyer
 */
exports.getUniqueFieldValues = async (req, res) => {
    console.log('GET /samples/unique');
    const { fields } = req.query;

    if (!fields) {
        return res.status(400).json({ success: false, message: "fields query parameter is required (e.g., ?fields=category or ?fields=category,buyer)" });
    }

    const fieldArray = fields.split(",").map(f => f.trim()).filter(f => f); // Trim and filter empty strings

    if (fieldArray.length === 0) {
        return res.status(400).json({ success: false, message: "No valid fields provided in the query parameter." });
    }

    try {
        if (fieldArray.length === 1) {
            // Single field: use distinct
            const values = await samplesCollection.distinct(fieldArray[0]);
            return res.status(200).json({ success: true, field: fieldArray[0], values });
        } else {
            // Multiple fields: use aggregation for unique combinations
            const pipeline = [
                {
                    $group: {
                        _id: fieldArray.reduce((acc, field) => {
                            acc[field] = `$${field}`;
                            return acc;
                        }, {}),
                    },
                },
                {
                    $project: {
                        _id: 0,
                        ...fieldArray.reduce((acc, field) => {
                            acc[field] = `$_id.${field}`;
                            return acc;
                        }, {}),
                    },
                },
            ];

            const values = await samplesCollection.aggregate(pipeline).toArray();
            return res.status(200).json({ success: true, fields: fieldArray, combinations: values });
        }
    } catch (err) {
        console.error("Error fetching unique field values:", err);
        res.status(500).json({ success: false, message: "Server Error occurred while fetching unique field values." });
    }
};

/**
 * Checks if a specific shelf, division, and position is available.
 * Route: GET /api/samples/check-position-availability
 * need when restoring a sample from soft deleted
 */
exports.checkPositionAvailability = async (req, res) => {
    console.log('GET /samples/check-position-availability');
    const { shelf, division, position } = req.query;

    const parsedShelf = parseInt(shelf);
    const parsedDivision = parseInt(division);
    const parsedPosition = parseInt(position);

    if (isNaN(parsedShelf) || isNaN(parsedDivision) || isNaN(parsedPosition)) {
        return res.status(400).json({ success: false, message: "Invalid shelf, division, or position. All must be numbers." });
    }

    try {
        const query = { shelf: parsedShelf, division: parsedDivision, position: parsedPosition };
        const currentPositionHolders = await samplesCollection.find(query).toArray();

        if (currentPositionHolders?.length > 0) {
            return res.status(200).json({
                success: true,
                isPositionEmpty: false,
                message: `Total ${currentPositionHolders.length} sample(s) found at position ${parsedPosition} on shelf ${parsedShelf}, division ${parsedDivision}.`,
                currentSamples: currentPositionHolders
            });
        } else {
            return res.status(200).json({
                success: true,
                isPositionEmpty: true,
                message: `Position ${parsedPosition} on shelf ${parsedShelf}, division ${parsedDivision} is empty.`,
            });
        }
    } catch (error) {
        console.error('Error checking position availability:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred while checking position availability.' });
    }
};

/**
 * Retrieves all deleted samples (from the recycle bin).
 * Route: GET /api/samples/deleted-samples
 */
exports.getDeletedSamples = async (req, res) => {
    console.log('GET /deleted-samples');
    try {
        const result = await deletedSamplesCollection.find().toArray();
        res.status(200).json({
            success: true,
            message: `${result.length} deleted samples found`,
            samples: result,
        });
    } catch (error) {
        console.error('Error fetching deleted samples:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred while fetching deleted samples.' });
    }
};

// --- POST Operations ---

/**
 * Creates a new sample, shifting existing samples down if the position is already occupied.
 * Route: POST /api/samples/
 */
exports.postSample = async (req, res) => {
    console.log('POST /samples');
    const user = req.user;
    try {
        const { position, shelf, division, ...otherSampleData } = req.body;
        console.log(otherSampleData);

        const numericPosition = Number(position);
        const numericShelf = Number(shelf);
        const numericDivision = Number(division);

        if (isNaN(numericPosition) || numericPosition < 1 || isNaN(numericShelf) || isNaN(numericDivision)) {
            return res.status(400).json({ success: false, message: "Invalid position, shelf, or division. Ensure they are valid numbers and position is positive." });
        }

        // Step 3: Prepare and insert the new sample
        const newSample = {
            ...otherSampleData,
            position: numericPosition,
            shelf: numericShelf,
            division: numericDivision,
            availability: "yes", // Assuming new samples are always available
            added_at: new Date(),
        };

        const result = await samplesCollection.insertOne(newSample);

        if (result.acknowledged) {
            // move samples to down handled by frontend

            // Return the newly generated sample_id in the response
            return res.status(201).json({ success: true, message: 'Sample inserted successfully', sample_id: newSample.sample_id, _id: result.insertedId });
        }
        res.status(500).json({ success: false, message: 'Failed to insert sample into the database.' });
    } catch (error) {
        console.error('Error inserting sample:', error);
        // Handle duplicate ID error specifically if using unique index on sample_id
        if (error.code === 11000) { // MongoDB duplicate key error code
            return res.status(409).json({ success: false, message: 'A sample with this sample ID already exists. Please try again or contact support.' });
        }
        res.status(500).json({ success: false, message: 'Server Error occurred during sample insertion.' });
    }
};


/**
 * Uploads multiple samples from an Excel file (expects an array of sample objects in req.body).
 * Route: POST /api/samples/upload-excel
 */
exports.uploadSamplesFromExcel = async (req, res) => {
    console.log('POST /samples/upload-excel');
    try {
        const { samples } = req.body;

        if (!Array.isArray(samples) || samples.length === 0) {
            return res.status(400).json({ success: false, message: 'No samples array provided or array is empty.' });
        }

        const samplesToInsert = samples.map((sample) => ({
            sample_date: sample.sample_date ? new Date(sample.sample_date) : null,
            buyer: sample.buyer || '',
            category: sample.category || '',
            style: sample.style || '',
            no_of_sample: Number(sample.no_of_sample) || 0, // Ensure numeric
            shelf: Number(sample.shelf) || 0, // Ensure numeric
            division: Number(sample.division) || 0, // Ensure numeric
            position: Number(sample.position) || 0, // Ensure numeric
            status: sample.status || '',
            season: sample.season || '',
            comments: sample.comments || '',
            released: sample.released ? new Date(sample.released) : null,
            added_by: sample.added_by || (req.user?.username || 'unknown'), // Use req.user if available
            createdAt: new Date(),
            added_at: new Date(),
        }));


        const insertResult = await samplesCollection.insertMany(samplesToInsert);

        return res.status(201).json({
            success: true,
            message: `Successfully uploaded ${insertResult.insertedCount} samples from Excel.`,
            count: insertResult.insertedCount
        });
    } catch (err) {
        console.error('Error uploading samples from Excel:', err);
        return res.status(500).json({ success: false, message: 'Server Error occurred during Excel upload.' });
    }
};

// --- PUT/PATCH Operations (Update) ---

/**
 * Updates an existing sample by ID, checking both active and taken collections.
 * Route: PUT /api/samples/:id
 */
exports.updateSampleById = async (req, res) => {
    console.log('PUT /samples/:id');
    const { id } = req.params;
    const updatedData = req.body;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid sample ID' });
    }

    try {
        const objectId = new ObjectId(id);
        const { sample: existingSample, collectionSource } = await findSampleInCollections(objectId);

        if (!existingSample) {
            return res.status(404).json({ success: false, message: 'Sample not found in either active or taken samples.' });
        }

        const targetCollection = collectionSource === 'samplesCollection' ? samplesCollection : takenSamplesCollection;

        const updatedFields = { ...updatedData };
        delete updatedFields._id; // Prevent _id from being updated

        // Check for actual changes to avoid unnecessary updates
        const hasChanges = Object.keys(updatedFields).some(
            key => JSON.stringify(existingSample[key]) !== JSON.stringify(updatedFields[key])
        );

        if (!hasChanges) {
            return res.status(200).json({ success: true, message: 'No changes detected. Sample not updated.' });
        }

        const updateResult = await targetCollection.updateOne(
            { _id: objectId },
            { $set: updatedFields }
        );

        if (updateResult.modifiedCount > 0) {
            const updatedSample = await targetCollection.findOne({ _id: objectId });
            return res.status(200).json({
                success: true,
                message: 'Sample updated successfully',
                updatedSample,
            });
        } else {
            // This case should ideally not be hit if hasChanges was true,
            // but good for robustness if underlying data changes right before update.
            return res.status(500).json({ success: false, message: "Failed to modify sample, or no matching document found to update." });
        }

    } catch (error) {
        console.error('Error updating sample by ID:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred while updating sample.' });
    }
};

/**
 * Marks a sample as taken in the active collection.
 * Route: PUT /api/samples/:id/take
 */
exports.takeSample = async (req, res) => {
    console.log('PUT /samples/:id/take');
    const user = req.user;
    const sampleId = req.params.id;
    const { taken_by, purpose, taken_at } = req.body;

    if (!taken_by || !purpose) {
        return res.status(400).json({
            success: false,
            message: "Missing 'taken_by' or 'purpose' in request body."
        });
    }

    try {
        let filter = {};
        if (ObjectId.isValid(sampleId)) {
            filter._id = new ObjectId(sampleId);
        } else {
            filter._id = sampleId; // fallback if _id is string
        }

        // Find the sample
        const sample = await samplesCollection.findOne(filter);

        if (!sample) {
            return res.status(404).json({
                success: false,
                message: "Sample not found."
            });
        }

        // check eligibility of the user to take the sample - check assigned buyers and match with sample enlisted buyer name
        const { _id, username, role, team, email } = user;
        const query = { team_name: team };
        const teamDetails = await teamsCollection.findOne(query);

        if (!teamDetails || !Array.isArray(teamDetails.buyers)) {
            return res.json({
                success: false,
                message: "Team details not found or invalid."
            });
        }

        // If sample.buyer is not in the team’s buyers array, deny
        if (!teamDetails.buyers.includes(sample.buyer)) {
            return res.json({
                success: false,
                message: `You are not eligible to take this sample.`
            });
        }
        const timestamp = new Date();
        const logEntry = { taken_by, purpose, taken_at: timestamp };

        // Update the sample in place
        const updateResult = await samplesCollection.updateOne(
            filter,
            {
                $set: {
                    last_taken_by: taken_by,
                    last_purpose: purpose,
                    last_taken_at: timestamp,
                    availability: "no"
                },
                $push: {
                    taken_logs: logEntry
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(500).json({
                success: false,
                message: "Failed to update sample."
            });
        }

        // Reposition samples below the current one
        await samplesCollection.updateMany(
            {
                shelf: sample.shelf,
                division: sample.division,
                team: sample.team,
                availability: "yes",
                position: { $gt: sample.position }
            },
            { $inc: { position: -1 } }
        );

        // Optionally, log activity
        await logActivity(`${taken_by} took ${sampleId} for ${purpose}`);

        return res.status(200).json({
            success: true,
            message: `Sample ${sample.style} (${sample.category}) marked as taken by ${taken_by}.`,
            taken_by,
            taken_at: timestamp,
            purpose
        });

    } catch (err) {
        console.error("Error in takeSample:", err);
        return res.status(500).json({
            success: false,
            message: "Server error occurred while taking sample."
        });
    }
};



/**
 * Moves a sample from the taken collection back to the active collection,
 * and adjusts positions in the active collection.
 * Route: PUT /api/samples/putback/:id
 */
exports.putBackSample = async (req, res) => {
    console.log('PUT /samples/putback/:id');
    console.log('user', req.user);
    const sampleId = req.params.id; // This is the _id from takenSamplesCollection
    const { position, returned_by, return_purpose } = req.body;

    const numericPosition = Number(position);

    if (!isValidObjectId(sampleId) || isNaN(numericPosition) || numericPosition < 1 || !returned_by) {
        console.log(sampleId);
        console.log('error');
        return res.json({ success: false, message: "Invalid sample ID, position, or missing 'returned_by'." });
    }

    try {
        const convertedId = new ObjectId(sampleId);
        // Step 1: Find the sample in takenSamplesCollection using its current _id
        const sample = await samplesCollection.findOne({ _id: convertedId });
        if (!sample) {
            return res.status(404).json({ success: false, message: "Sample not found in taken samples collection." });
        }

        // Reposition samples below the current one
        await samplesCollection.updateMany(
            {
                shelf: sample.shelf,
                division: sample.division,
                team: sample.team,
                availability: "yes",
                position: { $gte: numericPosition }
            },
            { $inc: { position: 1 } }
        );

        const returnedSample = {
            ...sample,
            position: numericPosition,
            availability: "yes",
            returned_at: new Date(),
            returned_log: [
                ...(sample.returned_log || []),
                {
                    returned_by,
                    purpose: return_purpose || 'Not specified',
                    returned_at: new Date()
                }
            ],
        };

        // Update the sample in place
        const updateResult = await samplesCollection.updateOne(
            { _id: convertedId },
            {
                $set: returnedSample,
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(500).json({
                success: false,
                message: "Failed to update sample."
            });
        }

        // await logActivity(`${user.username} kept back ${newPutBackSampleId}`);

        return res.status(200).json({
            success: true,
            message: `Sample successfully put back at position ${numericPosition} on shelf ${sample.shelf} - division ${sample.division}.`
        });

    } catch (err) {
        console.error("Error in putBackSample:", err);
        res.status(500).json({ success: false, message: "Server error occurred while putting sample back." });
    }
};

/**
 * Restores a deleted sample from the recycle bin back to the active samples collection.
 * Route: PUT /api/samples/deleted-samples/restore/:id
 */
exports.restoreSample = async (req, res) => {
    console.log('PUT /deleted-samples/restore/:id');
    const { id } = req.params;
    const { position, restored_by } = req.body;

    if (!isValidObjectId(id) || !position || !restored_by) {
        return res.status(400).json({ success: false, message: "Invalid ID, missing 'position' or 'restored_by' in request body." });
    }

    const numericPosition = Number(position);
    if (isNaN(numericPosition) || numericPosition < 1) {
        return res.status(400).json({ success: false, message: "Invalid position. Must be a positive number." });
    }

    try {
        const objectId = new ObjectId(id);
        const deletedSample = await deletedSamplesCollection.findOne({ _id: objectId });

        if (!deletedSample) {
            return res.status(404).json({ success: false, message: 'Deleted sample not found in recycle bin.' });
        }

        // Check if the target position is available before restoring
        const existingSampleAtPosition = await samplesCollection.findOne({
            shelf: deletedSample.shelf,
            division: deletedSample.division,
            position: numericPosition
        });

        if (existingSampleAtPosition) {
            // Option 1: Prevent restore and ask user to choose another position
            // return res.status(409).json({ success: false, message: 'Position already occupied by another sample. Please choose a different position.' });

            // Option 2 (as per postSample logic): Shift existing samples to make space
            await samplesCollection.updateMany(
                {
                    shelf: deletedSample.shelf,
                    division: deletedSample.division,
                    position: { $gte: numericPosition }
                },
                { $inc: { position: 1 } }
            );
            console.log(`Shifted existing samples to make space for restored sample at position ${numericPosition}.`);
        }


        // Destructure and prepare data for restoration
        const { _id: deletedSampleId, ...sampleDataToRestore } = deletedSample; // Exclude the _id from the deleted document

        // Prepare the data to be inserted into the samples collection
        const restoringData = {
            ...sampleDataToRestore,
            position: numericPosition, // Use the new position from req.body
            availability: "yes",
            restored_by,
            restored_at: new Date(),
            // Remove deletedBy/deletedAt from the restored document
            deletedByUserId: null,
            deletedBy: null,
            deletedAt: null,
        };

        const insertResult = await samplesCollection.insertOne(restoringData);
        if (!insertResult.insertedId) {
            return res.status(500).json({ success: false, message: "Failed to insert sample back into active samples." });
        }

        await deletedSamplesCollection.deleteOne({ _id: objectId }); // Delete from recycle bin after successful restoration

        res.status(200).json({
            success: true,
            message: `Sample restored successfully to position ${numericPosition} on shelf ${restoringData.shelf}, division ${restoringData.division}.`
        });

    } catch (error) {
        console.error('Error restoring sample:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred during sample restoration.' });
    }
};

/**
 * Increases positions of samples above a certain point in a given shelf and division.
 * This is primarily for making space.
 * Route: PATCH /api/samples/increase-positions-by-shelf-division
 */
exports.increasePositionsByShelfAndDivision = async (req, res) => {
    console.log('PATCH /samples/increase-positions-by-shelf-division');
    let { shelf, division, currentPosition } = req.body;
    const user = req.user;
    console.log(user);
    const numericShelf = Number(shelf);
    const numericDivision = Number(division);
    const numericCurrentPosition = Number(currentPosition);

    if (isNaN(numericShelf) || isNaN(numericDivision) || isNaN(numericCurrentPosition)) {
        return res.status(400).json({ success: false, message: 'Invalid input types. Shelf, division, and currentPosition must be numbers.' });
    }

    try {
        // Ensure fields are numeric (using your utility) - this can be heavy if run often
        await ensureNumericPositionFields(samplesCollection);

        const query = {
            shelf: numericShelf,
            division: numericDivision,
            team: user.team,
            availability: "yes",
            position: { $gte: numericCurrentPosition } // Affects samples at or greater than the given position
        };

        const result = await samplesCollection.updateMany(query, {
            $inc: { position: 1 }
        });

        if (result.modifiedCount > 0) {
            return res.status(200).json({
                success: true,
                message: `Positions increased by 1 for ${result.modifiedCount} document(s) on shelf ${numericShelf}, division ${numericDivision} above position ${numericCurrentPosition}.`,
                modifiedCount: result.modifiedCount
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'No positions were updated — no matching documents for increase.',
                modifiedCount: 0
            });
        }
    } catch (err) {
        console.error('Error while increasing positions by shelf and division:', err);
        return res.status(500).json({ success: false, message: 'Server error occurred during position increase.' });
    }
};

/**
 * Decreases positions of samples above a certain point in a given shelf and division.
 * This is primarily for closing gaps.
 * Route: PATCH /api/samples/decrease-positions-by-shelf-division
 */
exports.decreasePositionsByShelfAndDivision = async (req, res) => {
    console.log('PATCH /samples/decrease-positions-by-shelf-division');
    const user = req.user;
    let { shelf, division, currentPosition } = req.body;

    const numericShelf = Number(shelf);
    const numericDivision = Number(division);
    const numericCurrentPosition = Number(currentPosition);

    if (isNaN(numericShelf) || isNaN(numericDivision) || isNaN(numericCurrentPosition)) {
        return res.status(400).json({ success: false, message: 'Invalid input types. Shelf, division, and currentPosition must be numbers.' });
    }

    try {
        // Ensure fields are numeric (using your utility) - this can be heavy if run often
        await ensureNumericPositionFields(samplesCollection);

        const query = {
            shelf: numericShelf,
            division: numericDivision,
            team: user.team,
            availability: "yes",
            position: { $gt: numericCurrentPosition } // Affects samples strictly greater than the given position
        };

        const result = await samplesCollection.updateMany(query, {
            $inc: { position: -1 }
        });

        if (result.modifiedCount > 0) {
            return res.status(200).json({
                success: true,
                message: `Positions decreased by 1 for ${result.modifiedCount} document(s) on shelf ${numericShelf}, division ${numericDivision} above position ${numericCurrentPosition}.`,
                modifiedCount: result.modifiedCount
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'No positions were updated — no matching documents for decrease.',
                modifiedCount: 0
            });
        }
    } catch (err) {
        console.error('Error while decreasing positions by shelf and division:', err);
        return res.status(500).json({ success: false, message: 'Server error occurred during position decrease.' });
    }
};

/**
 * Increases positions of all samples in a given shelf and division by a specified amount.
 * Route: PATCH /api/samples/increase-positions-by-amount
 */
exports.increasePositionsByAmount = async (req, res) => {
    console.log(`PATCH /samples/increase-positions-by-amount`);
    let { shelf, division, amountToIncrease } = req.body;

    const numericShelf = Number(shelf);
    const numericDivision = Number(division);
    const numericAmountToIncrease = Number(amountToIncrease);

    if (isNaN(numericShelf) || isNaN(numericDivision) || isNaN(numericAmountToIncrease)) {
        return res.status(400).json({ success: false, message: 'Invalid input types. Shelf, division, and amountToIncrease must be numbers.' });
    }
    if (numericAmountToIncrease <= 0) {
        return res.status(400).json({ success: false, message: 'Amount to increase must be a positive number.' });
    }

    try {
        // Ensure fields are numeric (using your utility) - can be heavy if run often
        await ensureNumericPositionFields(samplesCollection);

        const query = {
            shelf: numericShelf,
            division: numericDivision,
        };

        const result = await samplesCollection.updateMany(query, {
            $inc: { position: numericAmountToIncrease }
        });

        if (result.modifiedCount > 0) {
            return res.status(200).json({
                success: true,
                message: `Positions increased by ${numericAmountToIncrease} for ${result.modifiedCount} document(s) on shelf ${numericShelf}, division ${numericDivision}.`,
                modifiedCount: result.modifiedCount
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'No positions were updated — no matching documents for increase by amount.',
                modifiedCount: 0
            });
        }
    } catch (err) {
        console.error('Error while increasing positions by amount:', err);
        return res.status(500).json({ success: false, message: 'Server error occurred during position increase by amount.' });
    }
};


/**
 * Normalizes positions (renumbers sequentially from 1) for available samples of the user's team
 * within a given shelf and division.
 * Route: PATCH /api/samples/normalize-positions-in-division
 */
exports.normalizePositions = async (req, res) => {
    console.log('PATCH /samples/normalize-positions-in-division');

    const user = req.user;
    const { shelf, division } = req.body;

    // Convert to numbers and validate
    const numericShelf = parseInt(shelf);
    const numericDivision = parseInt(division);

    if (isNaN(numericShelf) || isNaN(numericDivision)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid input types. Shelf and division must be numbers.'
        });
    }

    try {
        // Optional: normalize numeric fields in the collection first
        const normalizedFieldCount = await normalizeFieldsToNumbers(samplesCollection);

        // Fetch only available samples for this team, shelf, and division
        const query = {
            shelf: numericShelf,
            division: numericDivision,
            team: user.team,
            availability: "yes"
        };

        const samples = await samplesCollection.find(query)
            .sort({ position: 1, _id: 1 }) // Sort by position and then _id
            .toArray();

        if (!samples.length) {
            return res.status(200).json({
                success: true,
                message: 'No available samples found for this shelf/division/team.',
                normalizedFieldsUpdated: normalizedFieldCount.updatedCount || 0,
                positionsRenumbered: 0
            });
        }

        // Prepare bulk update operations
        const bulkOps = samples.map((sample, index) => ({
            updateOne: {
                filter: { _id: sample._id },
                update: { $set: { position: index + 1 } }
            }
        }));

        // Execute bulk update
        const result = await samplesCollection.bulkWrite(bulkOps);
        const positionsRenumbered = result.modifiedCount;

        return res.status(200).json({
            success: true,
            message: `Positions normalized successfully for shelf ${numericShelf}, division ${numericDivision}, team ${user.team}.`,
            normalizedFieldsUpdated: normalizedFieldCount.updatedCount || 0,
            positionsRenumbered
        });

    } catch (err) {
        console.error('Error in normalizePositions:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error occurred during position normalization.'
        });
    }
};


// --- DELETE Operations ---

/**
 * Soft deletes a sample by moving it from active/taken collections to the deleted collection.
 * Adjusts positions in the active collection if the sample was from there.
 * Route: DELETE /api/samples/:id (Protected)
 */
exports.deleteSample = async (req, res) => {
    console.log('DELETE /samples/:id (soft delete)');
    const { id } = req.params;
    const userId = req.user?.id;
    const username = req.user?.username;
    const reduceOtherPositions = req.query.reducePositions === "yes"; // Convert to boolean

    const objectId = new ObjectId(id);

    if (!isValidObjectId(objectId)) {
        return res.status(400).json({ success: false, message: 'Invalid sample ID' });
    }

    try {
        const { sample, collectionSource } = await findSampleInCollections(objectId);
        console.log("sample", sample);
        if (!sample) {
            return res.status(404).json({ success: false, message: 'Sorry, Sample not found in either active or taken samples.' });
        }

        // --- Position Reduction Logic (only if from active collection and requested) ---
        if (collectionSource === 'samplesCollection' && reduceOtherPositions) {
            const { shelf, division, position } = sample;
            const numericShelf = parseInt(shelf);
            const numericDivision = parseInt(division);
            const numericPosition = parseInt(position);

            if (isNaN(numericShelf) || isNaN(numericDivision) || isNaN(numericPosition)) {
                console.warn(`Sample ${id} has non-numeric shelf, division, or position. Skipping position reduction for this deletion.`);
            } else {
                try {
                    // Ensure fields are numeric for consistency (using your utility)
                    await ensureNumericPositionFields(samplesCollection);

                    const query = {
                        shelf: numericShelf,
                        division: numericDivision,
                        position: { $gt: numericPosition }
                    };

                    const result = await samplesCollection.updateMany(query, {
                        $inc: { position: -1 }
                    });

                    if (result.modifiedCount > 0) {
                        console.log(`Successfully decreased positions for ${result.modifiedCount} document(s) after deleting ${id}.`);
                    } else {
                        console.log(`No positions were updated for sample ${id} after deletion.`);
                    }
                } catch (err) {
                    console.error('Error while decreasing positions during sample soft deletion:', err);
                    // Do not block deletion even if position adjustment fails
                }
            }
        }
        // --- End Position Reduction Logic ---

        // Prepare sample for deletion (include original _id for traceability in recycle bin)
        const sampleToArchive = {
            ...sample,
            original_id: sample._id, // Keep a record of the original _id
            deletedByUserId: userId,
            deletedBy: username,
            deletedAt: new Date(),
        };
        // Remove the _id property so MongoDB generates a new one upon insertion
        delete sampleToArchive._id;

        // Perform soft deletion (move to deletedSamplesCollection)
        const archiveResult = await deletedSamplesCollection.insertOne(sampleToArchive);
        if (!archiveResult.insertedId) {
            return res.status(500).json({ success: false, message: 'Failed to archive sample to recycle bin.' });
        }

        // Delete from the original collection
        const targetCollection = collectionSource === 'samplesCollection' ? samplesCollection : takenSamplesCollection;
        const deleteResult = await targetCollection.deleteOne({ _id: objectId });

        if (deleteResult.deletedCount === 0) {
            // This case implies sample was removed by another process right before deleteOne.
            return res.status(404).json({ success: false, message: 'Sample not found for final removal from source collection (might have been deleted concurrently).' });
        }
        res.status(200).json({ success: true, message: `Sample ${id} deleted and moved to recycle bin` });

        await logActivity(`${username} deleted ${sampleId}`);

    } catch (error) {
        console.error('Error in deleteSample (soft delete) controller:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred during sample soft deletion.' });
    }
};

/**
 * Permanently deletes a sample from the deleted samples collection (recycle bin).
 * Route: DELETE /api/samples/permanent-delete/:id (Protected)
 */
exports.deleteSamplePermanently = async (req, res) => {
    console.log('DELETE /samples/permanent-delete/:id (permanent delete)');
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid sample ID' });
    }

    try {
        const objectId = new ObjectId(id);

        const sample = await deletedSamplesCollection.findOne({ _id: objectId });

        if (!sample) {
            return res.status(404).json({ success: false, message: 'Sorry, Sample not found in the recycle bin.' });
        }

        const deleteResult = await deletedSamplesCollection.deleteOne({ _id: objectId });

        if (deleteResult.deletedCount === 0) {
            // This case implies sample was removed by another process right before deleteOne.
            return res.status(404).json({ success: false, message: 'Sample not found for permanent deletion (might have been deleted concurrently).' });
        }

        res.status(200).json({ success: true, message: `Sample ${id} permanently deleted from recycle bin.` });

    } catch (error) {
        console.error('Error in deleteSamplePermanently controller:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred during permanent sample deletion.' });
    }
};

exports.deleteAllSamplePermanently = async (req, res) => {
    console.log('delete all deleted samples');
    try {
        const result = await deletedSamplesCollection.deleteMany();

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'No deleted samples found to permanently remove.',
            });
        }

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} deleted samples permanently removed successfully.`,
        });
    } catch (error) {
        console.error('Error deleting all samples permanently:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not delete all samples permanently.',
        });
    }
}

// old controller was only specific for samples collection. deprecated by mahadi
// exports.addSampleIdsToExistingDocuments = async (req, res) => {
//     console.log("addSampleIdsToExistingDocuments");
//     try {

//         // Fetch all documents from the collection
//         // We'll sort them by _id to ensure a consistent order if the script is re-run,
//         // although for initial assignment, any consistent order works.
//         const existingSamplesCursor = samplesCollection.find({ sample_id: { $exists: false } }).sort({ _id: 1 });

//         let count = 0;
//         let bulkOps = []; // Use bulk operations for efficiency

//         while (await existingSamplesCursor.hasNext()) {
//             const doc = await existingSamplesCursor.next();
//             count++;
//             // Generate the unique sample_id based on the current count
//             const uniqueSampleId = `sample${count.toString().padStart(4, '0')}`;

//             // Add an update operation to the bulkOps array
//             bulkOps.push({
//                 updateOne: {
//                     filter: { _id: doc._id },
//                     update: { $set: { sample_id: uniqueSampleId } }
//                 }
//             });

//             // Execute bulk operations in batches to avoid overwhelming the database
//             if (bulkOps.length === 500) { // Process in batches of 500 documents
//                 const result = await samplesCollection.bulkWrite(bulkOps);
//                 console.log(`Executed bulk write for ${bulkOps.length} documents. Updated: ${result.modifiedCount}`);
//                 bulkOps = []; // Reset bulkOps array
//             }
//         }

//         // Execute any remaining bulk operations
//         if (bulkOps.length > 0) {
//             const result = await samplesCollection.bulkWrite(bulkOps);
//             console.log(`Executed final bulk write for ${bulkOps.length} documents. Updated: ${result.modifiedCount}`);
//         }

//         console.log(`Migration complete! Added 'sample_id' to ${count} existing documents.`);
//         res.json({ success: true, message: `Migration complete! Added 'sample_id' to ${count} existing documents.` })

//     } catch (error) {
//         console.error("Error during migration:", error);
//     }
// }

exports.addSampleIdsToExistingDocuments = async (req, res) => {
    console.log("Starting addSampleIdsToExistingDocuments...");

    try {
        const collections = [
            samplesCollection,
            takenSamplesCollection,
            deletedSamplesCollection,
        ];

        const usedIds = new Set();

        // Step 1: Gather all existing sample_id numbers
        for (const collection of collections) {
            const existingIds = await collection
                .find({ sample_id: { $exists: true } }, { projection: { sample_id: 1 } })
                .toArray();

            existingIds.forEach(doc => {
                const match = doc.sample_id?.match(/^sample(\d{4})$/);
                if (match) {
                    usedIds.add(parseInt(match[1], 10));
                }
            });
        }

        // Step 2: Assign new sample_ids only to documents missing them
        let nextId = 1;
        let totalAssigned = 0;

        for (const collection of collections) {
            const cursor = collection.find({ sample_id: { $exists: false } }).sort({ _id: 1 });
            let bulkOps = [];

            while (await cursor.hasNext()) {
                const doc = await cursor.next();

                // Find the next unused ID
                while (usedIds.has(nextId)) {
                    nextId++;
                }

                const newSampleId = `sample${nextId.toString().padStart(6, '0')}`;
                usedIds.add(nextId); // Mark this ID as used
                nextId++;
                totalAssigned++;

                bulkOps.push({
                    updateOne: {
                        filter: { _id: doc._id },
                        update: { $set: { sample_id: newSampleId } },
                    },
                });

                if (bulkOps.length === 500) {
                    const result = await collection.bulkWrite(bulkOps);
                    console.log(`Bulk write: Updated ${result.modifiedCount} documents`);
                    bulkOps = [];
                }
            }

            if (bulkOps.length > 0) {
                const result = await collection.bulkWrite(bulkOps);
                console.log(`Final bulk write: Updated ${result.modifiedCount} documents`);
            }
        }

        console.log(`✅ Migration complete. Assigned ${totalAssigned} new sample_id values.`);
        res.json({
            success: true,
            message: `Migration complete. Assigned ${totalAssigned} new sample_id values.`,
        });

    } catch (error) {
        console.error("❌ Error during migration:", error);
        res.status(500).json({ success: false, message: "Migration failed.", error: error.message });
    }
};

exports.resetAndReassignSampleIds = async (req, res) => {
    console.log("Starting reset and reassign of all sample_ids...");

    try {
        const collections = [
            { name: "samplesCollection", collection: samplesCollection },
            { name: "takenSamplesCollection", collection: takenSamplesCollection },
            { name: "deletedSamplesCollection", collection: deletedSamplesCollection },
        ];

        // Step 1: Fetch all documents from all collections
        const allDocs = [];

        for (const { name, collection } of collections) {
            const docs = await collection.find({}).project({ _id: 1 }).toArray();
            docs.forEach(doc => {
                allDocs.push({ ...doc, collectionName: name });
            });
        }

        // Step 2: Sort all documents by _id for consistent ordering
        allDocs.sort((a, b) => a._id.toString().localeCompare(b._id.toString()));

        // Step 3: Generate new sample_id values
        const idMap = new Map(); // Map<collectionName, bulkOps[]>
        let count = 1;

        for (const doc of allDocs) {
            const newSampleId = `sample${count.toString().padStart(4, '0')}`;
            count++;

            if (!idMap.has(doc.collectionName)) {
                idMap.set(doc.collectionName, []);
            }

            idMap.get(doc.collectionName).push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: { sample_id: newSampleId } },
                },
            });
        }

        // Step 4: Perform bulk updates for each collection
        let totalUpdated = 0;

        for (const { name, collection } of collections) {
            const bulkOps = idMap.get(name) || [];

            if (bulkOps.length > 0) {
                // Split into batches of 500
                for (let i = 0; i < bulkOps.length; i += 500) {
                    const batch = bulkOps.slice(i, i + 500);
                    const result = await collection.bulkWrite(batch);
                    totalUpdated += result.modifiedCount;
                    console.log(`${name}: Updated ${result.modifiedCount} documents`);
                }
            }
        }

        console.log(`✅ Reset and reassigned sample_id for ${totalUpdated} documents.`);
        res.json({
            success: true,
            message: `Reset and reassigned sample_id for ${totalUpdated} documents.`,
        });

    } catch (error) {
        console.error("❌ Error during forced reset:", error);
        res.status(500).json({ success: false, message: "Forced reset failed.", error: error.message });
    }
};
