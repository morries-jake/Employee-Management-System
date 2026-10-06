const express = require("express");

const db = require("../database");

const logActivity = require("../activity-log");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

const router = express.Router();


// ========================================
// CREATE TASK
// ========================================

router.post("/", requireAdmin, (req, res) => {

    try {

        const {
            title,
            description,
            assigned_to,
            priority,
            deadline
        } = req.body;


        // ========================================
        // VALIDATION
        // ========================================

        if (
            !title ||
            !assigned_to ||
            !priority ||
            !deadline
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Title, assigned employee, priority, and deadline are required."
            });

        }


        // ========================================
        // CHECK EMPLOYEE
        // ========================================

        const employee = db.prepare(`
            SELECT
                id,
                email,
                full_name,
                role,
                is_active

            FROM users

            WHERE id = ?
        `).get(assigned_to);


        if (!employee) {

            return res.status(404).json({
                success: false,
                message: "Employee not found."
            });

        }


        if (employee.role !== "employee") {

            return res.status(400).json({
                success: false,
                message:
                    "Tasks can only be assigned to employees."
            });

        }


        if (!employee.is_active) {

            return res.status(400).json({
                success: false,
                message:
                    "This employee is inactive."
            });

        }


        // ========================================
        // INSERT TASK
        // ========================================

        const insertTask = db.prepare(`
            INSERT INTO tasks (
                title,
                description,
                assigned_to,
                priority,
                deadline
            )

            VALUES (?, ?, ?, ?, ?)
        `);


        const result = insertTask.run(
            title.trim(),
            description
                ? description.trim()
                : null,
            assigned_to,
            priority,
            deadline
        );


        // ========================================
        // GET CREATED TASK
        // ========================================

        const task = db.prepare(`
            SELECT
                tasks.*,

                users.full_name AS assigned_employee

            FROM tasks

            INNER JOIN users
                ON tasks.assigned_to = users.id

            WHERE tasks.id = ?
        `).get(result.lastInsertRowid);


        // ========================================
        // ACTIVITY LOG
        // ========================================

        logActivity(
            req.session.user.id,
            "TASK_CREATED",
            `Created task "${title}" and assigned it to ${employee.full_name}`
        );


        // ========================================
        // RESPONSE
        // ========================================

        res.status(201).json({
            success: true,
            message: "Task created successfully.",
            task
        });


    } catch (error) {

        console.error(
            "Create task error:",
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
// GET ALL TASKS
// ADMIN ONLY
// WITH SEARCH & FILTERS
// ========================================

router.get("/", requireAdmin, (req, res) => {

    try {

        const {
            search,
            employee,
            status,
            priority,
            overdue
        } = req.query;


        let query = `
            SELECT
                tasks.id,
                tasks.title,
                tasks.description,
                tasks.assigned_to,
                tasks.priority,
                tasks.status,
                tasks.created_at,
                tasks.deadline,
                tasks.completed_at,

                users.full_name AS assigned_employee

            FROM tasks

            INNER JOIN users
                ON tasks.assigned_to = users.id
        `;


        const conditions = [];
        const parameters = [];


        // ========================================
        // SEARCH TASK TITLE
        // ========================================

        if (search) {

            conditions.push(`
                tasks.title LIKE ?
            `);

            parameters.push(
                `%${search}%`
            );

        }


        // ========================================
        // FILTER BY EMPLOYEE
        // ========================================

        if (employee) {

            conditions.push(`
                tasks.assigned_to = ?
            `);

            parameters.push(employee);

        }


        // ========================================
        // FILTER BY STATUS
        // ========================================

        if (status) {

            conditions.push(`
                tasks.status = ?
            `);

            parameters.push(status);

        }


        // ========================================
        // FILTER BY PRIORITY
        // ========================================

        if (priority) {

            conditions.push(`
                tasks.priority = ?
            `);

            parameters.push(priority);

        }


        // ========================================
        // FILTER OVERDUE TASKS
        // ========================================

        if (overdue === "true") {

            conditions.push(`
                tasks.status != 'Completed'

                AND datetime(tasks.deadline)
                    < datetime('now')
            `);

        }


        // ========================================
        // ADD WHERE CLAUSE
        // ========================================

        if (conditions.length > 0) {

            query += `
                WHERE ${conditions.join(" AND ")}
            `;

        }


        // ========================================
        // SORT
        // ========================================

        query += `
            ORDER BY tasks.created_at DESC
        `;


        // ========================================
        // GET TASKS
        // ========================================

        const tasks = db
            .prepare(query)
            .all(...parameters);


        // ========================================
        // RESPONSE
        // ========================================

        res.json({
            success: true,

            filters: {
                search: search || null,
                employee: employee || null,
                status: status || null,
                priority: priority || null,
                overdue: overdue === "true"
            },

            tasks
        });


    } catch (error) {

        console.error(
            "Get tasks error:",
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
// GET MY TASKS
// LOGGED-IN USER
// ========================================

router.get("/my", requireLogin, (req, res) => {

    try {

        const userId =
            req.session.user.id;


        const tasks = db.prepare(`
            SELECT
                tasks.id,
                tasks.title,
                tasks.description,
                tasks.priority,
                tasks.status,
                tasks.created_at,
                tasks.deadline,
                tasks.completed_at,

                users.full_name AS assigned_employee

            FROM tasks

            INNER JOIN users
                ON tasks.assigned_to = users.id

            WHERE tasks.assigned_to = ?

            ORDER BY tasks.deadline ASC
        `).all(userId);


        res.json({
            success: true,
            tasks
        });


    } catch (error) {

        console.error(
            "Get my tasks error:",
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
// UPDATE TASK STATUS
// ========================================

router.patch(
    "/:id/status",
    requireLogin,
    (req, res) => {

        try {

            const taskId =
                req.params.id;

            const { status } =
                req.body;

            const userId =
                req.session.user.id;

            const userRole =
                req.session.user.role;


            // ========================================
            // VALIDATE STATUS
            // ========================================

            const allowedStatuses = [
                "Pending",
                "In Progress",
                "Completed"
            ];


            if (!allowedStatuses.includes(status)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid status."
                });

            }


            // ========================================
            // FIND TASK
            // ========================================

            const task = db.prepare(`
                SELECT *
                FROM tasks
                WHERE id = ?
            `).get(taskId);


            if (!task) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Task not found."
                });

            }


            // ========================================
            // CHECK PERMISSION
            // ========================================

            // Admin can update any task.
            // Employee can only update their own task.

            if (
                userRole !== "admin" &&
                task.assigned_to !== userId
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You are not allowed to update this task."
                });

            }


            // ========================================
            // COMPLETION DATE
            // ========================================

            let completedAt = null;


            if (status === "Completed") {

                completedAt =
                    new Date().toISOString();

            }


            // ========================================
            // UPDATE TASK
            // ========================================

            const updateTask = db.prepare(`
                UPDATE tasks

                SET
                    status = ?,
                    completed_at = ?

                WHERE id = ?
            `);


            updateTask.run(
                status,
                completedAt,
                taskId
            );


            // ========================================
            // GET UPDATED TASK
            // ========================================

            const updatedTask = db.prepare(`
                SELECT
                    tasks.*,

                    users.full_name
                        AS assigned_employee

                FROM tasks

                INNER JOIN users
                    ON tasks.assigned_to = users.id

                WHERE tasks.id = ?
            `).get(taskId);


            // ========================================
            // ACTIVITY LOG
            // ========================================

            if (task.status !== status) {

                logActivity(
                    userId,
                    "TASK_STATUS_CHANGED",
                    `Changed task "${task.title}" status from ${task.status} to ${status}`
                );

            }


            // ========================================
            // RESPONSE
            // ========================================

            res.json({
                success: true,
                message:
                    "Task status updated successfully.",
                task: updatedTask
            });


        } catch (error) {

            console.error(
                "Update task status error:",
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
// ADD TASK UPDATE / NOTE
// ========================================

router.post(
    "/:id/updates",
    requireLogin,
    (req, res) => {

        try {

            const taskId =
                req.params.id;

            const userId =
                req.session.user.id;

            const { update_text } =
                req.body;


            // ========================================
            // VALIDATE UPDATE
            // ========================================

            if (
                !update_text ||
                !update_text.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Update text is required."
                });

            }


            // ========================================
            // FIND TASK
            // ========================================

            const task = db.prepare(`
                SELECT *
                FROM tasks
                WHERE id = ?
            `).get(taskId);


            if (!task) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Task not found."
                });

            }


            // ========================================
            // CHECK PERMISSION
            // ========================================

            if (
                req.session.user.role !== "admin" &&
                task.assigned_to !== userId
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You are not allowed to add an update to this task."
                });

            }


            // ========================================
            // INSERT UPDATE
            // ========================================

            const insertUpdate = db.prepare(`
                INSERT INTO task_updates (
                    task_id,
                    user_id,
                    update_text
                )

                VALUES (?, ?, ?)
            `);


            const result =
                insertUpdate.run(
                    taskId,
                    userId,
                    update_text.trim()
                );


            // ========================================
            // GET NEW UPDATE
            // ========================================

            const update = db.prepare(`
                SELECT
                    task_updates.id,
                    task_updates.task_id,
                    task_updates.update_text,
                    task_updates.created_at,

                    users.full_name AS user_name

                FROM task_updates

                INNER JOIN users
                    ON task_updates.user_id = users.id

                WHERE task_updates.id = ?
            `).get(result.lastInsertRowid);


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(
                userId,
                "TASK_UPDATE_ADDED",
                `Added an update to task "${task.title}"`
            );


            // ========================================
            // RESPONSE
            // ========================================

            res.status(201).json({
                success: true,
                message:
                    "Task update added successfully.",
                update
            });


        } catch (error) {

            console.error(
                "Add task update error:",
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
// GET TASK UPDATES / NOTES
// ========================================

router.get(
    "/:id/updates",
    requireLogin,
    (req, res) => {

        try {

            const taskId =
                req.params.id;

            const userId =
                req.session.user.id;

            const userRole =
                req.session.user.role;


            // ========================================
            // FIND TASK
            // ========================================

            const task = db.prepare(`
                SELECT *
                FROM tasks
                WHERE id = ?
            `).get(taskId);


            if (!task) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Task not found."
                });

            }


            // ========================================
            // CHECK PERMISSION
            // ========================================

            if (
                userRole !== "admin" &&
                task.assigned_to !== userId
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You are not allowed to view updates for this task."
                });

            }


            // ========================================
            // GET UPDATES
            // ========================================

            const updates = db.prepare(`
                SELECT
                    task_updates.id,
                    task_updates.task_id,
                    task_updates.update_text,
                    task_updates.created_at,

                    users.full_name AS user_name

                FROM task_updates

                INNER JOIN users
                    ON task_updates.user_id = users.id

                WHERE task_updates.task_id = ?

                ORDER BY task_updates.created_at DESC
            `).all(taskId);


            res.json({
                success: true,
                updates
            });


        } catch (error) {

            console.error(
                "Get task updates error:",
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
// DASHBOARD STATISTICS
// ADMIN ONLY
// ========================================

router.get(
    "/dashboard/stats",
    requireAdmin,
    (req, res) => {

        try {

            // ========================================
            // TOTAL EMPLOYEES
            // ========================================

            const totalEmployees =
                db.prepare(`
                    SELECT COUNT(*) AS count

                    FROM users

                    WHERE role = 'employee'
                `).get().count;


            // ========================================
            // TOTAL TASKS
            // ========================================

            const totalTasks =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM tasks
                `).get().count;


            // ========================================
            // PENDING TASKS
            // ========================================

            const pendingTasks =
                db.prepare(`
                    SELECT COUNT(*) AS count

                    FROM tasks

                    WHERE status = 'Pending'
                `).get().count;


            // ========================================
            // IN PROGRESS TASKS
            // ========================================

            const inProgressTasks =
                db.prepare(`
                    SELECT COUNT(*) AS count

                    FROM tasks

                    WHERE status = 'In Progress'
                `).get().count;


            // ========================================
            // COMPLETED TASKS
            // ========================================

            const completedTasks =
                db.prepare(`
                    SELECT COUNT(*) AS count

                    FROM tasks

                    WHERE status = 'Completed'
                `).get().count;


            // ========================================
            // OVERDUE TASKS
            // ========================================

            const overdueTasks =
                db.prepare(`
                    SELECT COUNT(*) AS count

                    FROM tasks

                    WHERE status != 'Completed'

                    AND datetime(deadline)
                        < datetime('now')
                `).get().count;


            // ========================================
            // RESPONSE
            // ========================================

            res.json({

                success: true,

                stats: {
                    totalEmployees,
                    totalTasks,
                    pendingTasks,
                    inProgressTasks,
                    completedTasks,
                    overdueTasks
                }

            });


        } catch (error) {

            console.error(
                "Dashboard stats error:",
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