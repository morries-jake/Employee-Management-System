const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const db = require("../database");

const logActivity = require("../activity-log");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

const router = express.Router();
const taskEventClients = new Map();

const attachmentDirectory =
    path.join(__dirname, "..", "uploads", "task-attachments");

fs.mkdirSync(attachmentDirectory, { recursive: true });

const allowedAttachmentTypes = {
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword", "application/octet-stream"],
    ".docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream"
    ],
    ".ppt": [
        "application/vnd.ms-powerpoint",
        "application/octet-stream"
    ],
    ".pptx": [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/octet-stream"
    ],
    ".xls": [
        "application/vnd.ms-excel",
        "application/octet-stream"
    ],
    ".xlsx": [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream"
    ],
    ".csv": [
        "text/csv",
        "text/plain",
        "application/csv",
        "application/vnd.ms-excel",
        "application/octet-stream"
    ],
    ".txt": ["text/plain", "application/octet-stream"],
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".gif": ["image/gif"],
    ".webp": ["image/webp"]
};

const taskAttachmentUpload = multer({
    storage: multer.diskStorage({
        destination: attachmentDirectory,
        filename: (req, file, callback) => {
            callback(
                null,
                `${crypto.randomBytes(24).toString("hex")}${path.extname(file.originalname).toLowerCase()}`
            );
        }
    }),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 5
    },
    fileFilter: (req, file, callback) => {
        const extension =
            path.extname(file.originalname).toLowerCase();
        const allowedMimeTypes =
            allowedAttachmentTypes[extension];

        if (
            !allowedMimeTypes ||
            !allowedMimeTypes.includes(file.mimetype.toLowerCase())
        ) {
            const error = new Error(
                "Choose a PDF, document, spreadsheet, text file, or image."
            );
            error.code = "TASK_ATTACHMENT_TYPE";
            callback(error);
            return;
        }

        callback(null, true);
    }
});

function handleTaskUploads(req, res, next) {
    taskAttachmentUpload.array("attachments", 5)(req, res, error => {
        if (!error) {
            next();
            return;
        }

        if (
            error instanceof multer.MulterError ||
            error.code === "TASK_ATTACHMENT_TYPE"
        ) {
            const tooLarge =
                error.code === "LIMIT_FILE_SIZE";
            res.status(tooLarge ? 413 : 400).json({
                success: false,
                message: tooLarge
                    ? "Each attachment must be 10 MB or smaller."
                    : error.code === "TASK_ATTACHMENT_TYPE"
                        ? error.message
                        : "You can upload up to 5 attachments at a time."
            });
            return;
        }

        next(error);
    });
}

function removeUploadedFiles(files) {
    for (const file of files || []) {
        try {
            fs.rmSync(file.path, { force: true });
        } catch (error) {
            console.error("Unable to remove an uncommitted task attachment:", error);
        }
    }
}

function cleanOriginalName(originalName) {
    const name = path
        .basename(originalName.replace(/[\\/]/g, "/"))
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, 200);

    return name || "attachment";
}

