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
//
// This migration preserves the existing users and
// their IDs, passwords, profile pictures, roles,
// active status, and creation dates.
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

        // Disable foreign key enforcement temporarily
        // while rebuilding the users table.
        db.pragma("foreign_keys = OFF");

        // Prevent SQLite from changing the foreign key
        // references in the other tables when users is renamed.
        db.pragma("legacy_alter_table = ON");

        try {

            db.exec(`
                ALTER TABLE users
                RENAME TO users_old
            `);

            // Create the new users table without username.
            db.exec(`
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    email TEXT NOT NULL UNIQUE,

                    password_hash TEXT NOT NULL,

                    full_name TEXT NOT NULL,

                    profile_image TEXT,

                    role TEXT NOT NULL
                        CHECK (role IN ('admin', 'employee')),

                    is_active INTEGER NOT NULL DEFAULT 1,

                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Copy existing users into the new structure.
            //
            // If an old account does not have an email,
            // a temporary email is generated from its ID.
            // This prevents the migration from losing the account.
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

            // Remove the old username-based table.
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

            // Restore the normal SQLite settings.
            db.pragma("legacy_alter_table = OFF");
            db.pragma("foreign_keys = ON");

        }

    } else {

        // The database is already using the new structure.
        console.log("Users table already uses email-based accounts.");

        // Make sure email exists for older databases
        // that may have been created during an intermediate version.
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

        // Make sure profile_image exists.
        const profileImageColumnExists = userColumns.some(
            column => column.name === "profile_image"
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

    }

}


// Create or migrate the users table.
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
            CHECK (priority IN ('Low', 'Medium', 'High')),

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
// FINAL DATABASE CHECK
// ========================================

const finalUserColumns = db.prepare(`
    PRAGMA table_info(users)
`).all();

const usernameStillExists = finalUserColumns.some(
    column => column.name === "username"
);

if (usernameStillExists) {

    throw new Error(
        "Database migration error: username column still exists."
    );

}

console.log("Username system removed successfully.");
console.log("Email is now the account login identifier.");


// ========================================
// EXPORT DATABASE CONNECTION
// ========================================

module.exports = db;