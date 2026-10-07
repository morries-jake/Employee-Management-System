const Database = require("better-sqlite3");
const path = require("path");

// Location of our SQLite database
const dbPath = path.join(__dirname, "database.sqlite");

// Create or open the database
const db = new Database(dbPath);

// Enable foreign key support
db.pragma("foreign_keys = ON");

console.log("Database connected successfully.");


// ========================================
// USERS TABLE
// ========================================

function createUsersTable() {

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            email TEXT NOT NULL UNIQUE,

            password_hash TEXT NOT NULL,

            full_name TEXT NOT NULL,

            profile_image TEXT,

            recovery_email TEXT,

            recovery_email_verified INTEGER NOT NULL DEFAULT 0
                CHECK (recovery_email_verified IN (0, 1)),

            role TEXT NOT NULL
                CHECK (role IN ('admin', 'employee')),

            is_active INTEGER NOT NULL DEFAULT 1,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log("Users table ready.");
}


// ========================================
// USERS TABLE MIGRATION
// ========================================
//
// Older versions of the system used:
//
// username
// email
// password_hash
// full_name
// profile_image
// role
// is_active
//
// The new system no longer uses usernames.
// Email is now the unique login identifier.
// ========================================

const usersTableExists = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    AND name = 'users'
`).get();


if (!usersTableExists) {

    createUsersTable();

} else {

    const userColumns = db.prepare(`
        PRAGMA table_info(users)
    `).all();


    const usernameColumnExists = userColumns.some(
        column => column.name === "username"
    );


    if (usernameColumnExists) {

        console.log("Old username system detected.");
        console.log("Migrating users table to email-based accounts...");

        db.pragma("foreign_keys = OFF");
        db.pragma("legacy_alter_table = ON");


        try {

            db.exec(`
                ALTER TABLE users
                RENAME TO users_old
            `);


            db.exec(`
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    email TEXT NOT NULL UNIQUE,

                    password_hash TEXT NOT NULL,

                    full_name TEXT NOT NULL,

                    profile_image TEXT,

                    recovery_email TEXT,

                    recovery_email_verified INTEGER NOT NULL DEFAULT 0
                        CHECK (recovery_email_verified IN (0, 1)),

                    role TEXT NOT NULL
                        CHECK (role IN ('admin', 'employee')),

                    is_active INTEGER NOT NULL DEFAULT 1,

                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);


            db.exec(`
                INSERT INTO users (
                    id,
                    email,
                    password_hash,
                    full_name,
                    profile_image,
                    role,
                    is_active,
                    created_at
                )
                SELECT
                    id,

                    CASE
                        WHEN email IS NOT NULL
                             AND TRIM(email) != ''
                        THEN email

                        ELSE
                            'user' || id || '@temporary.local'
                    END,

                    password_hash,
                    full_name,
                    profile_image,
                    role,
                    is_active,
                    created_at

                FROM users_old
            `);


            db.exec(`
                DROP TABLE users_old
            `);


            console.log(
                "Users table migrated successfully."
            );


        } catch (error) {

            console.error(
                "Users table migration failed:",
                error
            );

            throw error;


        } finally {

            db.pragma("legacy_alter_table = OFF");
            db.pragma("foreign_keys = ON");

        }


    } else {

        console.log(
            "Users table already uses email-based accounts."
        );


        // ========================================
        // EMAIL COLUMN
        // ========================================

        const emailColumnExists = userColumns.some(
            column => column.name === "email"
        );


        if (!emailColumnExists) {

            db.exec(`
                ALTER TABLE users
                ADD COLUMN email TEXT
            `);

            console.log(
                "Email column added to users table."
            );

        }


        // ========================================
        // PROFILE IMAGE
        // ========================================

        const profileImageColumnExists =
            userColumns.some(
                column =>
                    column.name === "profile_image"
            );


        if (!profileImageColumnExists) {

            db.exec(`
                ALTER TABLE users
                ADD COLUMN profile_image TEXT
            `);

            console.log(
                "Profile image column added to users table."
            );

        }


        // ========================================
        // RECOVERY EMAIL
        // ========================================

        const recoveryEmailColumnExists =
            userColumns.some(
                column =>
                    column.name === "recovery_email"
            );


        if (!recoveryEmailColumnExists) {

            db.exec(`
                ALTER TABLE users
                ADD COLUMN recovery_email TEXT
            `);

            console.log(
                "Recovery email column added successfully."
            );

        }


        // ========================================
        // RECOVERY EMAIL VERIFIED
        // ========================================

        const recoveryEmailVerifiedColumnExists =
            userColumns.some(
                column =>
                    column.name ===
                    "recovery_email_verified"
            );


        if (!recoveryEmailVerifiedColumnExists) {

            db.exec(`
                ALTER TABLE users
                ADD COLUMN recovery_email_verified
                    INTEGER NOT NULL DEFAULT 0
            `);

            console.log(
                "Recovery email verification column added successfully."
            );

        }

    }

}


