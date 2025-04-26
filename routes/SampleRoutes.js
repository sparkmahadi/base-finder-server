// backend/routes/sampleRoutes.js
const express = require('express');
const samplesController = require('../controllers/samples.controller');
const { deleteSample, restoreSample, getDeletedSamples } = require('../controllers/sampleController');
const { db } = require('../db');

const router = express.Router();

router.route("/")
    // Route to get all samples
    .get(samplesController.getSamples)
    .post(samplesController.postSample);

router.post('/upload-excel', async (req, res) => {
    console.log('hit upload excel');
    try {
        const { samples } = req.body;
        console.log(samples);
        if (!samples || !Array.isArray(samples)) {
            return res.status(400).json({ message: 'Invalid samples data' });
        }

        const samplesCollection = db.collection('samples');

        let insertedCount = 0;
        for (const sampleData of samples) {
            const exists = await samplesCollection.findOne({
                style: sampleData.style,
                category: sampleData.category,
            });

            if (!exists) {
                await samplesCollection.insertOne(sampleData);
                insertedCount++;
            }
        }

        res.status(200).json({ message: `${insertedCount} new samples uploaded successfully!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
});



router.delete('/:id', protect, deleteSample);
router.get('/deleted-samples', protect, getDeletedSamples);
router.post('/deleted-samples/restore/:id', protect, restoreSample);

// Route to update an existing sample
router.put('/:id', samplesController.updateSample);


module.exports = router;
