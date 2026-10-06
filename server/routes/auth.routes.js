const express = require("express");
const bcrypt = require("bcrypt");

const db = require("../database");

const router = express.Router();


// ========================================
// LOGIN HELPER
// ========================================

// Handles the login process for both admins
// and employees.
//
// expectedRole determines which type of account
// is allowed to log in through the endpoint.

async function loginUser(
    req,
    res,
    expectedRole
) {

    try {

        const {
            email,
            password
        } = req.body;


        // ========================================
        // VALIDATE INPUT
        // ========================================

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }


        // ========================================
        // FIND USER BY EMAIL
        // ========================================

        const user = db.prepare(`
            SELECT *
            FROM users
            WHERE email = ?
        `).get(email);


        // ========================================
        // USER DOES NOT EXIST
        // ========================================

        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        // ========================================
        // CHECK ACCOUNT STATUS
        // ========================================

        if (!user.is_active) {

            return res.status(403).json({

                success: false,

                message:
                    "This account has been deactivated."

            });

        }


        // ========================================
        // VERIFY USER ROLE
        // ========================================

        if (user.role !== expectedRole) {

            return res.status(403).json({

                success: false,

                message:
                    `This account is not registered as ${expectedRole}.`

            });

        }


        // ========================================
        // CHECK PASSWORD
        // ========================================

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        // ========================================
        // PASSWORD IS INCORRECT
        // ========================================

        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        // ========================================
        // CREATE LOGIN SESSION
        // ========================================

        req.session.user = {

            id: user.id,

            email: user.email,

            full_name: user.full_name,

            profile_image: user.profile_image,

            role: user.role

        };


        // ========================================
        // LOGIN SUCCESSFUL
        // ========================================

        return res.json({

            success: true,

            message: "Login successful.",

            user: req.session.user

        });


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "An unexpected error occurred."

        });

    }

}


// ========================================
// EMPLOYEE LOGIN
// ========================================

router.post(
    "/employee-login",
    async (req, res) => {

        await loginUser(
            req,
            res,
            "employee"
        );

    }
);


// ========================================
// ADMIN LOGIN
// ========================================

router.post(
    "/admin-login",
    async (req, res) => {

        await loginUser(
            req,
            res,
            "admin"
        );

    }
);


// ========================================
// GET CURRENT USER
// ========================================

router.get(
    "/me",
    (req, res) => {

        if (!req.session.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Not authenticated."

            });

        }


        res.json({

            success: true,

            user: req.session.user

        });

    }
);


// ========================================
// LOGOUT
// ========================================

router.post(
    "/logout",
    (req, res) => {

        req.session.destroy(
            (error) => {

                if (error) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Could not log out."

                    });

                }


                res.clearCookie(
                    "connect.sid"
                );


                res.json({

                    success: true,

                    message:
                        "Logout successful."

                });

            }
        );

    }
);


// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;