// Make sure the final users table exists.
createUsersTable();


// ========================================
// PASSWORD HISTORY TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS password_history (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        password_hash TEXT NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    )
`);

console.log("Password history table ready.");


// ========================================
// TASKS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        title TEXT NOT NULL,

        description TEXT,

        assigned_to INTEGER NOT NULL,

        priority TEXT NOT NULL DEFAULT 'Medium'
            CHECK (
                priority IN (
                    'Low',
                    'Medium',
                    'High'
                )
            ),

        status TEXT NOT NULL DEFAULT 'Pending'
            CHECK (
                status IN (
                    'Pending',
                    'In Progress',
                    'Completed'
                )
            ),

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        deadline DATETIME NOT NULL,

        completed_at DATETIME,

        FOREIGN KEY (assigned_to)
            REFERENCES users(id)
            ON DELETE RESTRICT
    )
`);

console.log("Tasks table ready.");


// ========================================
// TASK ATTACHMENTS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS task_attachments (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        task_id INTEGER NOT NULL,

        uploaded_by INTEGER,

        original_name TEXT NOT NULL,

        stored_name TEXT NOT NULL UNIQUE,

        mime_type TEXT NOT NULL,

        file_size INTEGER NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (task_id)
            REFERENCES tasks(id)
            ON DELETE CASCADE,

        FOREIGN KEY (uploaded_by)
            REFERENCES users(id)
            ON DELETE SET NULL
    )
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id
    ON task_attachments(task_id)
`);

console.log("Task attachments table ready.");


// ========================================
// TASK UPDATES TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS task_updates (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        task_id INTEGER NOT NULL,

        user_id INTEGER NOT NULL,

        update_text TEXT NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (task_id)
            REFERENCES tasks(id)
            ON DELETE CASCADE,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    )
`);

console.log("Task updates table ready.");


// ========================================
// ACTIVITY LOGS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER,

        action TEXT NOT NULL,

        description TEXT NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE SET NULL
    )
`);

console.log("Activity logs table ready.");


// ========================================
// RECOVERY EMAIL VERIFICATION TABLE
// ========================================
//
// This table stores temporary verification codes.
//
// Important:
// The actual 6-digit code is NEVER stored directly.
// We store a SHA-256 hash of the code instead.
//
// A verification code:
// - expires after 10 minutes
// - can only be attempted a limited number of times
// - is replaced when a new code is requested
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS recovery_email_verifications (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        recovery_email TEXT NOT NULL,

        code_hash TEXT NOT NULL,

        expires_at DATETIME NOT NULL,

        attempts INTEGER NOT NULL DEFAULT 0,

        verified_at DATETIME,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    )
`);

console.log(
    "Recovery email verification table ready."
);


// ========================================
// PASSWORD RESET VERIFICATION TABLE
// ========================================
//
// This table stores temporary password-reset
// verification codes.
//
// Important:
// The actual 6-digit code is NEVER stored
// directly in the database.
//
// Only a SHA-256 hash of the code is stored.
//
// A reset code:
// - expires after a limited period
// - has a limited number of attempts
// - is replaced when a new code is requested
// - can only be used for password recovery
//
// The reset process will use the user's
// VERIFIED recovery email.
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_verifications (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        recovery_email TEXT NOT NULL,

        code_hash TEXT NOT NULL,

        expires_at DATETIME NOT NULL,

        attempts INTEGER NOT NULL DEFAULT 0,

        verified_at DATETIME,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    )
`);

console.log(
    "Password reset verification table ready."
);


// ========================================
// FINAL DATABASE CHECK
// ========================================

const finalUserColumns = db.prepare(`
    PRAGMA table_info(users)
`).all();


const usernameStillExists =
    finalUserColumns.some(
        column =>
            column.name === "username"
    );


if (usernameStillExists) {

    throw new Error(
        "Database migration error: username column still exists."
    );

}


console.log(
    "Username system removed successfully."
);

console.log(
    "Email is now the account login identifier."
);


// ========================================
// RECOVERY EMAIL DATABASE CHECK
// ========================================

const recoveryEmailExists =
    finalUserColumns.some(
        column =>
            column.name === "recovery_email"
    );


const recoveryEmailVerifiedExists =
    finalUserColumns.some(
        column =>
            column.name ===
            "recovery_email_verified"
    );


if (
    !recoveryEmailExists ||
    !recoveryEmailVerifiedExists
) {

    throw new Error(
        "Database setup error: recovery email columns are missing."
    );

}


console.log(
    "Recovery email fields ready."
);


// ========================================
// PASSWORD RESET DATABASE CHECK
// ========================================

const passwordResetTableExists =
    db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        AND name = 'password_reset_verifications'
    `).get();


if (!passwordResetTableExists) {

    throw new Error(
        "Database setup error: password reset verification table is missing."
    );

}


console.log(
    "Password reset verification system ready."
);


// ========================================
// EXPORT DATABASE CONNECTION
// ========================================

module.exports = db;