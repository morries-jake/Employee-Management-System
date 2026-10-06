const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");

const {
    requireLogin,
    requireAdmin
} = require("./middleware/auth");

dotenv.config();

const app = express();


// ========================================
// ROUTES
// ========================================

const authRoutes =
    require("./routes/auth.routes");

const taskRoutes =
    require("./routes/task.routes");

const employeeRoutes =
    require("./routes/employee.routes");

const activityRoutes =
    require("./routes/activity.routes");

const profileRoutes =
    require("./routes/profile.routes");


// ========================================
// DATABASE
// ========================================

require("./database");


// ========================================
// MIDDLEWARE
// ========================================

// Parse JSON request bodies.

app.use(
    express.json()
);


// Parse form data.

app.use(
    express.urlencoded({
        extended: true
    })
);


// Serve frontend files.

app.use(
    express.static(
        path.join(
            __dirname,
            "../public"
        )
    )
);


// ========================================
// SESSION
// ========================================

app.use(
    session({

        secret:
            process.env.SESSION_SECRET ||
            "development_secret",

        resave: false,

        saveUninitialized: false,

        cookie: {

            httpOnly: true,

            secure: false,

            maxAge:
                1000 *
                60 *
                60 *
                8

        }

    })
);


// ========================================
// API ROUTES
// ========================================

app.use(
    "/api/auth",
    authRoutes
);


app.use(
    "/api/tasks",
    taskRoutes
);


app.use(
    "/api/employees",
    employeeRoutes
);


app.use(
    "/api/activity",
    activityRoutes
);


// PROFILE ROUTES

app.use(
    "/api/profile",
    profileRoutes
);


// ========================================
// HEALTH CHECK
// ========================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Employee Task Management API is running."

        });

    }
);


// ========================================
// PROTECTED TEST ROUTES
// ========================================

app.get(
    "/api/test/login-required",
    requireLogin,
    (req, res) => {

        res.json({

            success: true,

            message:
                "You are logged in.",

            user:
                req.session.user

        });

    }
);


app.get(
    "/api/test/admin-only",
    requireAdmin,
    (req, res) => {

        res.json({

            success: true,

            message:
                "You have admin access.",

            user:
                req.session.user

        });

    }
);


// ========================================
// START SERVER
// ========================================

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);