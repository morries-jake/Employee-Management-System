const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database");

const {
    requireLogin
} = require("../middleware/auth");

const logActivity = require("../activity-log");

const router = express.Router();


// ========================================
// NAME CHANGE DATABASE MIGRATION
// ========================================
//
// Adds full_name_changed_at to existing
// databases without requiring the user to
// manually recreate the database.
//
// NULL means the user has never changed
// their name and may change it now.
// ========================================

try {

    const columns = db.prepare(`
        PRAGMA table_info(users)
    `).all();


    const hasFullNameChangedAt =
        columns.some(
            column =>
                column.name ===
                "full_name_changed_at"
        );


    if (!hasFullNameChangedAt) {

        db.prepare(`
            ALTER TABLE users
            ADD COLUMN full_name_changed_at DATETIME
        `).run();


        console.log(
            "Added full_name_changed_at to users table."
        );

    }

} catch (error) {

    console.error(
        "Name change database migration error:",
        error
    );

}


// ========================================
// PROFILE IMAGE STORAGE
// ========================================

const uploadDirectory = path.join(
    __dirname,
    "../../public/uploads/profiles"
);


if (!fs.existsSync(uploadDirectory)) {

    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true
        }
    );

}


// ========================================
// MULTER CONFIGURATION
// ========================================

const storage = multer.diskStorage({

    destination: function (
        req,
        file,
        callback
    ) {

        callback(
            null,
            uploadDirectory
        );

    },


    filename: function (
        req,
        file,
        callback
    ) {

        const extension =
            path.extname(file.originalname)
                .toLowerCase();


        const filename =
            `user-${req.session.user.id}${extension}`;


        callback(
            null,
            filename
        );

    }

});


const upload = multer({

    storage: storage,

    limits: {

        fileSize:
            5 * 1024 * 1024

    },


    fileFilter: function (
        req,
        file,
        callback
    ) {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];


        if (
            !allowedTypes.includes(
                file.mimetype
            )
        ) {

            return callback(
                new Error(
                    "Only JPG, PNG, and WEBP images are allowed."
                )
            );

        }


        callback(
            null,
            true
        );

    }

});


// ========================================
// CALCULATE NEXT NAME CHANGE DATE
// ========================================

function getNextNameChangeDate(
    changedAt
) {

    if (!changedAt) {
        return null;
    }


    const changedDate =
        new Date(changedAt);


    if (
        Number.isNaN(
            changedDate.getTime()
        )
    ) {

        return null;

    }


    changedDate.setUTCDate(
        changedDate.getUTCDate() + 365
    );


    return changedDate.toISOString();
}


// ========================================
// GET PROFILE
// ========================================

