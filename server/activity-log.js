const db = require("./database");

function logActivity(userId, action, description) {
    try {
        db.prepare(`
            INSERT INTO activity_logs (
                user_id,
                action,
                description
            )
            VALUES (?, ?, ?)
        `).run(
            userId,
            action,
            description
        );
    } catch (error) {
        console.error("Activity log error:", error);
    }
}

module.exports = logActivity;