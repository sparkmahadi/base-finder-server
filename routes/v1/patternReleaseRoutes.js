const express = require('express');
const {
  getAllLogs,
  createLog,
  updateLog,
  deleteLog,
} = require('../../controllers/v1/patternReleaseController');

const router = express.Router();

router.route('/')
  .get(getAllLogs)  // GET /api/logs
  .post(createLog); // POST /api/logs

router.route('/:id')
  .put(updateLog)    // PUT /api/logs/:id
  .delete(deleteLog); // DELETE /api/logs/:id

module.exports = router;