const { ObjectId } = require("mongodb");
const { db } = require("../db");

const usersCollection = db.collection("users");
/**
 * Checks if a user is verified and approved.
 * @param {Object} user - The user object from req.user
 * @returns {Object} - { eligible: boolean, message: string }
 */
async function checkUserVerification(user) {
    try {
        if (!user) {
            return { eligible: false, message: "User information missing." };
        }
        const userInfoFromDB = await usersCollection.findOne({_id: new ObjectId(user._id)});

        const { verification, approval, role } = userInfoFromDB;
        // console.log(userInfoFromDB)

        // Optionally, allow admin to bypass
        if (role === "admin") {
            return { eligible: true };
        }

        if (!verification) {
            return { eligible: false, message: "Your account is not verified." };
        }

        if (!approval) {
            return { eligible: false, message: "Your account is not approved." };
        }

        return { eligible: true }; // Passed ✅
    } catch (err) {
        console.error("Error checking user verification:", err);
        return { eligible: false, message: "Error checking user verification." };
    }
}

module.exports = { checkUserVerification };




// usage example

//     const verification = await checkUserVerification(user);
//     if (!verification.eligible) {
//         return res.status(403).json({
//             success: false,
//             message: verification.message
//         });
//     }

//     // Continue with your controller logic
//     res.status(200).json({ success: true, message: "User is verified and approved." });