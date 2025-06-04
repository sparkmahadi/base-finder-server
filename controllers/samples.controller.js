const { db } = require("../db");
const { ObjectId } = require("mongodb");
const normalizeFieldsToNumbers = require('../utils/nomalizeFieldsToNumbers');

// Collection References
const samplesCollection = db.collection("samples");
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
const findSampleInCollections = async (objectId) => {
    let sample = await samplesCollection.findOne({ _id: objectId });
    if (sample) {
        return { sample, collectionSource: 'samplesCollection' };
    }

    sample = await takenSamplesCollection.findOne({ _id: objectId });
    if (sample) {
        return { sample, collectionSource: 'takenSamplesCollection' };
    }

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
    console.log('GET /samples (all samples)');
    try {
        const activeSamples = await samplesCollection.find().toArray();
        const takenSamples = await takenSamplesCollection.find().toArray();
        const allSamples = [...activeSamples, ...takenSamples];

        res.status(200).json({
            success: true,
            message: `${allSamples.length} samples found`,
            samples: allSamples,
        });
    } catch (error) {
        console.error('Error fetching all samples:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred while fetching all samples.' });
    }
};

/**
 * Retrieves sample details by ID, checking both active and taken collections.
 * Route: GET /api/samples/:id
 */
exports.getSampleDetails = async (req, res) => {
    console.log('GET /samples/:id');
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid sample ID' });
    }

    try {
        const objectId = new ObjectId(id);
        const { sample, collectionSource } = await findSampleInCollections(objectId);

        if (sample) {
            return res.status(200).json({
                success: true,
                message: `Sample details found in ${collectionSource}`,
                sample: sample,
            });
        } else {
            return res.status(404).json({ success: false, message: 'Sample not found' });
        }
    } catch (error) {
        console.error('Error fetching sample details:', error);
        res.status(500).json({ success: false, message: 'Server Error occurred while fetching sample details.' });
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
        const result = await takenSamplesCollection.find().toArray();
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
    try {
        const { position, shelf, division, ...otherSampleData } = req.body;

        const numericPosition = Number(position);
        const numericShelf = Number(shelf);
        const numericDivision = Number(division);

        if (isNaN(numericPosition) || numericPosition < 1 || isNaN(numericShelf) || isNaN(numericDivision)) {
            return res.status(400).json({ success: false, message: "Invalid position, shelf, or division. Ensure they are valid numbers and position is positive." });
        }

        // Step 1: Shift existing samples down by 1 position (if applicable)
        await samplesCollection.updateMany(
            {
                shelf: numericShelf,
                division: numericDivision,
                position: { $gte: numericPosition }
            },
            {
                $inc: { position: 1 }
            }
        );

        // Step 2: Prepare and insert the new sample
        const newSample = {
            ...otherSampleData,
            position: numericPosition,
            shelf: numericShelf,
            division: numericDivision,
            availability: "yes", // Assuming new samples are always available
            added_at: new Date(),
            // Consider adding 'added_by' from req.user if applicable
        };

        const result = await samplesCollection.insertOne(newSample);

        if (result.insertedId) {
            return res.status(201).json({ success: true, message: 'Sample inserted successfully', id: result.insertedId });
        }
        res.status(500).json({ success: false, message: 'Failed to insert sample into the database.' });
    } catch (error) {
        console.error('Error inserting sample:', error);
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
 * Moves a sample from the active collection to the taken collection,
 * and adjusts positions in the active collection.
 * Route: PUT /api/samples/:id/take
 */
exports.takeSample = async (req, res) => {
    console.log('PUT /samples/:id/take');
    const sampleId = req.params.id;
    const { taken_by, purpose } = req.body;

    if (!taken_by || !purpose) {
        return res.status(400).json({ success: false, message: "Missing 'taken_by' or 'purpose' in request body." });
    }
    if (!isValidObjectId(sampleId)) {
        return res.status(400).json({ success: false, message: 'Invalid sample ID' });
    }

    try {
        const objectId = new ObjectId(sampleId);
        // Step 1: Fetch the sample from samplesCollection
        const sample = await samplesCollection.findOne({ _id: objectId });
        if (!sample) {
            return res.status(404).json({ success: false, message: "Sample not found in active samples collection. It might be already taken or doesn't exist." });
        }

        const timestamp = new Date();
        const logEntry = {
            taken_by,
            purpose,
            taken_at: timestamp
        };

        // Remove the original _id before inserting into takenSamplesCollection
        const { _id, ...restOfSample } = sample;

        const updatedSampleForTaken = {
            ...restOfSample,
            last_taken_by: taken_by,
            last_taken_at: timestamp,
            availability: "no",
            taken_logs: [...(sample.taken_logs || []), logEntry],
            original_sample_id: objectId // Store the original ID for traceability
        };

        // Step 2: Insert into takenSamples collection (this will generate a NEW _id)
        const insertResult = await takenSamplesCollection.insertOne(updatedSampleForTaken);
        if (!insertResult.insertedId) {
            return res.status(500).json({ success: false, message: "Failed to archive the sample to taken samples." });
        }
        const newTakenSampleId = insertResult.insertedId;

        // Step 3: Adjust position of samples below in the same shelf/division
        await samplesCollection.updateMany(
            {
                shelf: sample.shelf,
                division: sample.division,
                position: { $gt: sample.position }
            },
            { $inc: { position: -1 } }
        );

        // Step 4: Delete the original sample from active samples collection
        const deleteResult = await samplesCollection.deleteOne({ _id: objectId });
        if (deleteResult.deletedCount === 0) {
            // This indicates a problem: sample was inserted into taken but not deleted from main
            // Log this as a critical error for manual intervention
            console.error(`CRITICAL ERROR: Sample ${sampleId} moved to taken, but failed to delete from active. Manual intervention needed.`);
            return res.status(500).json({ success: false, message: "Sample archived but failed to remove original. Contact support." });
        }

        return res.status(200).json({
            success: true,
            message: `Sample ${sample.style} (${sample.category}) taken by ${taken_by} for "${purpose}".`,
            taken_by,
            taken_at: timestamp,
            purpose,
            new_taken_sample_id: newTakenSampleId
        });

    } catch (err) {
        console.error("Error in takeSample:", err);
        return res.status(500).json({ success: false, message: "Server error occurred while taking sample." });
    }
};

/**
 * Moves a sample from the taken collection back to the active collection,
 * and adjusts positions in the active collection.
 * Route: PUT /api/samples/putback/:id
 */
exports.putBackSample = async (req, res) => {
    console.log('PUT /samples/putback/:id');
    const sampleId = req.params.id; // This is the _id from takenSamplesCollection
    const { position, returned_by, return_purpose } = req.body;

    const numericPosition = Number(position);

    if (!isValidObjectId(sampleId) || isNaN(numericPosition) || numericPosition < 1 || !returned_by) {
        return res.status(400).json({ success: false, message: "Invalid sample ID, position, or missing 'returned_by'." });
    }

    try {
        const objectId = new ObjectId(sampleId);
        // Step 1: Find the sample in takenSamplesCollection using its current _id
        const sample = await takenSamplesCollection.findOne({ _id: objectId });
        if (!sample) {
            return res.status(404).json({ success: false, message: "Sample not found in taken samples collection." });
        }

        const { shelf, division } = sample;

        // Step 2: Delete from takenSamplesCollection first
        const deletionResult = await takenSamplesCollection.deleteOne({ _id: objectId });
        if (deletionResult.deletedCount === 0) {
            return res.status(500).json({ success: false, message: "Failed to remove sample from taken samples (might have already been returned or deleted concurrently)." });
        }

        // Step 3: Shift positions in samplesCollection for existing samples at or after the new position
        await samplesCollection.updateMany(
            { shelf, division, position: { $gte: numericPosition } },
            { $inc: { position: 1 } }
        );

        // Step 4: Prepare and insert back into samplesCollection (this will generate a NEW _id)
        const { _id, original_sample_id, taken_logs, ...restOfSample } = sample; // Exclude _id and possibly original_sample_id, taken_logs from the direct copy

        const restoredSample = {
            ...restOfSample,
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
            last_taken_by: null, // Clear last taken info
            last_taken_at: null,
            // If original_sample_id was tracked, we might want to keep it or use it as the new _id if possible,
            // but for simplicity and new position logic, a new _id is often generated.
            // If you want to reuse the original ID, you'd need a more complex strategy.
            // For now, it will be a new ID unless explicitly set.
        };

        const insertResult = await samplesCollection.insertOne(restoredSample);
        if (!insertResult.insertedId) {
            console.error('Insertion failed when putting sample back.');
            return res.status(500).json({ success: false, message: "Failed to insert sample back into active samples." });
        }
        const newPutBackSampleId = insertResult.insertedId;

        return res.status(200).json({
            success: true,
            message: `Sample successfully put back at position ${numericPosition} on shelf ${shelf} - division ${division}.`,
            new_sample_id: newPutBackSampleId
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
 * Normalizes positions (renumbers them sequentially from 1) within a given shelf and division.
 * Route: PATCH /api/samples/normalize-positions-in-division
 */
exports.normalizePositions = async (req, res) => {
    console.log('PATCH /samples/normalize-positions-in-division');
    let { shelf, division } = req.body;

    const numericShelf = parseInt(shelf);
    const numericDivision = parseInt(division);

    if (isNaN(numericShelf) || isNaN(numericDivision)) {
        return res.status(400).json({ success: false, message: 'Invalid input types. Shelf and division must be numbers.' });
    }

    try {
        // Step 1: Normalize all relevant fields to numbers using the external utility.
        // This is crucial before sorting by position for renumbering.
        const normalizedFieldCount = await normalizeFieldsToNumbers(samplesCollection);

        // Step 2: Fetch normalized and sorted documents for given shelf & division
        const docs = await samplesCollection.find({ shelf: numericShelf, division: numericDivision })
            .sort({ position: 1, _id: 1 }) // Sort by position, then _id for consistent ordering
            .toArray();

        // Step 3: Prepare bulk renumbering updates
        const bulkOps = docs.map((doc, index) => ({
            updateOne: {
                filter: { _id: doc._id },
                update: { $set: { position: index + 1 } }
            }
        }));

        let positionsRenumberedCount = 0;
        if (bulkOps.length > 0) {
            const result = await samplesCollection.bulkWrite(bulkOps);
            positionsRenumberedCount = result.modifiedCount;
        }

        res.status(200).json({
            success: true,
            message: `Positions normalized successfully for shelf ${numericShelf}, division ${numericDivision}.`,
            normalizedFieldsUpdated: normalizedFieldCount.updatedCount || 0, // Ensure it's a number
            positionsRenumbered: positionsRenumberedCount
        });

    } catch (err) {
        console.error('Error in normalizePositions:', err);
        res.status(500).json({ success: false, message: 'Server error occurred during position normalization.' });
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

    if (!isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid sample ID' });
    }

    try {
        const objectId = new ObjectId(id);
        const { sample, collectionSource } = await findSampleInCollections(objectId);

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