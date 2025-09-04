const express = require('express');
const {
  getAllLogs,
  createLog,
  updateLog,
  deleteLog,
  addTeamToEmptyPatterns,
  getPatternById,
} = require('../../controllers/v2/patternReleaseController');
const { protect } = require('../../middlewares/authMiddlewares'); // Assuming 'protect' is for authentication

const router = express.Router();

router.route('/')
  .get(protect, getAllLogs)  // GET /api/logs
  .post(createLog); // POST /api/logs


  router.route("/get-pattern-by-id/:id").get(getPatternById)

router.patch('/add-team-to-empty-patterns', addTeamToEmptyPatterns)

router.route('/:id')
  .put(updateLog)    // PUT /api/logs/:id
  .delete(deleteLog); // DELETE /api/logs/:id

module.exports = router;