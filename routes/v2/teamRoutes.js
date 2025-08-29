const express = require('express');
const router = express.Router();
const teamsController = require('../../controllers/v2/teams.controller');
const { protect } = require('../../middlewares/authMiddlewares'); // Assuming 'protect' is for authentication

// --- Public Routes ---


// Utility and Query Routes (more specific than /:id)
router.route('/').get(teamsController.getAllTeams)
    .post(teamsController.createTeam);

router.route("/:id").get(teamsController.getTeamById)
    .put(teamsController.updateTeam)
    .delete(teamsController.deleteTeam)


module.exports = router;