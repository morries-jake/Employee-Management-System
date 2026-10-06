const bcrypt = require("bcrypt");
const db = require("./database");


// ========================================
// DEVELOPMENT USER ACCOUNTS
// ========================================

const users = [
    {
        email: "admin@company.com",
        password: "AdminTest123!",
        full_name: "System Administrator",
        role: "admin"
    },
    {
        email: "employee@company.com",
        password: "Employee123!",
        full_name: "Test Employee",
        role: "employee"
    },
    {
        email: "employee2@company.com",
        password: "Employee456!",
        full_name: "Second Test Employee",
        role: "employee"
    }
];


// ========================================
// CREATE OR UPDATE USERS
// ========================================

async function createUsers() {

    try {

        for (const user of users) {

            // Check whether this email already exists.

            const existingUser = db.prepare(`
                SELECT id
                FROM users
                WHERE email = ?
            `).get(user.email);


            // ----------------------------------------
            // CREATE USER
            // ----------------------------------------

            if (!existingUser) {

                const passwordHash = await bcrypt.hash(
                    user.password,
                    10
                );

                db.prepare(`
                    INSERT INTO users (
                        email,
                        password_hash,
                        full_name,
                        profile_image,
                        role,
                        is_active
                    )
                    VALUES (?, ?, ?, NULL, ?, 1)
                `).run(
                    user.email,
                    passwordHash,
                    user.full_name,
                    user.role
                );

                console.log(
                    `Created ${user.role}: ${user.email}`
                );

            }


            // ----------------------------------------
            // UPDATE EXISTING USER
            // ----------------------------------------

            else {

                // Only update account information.
                // The existing password is preserved.

                db.prepare(`
                    UPDATE users
                    SET
                        full_name = ?,
                        role = ?,
                        is_active = 1
                    WHERE email = ?
                `).run(
                    user.full_name,
                    user.role,
                    user.email
                );

                console.log(
                    `Updated existing user: ${user.email}`
                );

            }

        }


        // ========================================
        // DISPLAY ACCOUNTS
        // ========================================

        console.log("");
        console.log("========================================");
        console.log("DEVELOPMENT ACCOUNTS READY");
        console.log("========================================");

        console.log("");
        console.log("Admin account:");
        console.log("Email: admin@company.com");
        console.log("Password: AdminTest123!");

        console.log("");
        console.log("Employee account:");
        console.log("Email: employee@company.com");
        console.log("Password: Employee123!");

        console.log("");
        console.log("Second Employee account:");
        console.log("Email: employee2@company.com");
        console.log("Password: Employee456!");

        console.log("");
        console.log("========================================");

    } catch (error) {

        console.error(
            "Error creating/updating users:",
            error
        );

    }

}


// ========================================
// RUN THE FUNCTION
// ========================================

createUsers();