router.get(
    "/",
    requireLogin,
    (req, res) => {

        try {

            const userId =
                req.session.user.id;


            const user = db.prepare(`
                SELECT
                    id,
                    email,
                    full_name,
                    profile_image,
                    role,
                    is_active,
                    created_at,
                    full_name_changed_at

                FROM users

                WHERE id = ?
            `).get(userId);


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User profile not found."

                });

            }


            // ========================================
            // NAME CHANGE INFORMATION
            // ========================================

            const nextNameChangeAt =
                getNextNameChangeDate(
                    user.full_name_changed_at
                );


            let canChangeName = true;


            if (nextNameChangeAt) {

                canChangeName =
                    new Date() >=
                    new Date(nextNameChangeAt);

            }


            user.next_full_name_change_at =
                nextNameChangeAt;

            user.can_change_name =
                canChangeName;


            // ========================================
            // RESPONSE
            // ========================================

            res.json({

                success: true,

                user

            });


        } catch (error) {

            console.error(
                "Get profile error:",
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
// UPDATE PROFILE
// ========================================
//
// Profile editing only changes the full name.
//
// Email is the account/login identifier
// and is intentionally not editable here.
//
// Username has been completely removed.
//
// FULL NAME RULE:
// A user may change their full name only
// once every 365 days.
//
// This rule is enforced SERVER-SIDE.
// ========================================

router.put(
    "/",
    requireLogin,
    (req, res) => {

        try {

            const userId =
                req.session.user.id;


            const {
                full_name
            } = req.body;


            // ========================================
            // VALIDATE FULL NAME
            // ========================================

            if (
                typeof full_name !==
                "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Full name is required."

                });

            }


            const trimmedFullName =
                full_name.trim();


            if (
                trimmedFullName.length < 2
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Full name must be at least 2 characters long."

                });

            }


            if (
                trimmedFullName.length > 100
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Full name must be 100 characters or less."

                });

            }


            // ========================================
            // GET CURRENT USER DATA
            // ========================================

            const oldUser =
                db.prepare(`
                    SELECT
                        id,
                        email,
                        full_name,
                        profile_image,
                        role,
                        is_active,
                        created_at,
                        full_name_changed_at

                    FROM users

                    WHERE id = ?
                `).get(userId);


            if (!oldUser) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            // ========================================
            // CHECK IF NAME ACTUALLY CHANGED
            // ========================================
            //
            // Saving the exact same name does NOT
            // consume the 365-day name-change slot.
            // ========================================

            if (
                oldUser.full_name ===
                trimmedFullName
            ) {

                const nextNameChangeAt =
                    getNextNameChangeDate(
                        oldUser.full_name_changed_at
                    );


                let canChangeName = true;


                if (nextNameChangeAt) {

                    canChangeName =
                        new Date() >=
                        new Date(nextNameChangeAt);

                }


                const unchangedUser = {
                    ...oldUser,

                    next_full_name_change_at:
                        nextNameChangeAt,

                    can_change_name:
                        canChangeName
                };


                return res.json({

                    success: true,

                    message:
                        "No profile changes were made.",

                    user:
                        unchangedUser

                });

            }


            // ========================================
            // CHECK 365-DAY NAME CHANGE LOCK
            // ========================================

            const nextNameChangeAt =
                getNextNameChangeDate(
                    oldUser.full_name_changed_at
                );


            if (
                nextNameChangeAt &&
                new Date() <
                    new Date(nextNameChangeAt)
            ) {

                return res.status(429).json({

                    success: false,

                    message:
                        `You can only change your name once every 365 days. Your name can next be changed on ${formatDateForMessage(nextNameChangeAt)}.`,

                    can_change_at:
                        nextNameChangeAt,

                    can_change_name:
                        false

                });

            }


            // ========================================
            // UPDATE USER
            // ========================================

            db.prepare(`
                UPDATE users

                SET
                    full_name = ?,
                    full_name_changed_at = CURRENT_TIMESTAMP

                WHERE id = ?
            `).run(
                trimmedFullName,
                userId
            );


            // ========================================
            // UPDATE SESSION
            // ========================================

            req.session.user.full_name =
                trimmedFullName;


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(
                userId,
                "PROFILE_UPDATED",
                "Updated profile information and changed full name."
            );


            // ========================================
            // GET UPDATED USER
            // ========================================

            const updatedUser =
                db.prepare(`
                    SELECT
                        id,
                        email,
                        full_name,
                        profile_image,
                        role,
                        is_active,
                        created_at,
                        full_name_changed_at

                    FROM users

                    WHERE id = ?
                `).get(userId);


            // ========================================
            // NAME CHANGE INFORMATION
            // ========================================

            const updatedNextNameChangeAt =
                getNextNameChangeDate(
                    updatedUser.full_name_changed_at
                );


            updatedUser.next_full_name_change_at =
                updatedNextNameChangeAt;


            updatedUser.can_change_name =
                false;


            // ========================================
            // RESPONSE
            // ========================================

            res.json({

                success: true,

                message:
                    "Profile updated successfully.",

                user:
                    updatedUser

            });


        } catch (error) {

            console.error(
                "Update profile error:",
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
// CHANGE PASSWORD
// ========================================

router.put(
    "/password",
    requireLogin,
    async (req, res) => {

        try {

            const userId =
                req.session.user.id;


            const {
                current_password,
                new_password
            } = req.body;


            // ========================================
            // VALIDATE INPUT
            // ========================================

            if (
                !current_password ||
                !new_password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Current password and new password are required."

                });

            }


            if (
                new_password.length < 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must be at least 8 characters long."

                });

            }


            // ========================================
            // GET CURRENT PASSWORD
            // ========================================

            const user =
                db.prepare(`
                    SELECT
                        password_hash

                    FROM users

                    WHERE id = ?
                `).get(userId);


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            // ========================================
            // VERIFY CURRENT PASSWORD
            // ========================================

            const passwordMatch =
                await bcrypt.compare(
                    current_password,
                    user.password_hash
                );


            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Current password is incorrect."

                });

            }


            // ========================================
            // PREVENT PASSWORD REUSE
            // ========================================

            const previousPasswords =
                db.prepare(`
                    SELECT
                        password_hash

                    FROM password_history

                    WHERE user_id = ?

                    ORDER BY created_at DESC
                `).all(userId);


            for (
                const previousPassword
                of previousPasswords
            ) {

                const reusedPassword =
                    await bcrypt.compare(
                        new_password,
                        previousPassword.password_hash
                    );


                if (reusedPassword) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "You cannot reuse a previous password."

                    });

                }

            }


            // ========================================
            // PREVENT CURRENT PASSWORD REUSE
            // ========================================

            const sameAsCurrent =
                await bcrypt.compare(
                    new_password,
                    user.password_hash
                );


            if (sameAsCurrent) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Your new password must be different from your current password."

                });

            }


            // ========================================
            // SAVE CURRENT PASSWORD TO HISTORY
            // ========================================

            db.prepare(`
                INSERT INTO password_history (
                    user_id,
                    password_hash
                )

                VALUES (?, ?)
            `).run(
                userId,
                user.password_hash
            );


            // ========================================
            // HASH NEW PASSWORD
            // ========================================

            const newPasswordHash =
                await bcrypt.hash(
                    new_password,
                    10
                );


            // ========================================
            // UPDATE PASSWORD
            // ========================================

            db.prepare(`
                UPDATE users

                SET
                    password_hash = ?

                WHERE id = ?
            `).run(
                newPasswordHash,
                userId
            );


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(
                userId,
                "PASSWORD_CHANGED",
                "Changed account password."
            );


            // ========================================
            // RESPONSE
            // ========================================

            res.json({

                success: true,

                message:
                    "Password changed successfully."

            });


        } catch (error) {

            console.error(
                "Change password error:",
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
// UPLOAD PROFILE IMAGE
// ========================================

router.post(
    "/image",
    requireLogin,
    upload.single("profile_image"),
    (req, res) => {

        try {

            const userId =
                req.session.user.id;


            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select an image."

                });

            }


            // ========================================
            // GET OLD PROFILE IMAGE
            // ========================================

            const oldUser =
                db.prepare(`
                    SELECT
                        profile_image

                    FROM users

                    WHERE id = ?
                `).get(userId);


            // ========================================
            // NEW IMAGE PATH
            // ========================================

            const imagePath =
                `/uploads/profiles/${req.file.filename}`;


            // ========================================
            // SAVE IMAGE PATH
            // ========================================

            db.prepare(`
                UPDATE users

                SET
                    profile_image = ?

                WHERE id = ?
            `).run(
                imagePath,
                userId
            );


            // ========================================
            // UPDATE SESSION
            // ========================================

            req.session.user.profile_image =
                imagePath;


            // ========================================
            // DELETE OLD IMAGE
            // ========================================

            if (
                oldUser &&
                oldUser.profile_image
            ) {

                const oldFilename =
                    path.basename(
                        oldUser.profile_image
                    );


                const oldFilePath =
                    path.join(
                        uploadDirectory,
                        oldFilename
                    );


                if (
                    fs.existsSync(oldFilePath)
                ) {

                    fs.unlinkSync(
                        oldFilePath
                    );

                }

            }


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(
                userId,
                "PROFILE_IMAGE_UPDATED",
                "Updated profile picture."
            );


            // ========================================
            // RESPONSE
            // ========================================

            res.json({

                success: true,

                message:
                    "Profile picture updated successfully.",

                profile_image:
                    imagePath

            });


        } catch (error) {

            console.error(
                "Profile image upload error:",
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
// REMOVE PROFILE IMAGE
// ========================================

router.delete(
    "/image",
    requireLogin,
    (req, res) => {

        try {

            const userId =
                req.session.user.id;


            const user =
                db.prepare(`
                    SELECT
                        profile_image

                    FROM users

                    WHERE id = ?
                `).get(userId);


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            // ========================================
            // DELETE IMAGE FILE
            // ========================================

            if (user.profile_image) {

                const filename =
                    path.basename(
                        user.profile_image
                    );


                const filePath =
                    path.join(
                        uploadDirectory,
                        filename
                    );


                if (
                    fs.existsSync(filePath)
                ) {

                    fs.unlinkSync(
                        filePath
                    );

                }

            }


            // ========================================
            // CLEAR DATABASE VALUE
            // ========================================

            db.prepare(`
                UPDATE users

                SET
                    profile_image = NULL

                WHERE id = ?
            `).run(userId);


            // ========================================
            // UPDATE SESSION
            // ========================================

            req.session.user.profile_image =
                null;


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(
                userId,
                "PROFILE_IMAGE_REMOVED",
                "Removed profile picture."
            );


            // ========================================
            // RESPONSE
            // ========================================

            res.json({

                success: true,

                message:
                    "Profile picture removed successfully."

            });


        } catch (error) {

            console.error(
                "Remove profile image error:",
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
// FORMAT DATE FOR ERROR MESSAGE
// ========================================

function formatDateForMessage(
    dateValue
) {

    const date =
        new Date(dateValue);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateValue;
    }


    return date.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );
}


// ========================================
// MULTER ERROR HANDLER
// ========================================

router.use(
    (error, req, res, next) => {

        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Profile image must be 5 MB or smaller."

                });

            }

        }


        if (error) {

            return res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "File upload failed."

            });

        }


        next();

    }
);


// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;