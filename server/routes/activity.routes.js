const express = require("express");
const db = require("../database");

const {
    requireAdmin
} = require("../middleware/auth");

const router = express.Router();


// ========================================
// GET ACTIVITY LOGS
// ========================================

router.get("/", requireAdmin, (req, res) => {
    try {

        const activities = db.prepare(`
            SELECT
                activity_logs.id,
                activity_logs.action,
                activity_logs.description,
                activity_logs.created_at,
                users.full_name AS user_name
            FROM activity_logs

            LEFT JOIN users
                ON activity_logs.user_id = users.id

            ORDER BY activity_logs.created_at DESC
        `).all();

        res.json({
            success: true,
            activities
        });

    } catch (error) {

        console.error("Get activity logs error:", error);

        res.status(500).json({
            success: false,
            message: "An unexpected error occurred."
        });

    }
});


module.exports = router;