function saveTaskAttachments(taskId, userId, files) {
    const insertAttachment = db.prepare(`
        INSERT INTO task_attachments (
            task_id,
            uploaded_by,
            original_name,
            stored_name,
            mime_type,
            file_size
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const file of files) {
        insertAttachment.run(
            taskId,
            userId,
            cleanOriginalName(file.originalname),
            file.filename,
            file.mimetype,
            file.size
        );
    }
}

function getTaskAttachments(taskIds) {
    if (!taskIds.length) {
        return new Map();
    }

    const placeholders = taskIds.map(() => "?").join(", ");
    const rows = db.prepare(`
        SELECT
            task_attachments.id,
            task_attachments.task_id,
            task_attachments.original_name,
            task_attachments.file_size,
            task_attachments.created_at,
            users.full_name AS uploaded_by_name
        FROM task_attachments
        LEFT JOIN users
            ON task_attachments.uploaded_by = users.id
        WHERE task_attachments.task_id IN (${placeholders})
        ORDER BY task_attachments.created_at ASC, task_attachments.id ASC
    `).all(...taskIds);

    const attachmentsByTask = new Map();
    for (const row of rows) {
        const attachments =
            attachmentsByTask.get(row.task_id) || [];
        attachments.push(row);
        attachmentsByTask.set(row.task_id, attachments);
    }

    return attachmentsByTask;
}

function includeTaskAttachments(tasks) {
    const attachmentsByTask =
        getTaskAttachments(tasks.map(task => task.id));

    for (const task of tasks) {
        task.attachments =
            attachmentsByTask.get(task.id) || [];
    }

    return tasks;
}

function notifyEmployeeTaskUpdated(employeeId, task, changedFields) {
    const clients =
        taskEventClients.get(Number(employeeId));

    if (!clients) {
        return;
    }

    const event = `event: task-updated\ndata: ${JSON.stringify({
        taskId: task.id,
        title: task.title,
        changed: changedFields
    })}\n\n`;

    for (const client of clients) {
        try {
            client.write(event);
        } catch (error) {
            console.error("Unable to notify an employee about a task update:", error);
            client.end();
            clients.delete(client);
        }
    }

    if (!clients.size) {
        taskEventClients.delete(Number(employeeId));
    }
}


// ========================================
// CREATE TASK
// ========================================

router.post("/", requireAdmin, handleTaskUploads, (req, res) => {
    const files = req.files || [];
    let attachmentsPersisted = false;

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

            removeUploadedFiles(files);
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

            removeUploadedFiles(files);
            return res.status(404).json({
                success: false,
                message: "Employee not found."
            });

        }


        if (employee.role !== "employee") {

            removeUploadedFiles(files);
            return res.status(400).json({
                success: false,
                message:
                    "Tasks can only be assigned to employees."
            });

        }


        if (!employee.is_active) {

            removeUploadedFiles(files);
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


        const createTaskTransaction = db.transaction(() => {
            const result = insertTask.run(
                title.trim(),
                description
                    ? description.trim()
                    : null,
                assigned_to,
                priority,
                deadline
            );
            saveTaskAttachments(
                result.lastInsertRowid,
                req.session.user.id,
                files
            );

            return result;
        });
        const result = createTaskTransaction();
        attachmentsPersisted = true;


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
        task.attachments =
            getTaskAttachments([task.id]).get(task.id) || [];


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

        if (!attachmentsPersisted) {
            removeUploadedFiles(files);
        }

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

        includeTaskAttachments(tasks);


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
// EMPLOYEE TASK UPDATE EVENTS
// ========================================

router.get("/events", requireLogin, (req, res) => {
    const user = req.session.user;

    if (user.role !== "employee") {
        return res.status(403).json({
            success: false,
            message: "Employee access required."
        });
    }

    const employeeId = Number(user.id);
    res.status(200);
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    res.flushHeaders();
    res.write("retry: 5000\n\n");

    const clients =
        taskEventClients.get(employeeId) || new Set();
    clients.add(res);
    taskEventClients.set(employeeId, clients);

    const heartbeat = setInterval(() => {
        if (!res.writableEnded && !res.destroyed) {
            try {
                res.write(": keep-alive\n\n");
            } catch (error) {
                console.error("Employee task update heartbeat failed:", error);
                clearInterval(heartbeat);
                clients.delete(res);
            }
        }
    }, 25000);

    res.on("close", () => {
        clearInterval(heartbeat);
        clients.delete(res);

        if (!clients.size) {
            taskEventClients.delete(employeeId);
        }
    });
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

        includeTaskAttachments(tasks);

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
// UPLOAD ATTACHMENTS TO A TASK
// ADMIN OR ASSIGNED EMPLOYEE
// ========================================

router.post(
    "/:id/attachments",
    requireLogin,
    (req, res, next) => {
        const taskId = Number(req.params.id);

        if (!Number.isSafeInteger(taskId) || taskId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid task ID."
            });
        }

        const task = db.prepare(`
            SELECT id, assigned_to
            FROM tasks
            WHERE id = ?
        `).get(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        const user = req.session.user;
        if (
            user.role !== "admin" &&
            Number(task.assigned_to) !== Number(user.id)
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to add files to this task."
            });
        }

        req.task = task;
        next();
    },
    handleTaskUploads,
    (req, res) => {
        const files = req.files || [];

        if (!files.length) {
            return res.status(400).json({
                success: false,
                message: "Select at least one attachment to upload."
            });
        }

        try {
            const addAttachments = db.transaction(() => {
                saveTaskAttachments(
                    req.task.id,
                    req.session.user.id,
                    files
                );
            });
            addAttachments();

            const attachments =
                getTaskAttachments([req.task.id]).get(req.task.id) || [];

            res.status(201).json({
                success: true,
                message: "Task attachments uploaded successfully.",
                attachments
            });
        } catch (error) {
            removeUploadedFiles(files);
            console.error("Task attachment upload error:", error);
            res.status(500).json({
                success: false,
                message: "Unable to save task attachments."
            });
        }
    }
);


// ========================================
// DOWNLOAD TASK ATTACHMENT
// ADMIN OR ASSIGNED EMPLOYEE
// ========================================

router.get(
    "/:id/attachments/:attachmentId/download",
    requireLogin,
    (req, res) => {
        try {
            const taskId = Number(req.params.id);
            const attachmentId = Number(req.params.attachmentId);

            if (
                !Number.isSafeInteger(taskId) ||
                taskId < 1 ||
                !Number.isSafeInteger(attachmentId) ||
                attachmentId < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid task or attachment ID."
                });
            }

            const attachment = db.prepare(`
                SELECT
                    task_attachments.id,
                    task_attachments.task_id,
                    task_attachments.original_name,
                    task_attachments.stored_name,
                    tasks.assigned_to
                FROM task_attachments
                INNER JOIN tasks
                    ON tasks.id = task_attachments.task_id
                WHERE task_attachments.id = ?
                    AND task_attachments.task_id = ?
            `).get(attachmentId, taskId);

            if (!attachment) {
                return res.status(404).json({
                    success: false,
                    message: "Attachment not found."
                });
            }

            const user = req.session.user;
            if (
                user.role !== "admin" &&
                Number(attachment.assigned_to) !== Number(user.id)
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You are not allowed to access this attachment."
                });
            }

            const storedName =
                path.basename(attachment.stored_name);
            if (storedName !== attachment.stored_name) {
                console.error("Invalid stored task attachment filename.");
                return res.status(500).json({
                    success: false,
                    message: "Unable to access this attachment."
                });
            }

            const filePath =
                path.join(attachmentDirectory, storedName);
            res.set("X-Content-Type-Options", "nosniff");
            res.download(
                filePath,
                cleanOriginalName(attachment.original_name),
                error => {
                    if (error && !res.headersSent) {
                        console.error("Task attachment download error:", error);
                        res.status(error.code === "ENOENT" ? 404 : 500).json({
                            success: false,
                            message: error.code === "ENOENT"
                                ? "Attachment file is missing."
                                : "Unable to download this attachment."
                        });
                    } else if (error) {
                        console.error("Task attachment download error:", error);
                    }
                }
            );
        } catch (error) {
            console.error("Task attachment access error:", error);
            res.status(500).json({
                success: false,
                message: "Unable to access this attachment."
            });
        }
    }
);


// ========================================
// EDIT TASK DESCRIPTION AND DEADLINE
// ADMIN ONLY
// ========================================

router.patch("/:id", requireAdmin, (req, res) => {
    try {
        const taskId = Number(req.params.id);

        if (!Number.isSafeInteger(taskId) || taskId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid task ID."
            });
        }

        const { description, deadline } = req.body || {};
        if (
            typeof description !== "string" ||
            description.length > 10000 ||
            typeof deadline !== "string" ||
            !deadline.trim() ||
            deadline.length > 40 ||
            Number.isNaN(new Date(deadline).getTime())
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid task description and deadline."
            });
        }

        const task = db.prepare(`
            SELECT *
            FROM tasks
            WHERE id = ?
        `).get(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        const nextDescription =
            description.trim() || null;
        const nextDeadline =
            deadline.trim();
        const changedFields = [];

        if ((task.description || "") !== (nextDescription || "")) {
            changedFields.push("description");
        }

        if (task.deadline !== nextDeadline) {
            changedFields.push("deadline");
        }

        if (changedFields.length) {
            db.prepare(`
                UPDATE tasks
                SET description = ?, deadline = ?
                WHERE id = ?
            `).run(nextDescription, nextDeadline, taskId);

            logActivity(
                req.session.user.id,
                "TASK_UPDATED",
                `Updated the task ${changedFields.join(" and ")} for "${task.title}"`
            );
        }

        const updatedTask = db.prepare(`
            SELECT
                tasks.*,
                users.full_name AS assigned_employee
            FROM tasks
            INNER JOIN users
                ON tasks.assigned_to = users.id
            WHERE tasks.id = ?
        `).get(taskId);
        updatedTask.attachments =
            getTaskAttachments([taskId]).get(taskId) || [];

        if (changedFields.length) {
            notifyEmployeeTaskUpdated(
                updatedTask.assigned_to,
                updatedTask,
                changedFields
            );
        }

        res.json({
            success: true,
            message: changedFields.length
                ? "Task updated successfully."
                : "No task details changed.",
            task: updatedTask,
            changed: changedFields
        });
    } catch (error) {
        console.error("Update task details error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update task details."
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