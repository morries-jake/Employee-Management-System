const express = require("express");
const bcrypt = require("bcrypt");

const db = require("../database");

const {
    requireAdmin
} = require("../middleware/auth");

const logActivity = require("../activity-log");

const router = express.Router();


// ========================================
// GET ALL EMPLOYEES
// ADMIN ONLY
// ========================================

router.get("/", requireAdmin, (req, res) => {

    try {

        const employees = db.prepare(`
            SELECT
                users.id,
                users.email,
                users.full_name,
                users.role,
                users.is_active,
                users.profile_image,
                users.created_at,
                COUNT(tasks.id) AS task_count
            FROM users

            LEFT JOIN tasks
                ON tasks.assigned_to = users.id

            WHERE users.role = 'employee'

            GROUP BY
                users.id

            ORDER BY
                users.full_name ASC
        `).all();


        res.json({
            success: true,
            employees
        });


    } catch (error) {

        console.error(
            "Get employees error:",
            error
        );


        res.status(500).json({
            success: false,
            message:
                "An unexpected error occurred."
        });

    }

});


// ========================================
// CREATE EMPLOYEE
// ADMIN ONLY
// ========================================

router.post(
    "/",
    requireAdmin,
    async (req, res) => {

        try {

            const {
                email,
                password,
                full_name
            } = req.body;


            // ========================================
            // VALIDATE REQUIRED FIELDS
            // ========================================

            if (
                !email ||
                !password ||
                !full_name
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email, password, and full name are required."
                });

            }


            // ========================================
            // CLEAN INPUT
            // ========================================

            const cleanEmail =
                email.trim().toLowerCase();

            const cleanFullName =
                full_name.trim();


            // ========================================
            // VALIDATE FULL NAME
            // ========================================

            if (cleanFullName.length < 2) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Full name must be at least 2 characters long."
                });

            }


            // ========================================
            // VALIDATE EMAIL FORMAT
            // ========================================

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (!emailPattern.test(cleanEmail)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid email address."
                });

            }


            // ========================================
            // VALIDATE PASSWORD
            // ========================================

            if (password.length < 8) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 8 characters long."
                });

            }


            // ========================================
            // CHECK EMAIL
            // ========================================

            const existingUser = db.prepare(`
                SELECT
                    id
                FROM users
                WHERE email = ?
            `).get(cleanEmail);


            if (existingUser) {

                return res.status(409).json({
                    success: false,
                    message:
                        "An account with this email already exists."
                });

            }


            // ========================================
            // HASH PASSWORD
            // ========================================

            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );


            // ========================================
            // CREATE EMPLOYEE
            // ========================================

            const insertEmployee = db.prepare(`
                INSERT INTO users (
                    email,
                    password_hash,
                    full_name,
                    profile_image,
                    role,
                    is_active
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    NULL,
                    'employee',
                    1
                )
            `);


            const result =
                insertEmployee.run(
                    cleanEmail,
                    passwordHash,
                    cleanFullName
                );


            // ========================================
            // GET NEW EMPLOYEE
            // ========================================

            const employee = db.prepare(`
                SELECT
                    id,
                    email,
                    full_name,
                    role,
                    is_active,
                    profile_image,
                    created_at
                FROM users
                WHERE id = ?
            `).get(
                result.lastInsertRowid
            );


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(
                req.session.user.id,
                "EMPLOYEE_CREATED",
                `Created employee account for ${employee.full_name} (${employee.email})`
            );


            // ========================================
            // RESPONSE
            // ========================================

            res.status(201).json({
                success: true,
                message:
                    "Employee created successfully.",
                employee
            });


        } catch (error) {

            console.error(
                "Create employee error:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "An unexpected error occurred."
            });

        }

    }
);


// ========================================
// UPDATE EMPLOYEE
// ADMIN ONLY
// ========================================
//
// Admin can update:
// - Email
// - Full Name
//
// Admin cannot change:
// - Role
// - Password
// - Account status
//
// Account status has its own endpoint.
// Password is handled through account settings.
// ========================================

