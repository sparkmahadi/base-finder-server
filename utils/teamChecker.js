const { db } = require("../db");

async function checkTeamEligibility(user, buyerName) {
  try {
    if (!user) {
      return { eligible: false, message: "User info missing." };
    }

    const { team, role } = user;

    // Optional: allow admin to bypass
    if (role === "superuser") {
      return { eligible: true };
    }

    if (!team) {
      return { eligible: false, message: "User has no team assigned." };
    }

    const teamsCollection = db.collection("teams");
    const teamDetails = await teamsCollection.findOne({ team_name: team });

    if (!teamDetails || !Array.isArray(teamDetails.buyers)) {
      return { eligible: false, message: "Team details not found or invalid." };
    }

    // 🔑 Just check buyer against team’s buyers list
    if (!teamDetails.buyers.includes(buyerName)) {
      return {
        eligible: false,
        message: `You are not eligible to access buyer: ${buyerName}.`
      };
    }

    return { eligible: true };
  } catch (err) {
    console.error("Error in checkTeamEligibility:", err);
    return { eligible: false, message: "Error checking team eligibility." };
  }
}

module.exports = { checkTeamEligibility };


// usage example
// ✅ Reusable eligibility check
// const eligibility = await checkTeamEligibility(user, sample.buyer);
// if (!eligibility.eligible) {
//   return res.status(403).json({
//     success: false,
//     message: eligibility.message
//   });
// }