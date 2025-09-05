const { db } = require("../db");
const teamsCollection = db.collection("teams");

/**
 * Retrieves team info and buyers list for a given user.
 * @param {Object} user - The user object from req.user
 * @returns {Object} - { success: boolean, team: object, buyersList: array, message?: string }
 */
async function getUserTeam(user) {
    try {
        if (!user) {
            return { success: false, message: "User info missing." };
        }

        const userId = user._id || user.id;
        if (!userId) {
            return { success: false, message: "User ID not found." };
        }

        const team = await teamsCollection.findOne({
            "members.user_id": userId
        });

        if (!team) {
            return { success: false, message: "Team not found for this user." };
        }

        const buyersList = Array.isArray(team.buyers) ? team.buyers : [];

        return { success: true, team, buyersList };
    } catch (err) {
        console.error("Error fetching user team:", err);
        return { success: false, message: "Error fetching team info." };
    }
}

module.exports = { getUserTeam };


// usage example
// ✅ Use reusable team utility
// const { success, team, buyersList, message } = await getUserTeam(user);

// if (!success) {
//     return res.status(404).json({ success: false, message });
// }