router.put(
    "/:id",
    requireAdmin,
    (req, res) => {

        try {

            const employeeId =
                req.params.id;


            const {
                email,
                full_name
            } = req.body;


            // ========================================
            // VALIDATE REQUIRED FIELDS
            // ========================================

            if (
                !email ||
                !full_name
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email and full name are required."
                });

            }


            // ========================================
            // CLEAN INPUT
            // ========================================

            const cleanEmail =
                email.trim().toLowerCase();

            const cleanFullName =
                full_name.trim();


            // ========================================
            // VALIDATE FULL NAME
            // ========================================

            if (cleanFullName.length < 2) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Full name must be at least 2 characters long."
                });

            }


            // ========================================
            // VALIDATE EMAIL
            // ========================================

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (!emailPattern.test(cleanEmail)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid email address."
                });

            }


            // ========================================
            // FIND EMPLOYEE
            // ========================================

            const employee = db.prepare(`
                SELECT *
                FROM users
                WHERE id = ?
                AND role = 'employee'
            `).get(employeeId);


            if (!employee) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Employee not found."
                });

            }


            // ========================================
            // CHECK EMAIL
            // ========================================

            const existingUser = db.prepare(`
                SELECT
                    id
                FROM users
                WHERE email = ?
                AND id != ?
            `).get(
                cleanEmail,
                employeeId
            );


            if (existingUser) {

                return res.status(409).json({
                    success: false,
                    message:
                        "An account with this email already exists."
                });

            }


            // ========================================
            // UPDATE EMPLOYEE
            // ========================================

            db.prepare(`
                UPDATE users
                SET
                    email = ?,
                    full_name = ?
                WHERE id = ?
            `).run(
                cleanEmail,
                cleanFullName,
                employeeId
            );


            // ========================================
            // GET UPDATED EMPLOYEE
            // ========================================

            const updatedEmployee = db.prepare(`
                SELECT
                    id,
                    email,
                    full_name,
                    role,
                    is_active,
                    profile_image,
                    created_at
                FROM users
                WHERE id = ?
            `).get(employeeId);


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(
                req.session.user.id,
                "EMPLOYEE_UPDATED",
                `Updated employee account for ${updatedEmployee.full_name} (${updatedEmployee.email})`
            );


            // ========================================
            // RESPONSE
            // ========================================

            res.json({
                success: true,
                message:
                    "Employee updated successfully.",
                employee:
                    updatedEmployee
            });


        } catch (error) {

            console.error(
                "Update employee error:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "An unexpected error occurred."
            });

        }

    }
);


// ========================================
// ACTIVATE / DEACTIVATE EMPLOYEE
// ADMIN ONLY
// ========================================

router.patch(
    "/:id/status",
    requireAdmin,
    (req, res) => {

        try {

            const employeeId =
                req.params.id;


            const {
                is_active
            } = req.body;


            // ========================================
            // VALIDATE STATUS
            // ========================================

            if (
                is_active !== 0 &&
                is_active !== 1
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "is_active must be 0 or 1."
                });

            }


            // ========================================
            // FIND EMPLOYEE
            // ========================================

            const employee = db.prepare(`
                SELECT *
                FROM users
                WHERE id = ?
                AND role = 'employee'
            `).get(employeeId);


            if (!employee) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Employee not found."
                });

            }


            // ========================================
            // UPDATE STATUS
            // ========================================

            db.prepare(`
                UPDATE users
                SET
                    is_active = ?
                WHERE id = ?
            `).run(
                is_active,
                employeeId
            );


            // ========================================
            // GET UPDATED EMPLOYEE
            // ========================================

            const updatedEmployee = db.prepare(`
                SELECT
                    id,
                    email,
                    full_name,
                    role,
                    is_active,
                    profile_image,
                    created_at
                FROM users
                WHERE id = ?
            `).get(employeeId);


            // ========================================
            // ACTIVITY LOG
            // ========================================

            const action =
                is_active === 1
                    ? "EMPLOYEE_ACTIVATED"
                    : "EMPLOYEE_DEACTIVATED";


            const description =
                is_active === 1
                    ? `Activated employee account for ${updatedEmployee.full_name} (${updatedEmployee.email})`
                    : `Deactivated employee account for ${updatedEmployee.full_name} (${updatedEmployee.email})`;


            logActivity(
                req.session.user.id,
                action,
                description
            );


            // ========================================
            // RESPONSE
            // ========================================

            res.json({
                success: true,
                message:
                    is_active === 1
                        ? "Employee activated successfully."
                        : "Employee deactivated successfully.",
                employee:
                    updatedEmployee
            });


        } catch (error) {

            console.error(
                "Update employee status error:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "An unexpected error occurred."
            });

        }

    }
);


// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;