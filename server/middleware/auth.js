// ========================================
// REQUIRE LOGIN
// ========================================

function requireLogin(req, res, next) {

    // Check if a user is logged in
    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });

    }

    // User is logged in
    next();
}


// ========================================
// REQUIRE ADMIN
// ========================================

function requireAdmin(req, res, next) {

    // First check if user is logged in
    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });

    }


    // Check user's role
    if (req.session.user.role !== "admin") {

        return res.status(403).json({
            success: false,
            message: "Admin access required."
        });

    }


    // User is an admin
    next();
}


// ========================================
// EXPORT MIDDLEWARE
// ========================================

module.exports = {
    requireLogin,
    requireAdmin
};