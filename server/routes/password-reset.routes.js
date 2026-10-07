const express = require("express");

const bcrypt = require("bcrypt");

const crypto = require("crypto");

const db = require("../database");

const {
    sendEmail
} = require("../mailer");

const logActivity =
    require("../activity-log");

const router =
    express.Router();


// ========================================
// PASSWORD RESET SETTINGS
// ========================================

const CODE_EXPIRATION_MINUTES = 10;

const MAX_ATTEMPTS = 5;

const RESEND_COOLDOWN_SECONDS = 60;


// ========================================
// HELPER
// ========================================

function normalizeEmail(email) {

    return String(email || "")
        .trim()
        .toLowerCase();

}


// ========================================
// GENERATE RESET CODE
// ========================================

function generateResetCode() {

    return crypto
        .randomInt(
            100000,
            1000000
        )
        .toString();

}


// ========================================
// HASH RESET CODE
// ========================================

function hashResetCode(code) {

    return crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");

}


// ========================================
// GET EXPIRATION DATE
// ========================================

function getExpirationDate() {

    const expiration =
        new Date(
            Date.now() +
            CODE_EXPIRATION_MINUTES *
            60 *
            1000
        );

    return expiration
        .toISOString()
        .replace("T", " ")
        .replace("Z", "");

}


// ========================================
// GENERIC REQUEST RESPONSE
// ========================================
//
// We intentionally use the same response
// whether or not an account exists.
//
// This prevents people from using the
// forgot-password form to discover which
// email addresses have accounts.
// ========================================

function genericRequestResponse(res) {

    return res.json({

        success: true,

        message:
            "If an account with that email exists and has a verified recovery email, a password reset code has been sent."

    });

}


// ========================================
// REQUEST PASSWORD RESET
// ========================================
//
// POST
// /api/password-reset/request
//
// Body:
//
// {
//     "email": "employee@company.com"
// }
// ========================================

router.post(

    "/request",

    async (req, res) => {

        try {

            const email =
                normalizeEmail(
                    req.body.email
                );


            // ========================================
            // VALIDATE EMAIL
            // ========================================

            if (!email) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email address is required."

                });

            }


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(email)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid email address."

                });

            }


            // ========================================
            // FIND USER
            // ========================================

            const user =
                db.prepare(`

                    SELECT
                        id,
                        email,
                        full_name,
                        recovery_email,
                        recovery_email_verified,
                        is_active

                    FROM users

                    WHERE email = ?

                `).get(email);


            // ========================================
            // DO NOT REVEAL ACCOUNT EXISTENCE
            // ========================================

            if (!user) {

                return genericRequestResponse(
                    res
                );

            }


            // ========================================
            // CHECK ACCOUNT STATUS
            // ========================================

            if (
                !user.is_active
            ) {

                return genericRequestResponse(
                    res
                );

            }


            // ========================================
            // CHECK VERIFIED RECOVERY EMAIL
            // ========================================

            if (
                !user.recovery_email ||
                !user.recovery_email_verified
            ) {

                return genericRequestResponse(
                    res
                );

            }


            // ========================================
            // CHECK RESEND COOLDOWN
            // ========================================

            const latestRequest =
                db.prepare(`

                    SELECT
                        created_at

                    FROM password_reset_verifications

                    WHERE user_id = ?

                    ORDER BY created_at DESC

                    LIMIT 1

                `).get(user.id);


            if (latestRequest) {

                const createdAt =
                    new Date(
                        latestRequest.created_at +
                        "Z"
                    );


                const elapsedSeconds =
                    Math.floor(

                        (
                            Date.now() -
                            createdAt.getTime()
                        ) / 1000

                    );


                if (
                    elapsedSeconds >= 0 &&
                    elapsedSeconds <
                    RESEND_COOLDOWN_SECONDS
                ) {

                    const remainingSeconds =
                        RESEND_COOLDOWN_SECONDS -
                        elapsedSeconds;


                    return res.status(429).json({

                        success: false,

                        message:
                            `Please wait ${remainingSeconds} seconds before requesting another reset code.`,

                        resend_after_seconds:
                            remainingSeconds

                    });

                }

            }


            // ========================================
            // GENERATE CODE
            // ========================================

            const resetCode =
                generateResetCode();


            // ========================================
            // HASH CODE
            // ========================================

            const codeHash =
                hashResetCode(
                    resetCode
                );


            // ========================================
            // EXPIRATION
            // ========================================

            const expiresAt =
                getExpirationDate();


            // ========================================
            // REMOVE OLD PENDING CODES
            // ========================================

            db.prepare(`

                DELETE FROM password_reset_verifications

                WHERE user_id = ?

                AND verified_at IS NULL

            `).run(user.id);


            // ========================================
            // SAVE RESET REQUEST
            // ========================================

            db.prepare(`

                INSERT INTO password_reset_verifications (

                    user_id,
                    recovery_email,
                    code_hash,
                    expires_at

                )

                VALUES (?, ?, ?, ?)

            `).run(

                user.id,

                user.recovery_email,

                codeHash,

                expiresAt

            );


            // ========================================
            // SEND RESET EMAIL
            // ========================================

            const emailResult =
                await sendEmail({

                    to:
                        user.recovery_email,

                    subject:
                        "ETM Password Reset Code",

                    text:
                        `Hello ${user.full_name},

We received a request to reset your Employee Task Management account password.

Your password reset code is:

${resetCode}

This code will expire in ${CODE_EXPIRATION_MINUTES} minutes.

If you did not request a password reset, you can safely ignore this email.

Do not share this code with anyone.

Employee Task Management

ETM Support`,

                    html: `

                        <div
                            style="
                                font-family: Arial, sans-serif;
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 24px;
                            "
                        >

                            <h2>
                                ETM Password Reset
                            </h2>


                            <p>
                                Hello ${user.full_name},
                            </p>


                            <p>
                                We received a request to reset
                                your Employee Task Management
                                account password.
                            </p>


                            <p>
                                Your password reset code is:
                            </p>


                            <div
                                style="
                                    font-size: 32px;
                                    font-weight: bold;
                                    letter-spacing: 8px;
                                    margin: 24px 0;
                                "
                            >
                                ${resetCode}
                            </div>


                            <p>
                                This code will expire in
                                ${CODE_EXPIRATION_MINUTES}
                                minutes.
                            </p>


                            <p>
                                If you did not request a
                                password reset, you can safely
                                ignore this email.
                            </p>


                            <p>

                                <strong>
                                    Do not share this code
                                    with anyone.
                                </strong>

                            </p>


                            <p>
                                Employee Task Management<br>
                                ETM Support
                            </p>

                        </div>

                    `

                });


            // ========================================
            // EMAIL FAILURE
            // ========================================

            if (
                !emailResult.success
            ) {

                db.prepare(`

                    DELETE FROM password_reset_verifications

                    WHERE user_id = ?

                    AND verified_at IS NULL

                `).run(user.id);


                console.error(

                    "Password reset email failed:",

                    emailResult.message

                );


                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to send the password reset email. Please try again later."

                });

            }


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(

                user.id,

                "PASSWORD_RESET_REQUESTED",

                "Requested a password reset code."

            );


            // ========================================
            // RESPONSE
            // ========================================

            return res.json({

                success: true,

                message:
                    "A password reset code has been sent to your verified recovery email.",

                expires_in_minutes:
                    CODE_EXPIRATION_MINUTES,

                resend_after_seconds:
                    RESEND_COOLDOWN_SECONDS

            });


        } catch (error) {

            console.error(

                "Password reset request error:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "An unexpected error occurred."

            });

        }

    }

);


// ========================================
// VERIFY PASSWORD RESET CODE
// ========================================
//
// POST
// /api/password-reset/verify
//
// Body:
//
// {
//     "email": "employee@company.com",
//     "verification_code": "123456"
// }
// ========================================

router.post(

    "/verify",

    (req, res) => {

        try {

            const email =
                normalizeEmail(
                    req.body.email
                );


            const verificationCode =
                String(
                    req.body.verification_code ||
                    ""
                ).trim();


            // ========================================
            // VALIDATE INPUT
            // ========================================

            if (!email) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email address is required."

                });

            }


            if (
                !/^\d{6}$/.test(
                    verificationCode
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter the 6-digit verification code."

                });

            }


            // ========================================
            // FIND USER
            // ========================================

            const user =
                db.prepare(`

                    SELECT
                        id,
                        email,
                        recovery_email,
                        recovery_email_verified,
                        is_active

                    FROM users

                    WHERE email = ?

                `).get(email);


            if (!user) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid or expired password reset code."

                });

            }


            // ========================================
            // FIND PENDING RESET
            // ========================================

            const resetRequest =
                db.prepare(`

                    SELECT
                        id,
                        recovery_email,
                        code_hash,
                        expires_at,
                        attempts,
                        verified_at

                    FROM password_reset_verifications

                    WHERE user_id = ?

                    AND verified_at IS NULL

                    ORDER BY created_at DESC

                    LIMIT 1

                `).get(user.id);


            if (!resetRequest) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid or expired password reset code."

                });

            }


            // ========================================
            // CHECK ATTEMPTS
            // ========================================

            if (
                resetRequest.attempts >=
                MAX_ATTEMPTS
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Too many incorrect attempts. Please request a new reset code."

                });

            }


            // ========================================
            // CHECK EXPIRATION
            // ========================================

            const expirationDate =
                new Date(
                    resetRequest.expires_at +
                    "Z"
                );


            if (
                Date.now() >
                expirationDate.getTime()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This password reset code has expired. Please request a new code."

                });

            }


            // ========================================
            // CHECK RECOVERY EMAIL
            // ========================================

            if (

                !user.recovery_email ||

                !user.recovery_email_verified ||

                user.recovery_email !==
                resetRequest.recovery_email

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid or expired password reset code."

                });

            }


            // ========================================
            // HASH SUBMITTED CODE
            // ========================================

            const submittedHash =
                hashResetCode(
                    verificationCode
                );


            // ========================================
            // COMPARE HASHES
            // ========================================

            const hashesMatch =
                crypto.timingSafeEqual(

                    Buffer.from(
                        submittedHash,
                        "hex"
                    ),

                    Buffer.from(
                        resetRequest.code_hash,
                        "hex"
                    )

                );


            // ========================================
            // WRONG CODE
            // ========================================

            if (!hashesMatch) {

                const newAttempts =
                    resetRequest.attempts + 1;


                db.prepare(`

                    UPDATE password_reset_verifications

                    SET
                        attempts = ?

                    WHERE id = ?

                `).run(

                    newAttempts,

                    resetRequest.id

                );


                const remainingAttempts =
                    Math.max(

                        0,

                        MAX_ATTEMPTS -
                        newAttempts

                    );


                return res.status(400).json({

                    success: false,

                    message:

                        remainingAttempts > 0

                            ? "Incorrect verification code."

                            : "Too many incorrect attempts. Please request a new reset code.",

                    remaining_attempts:
                        remainingAttempts

                });

            }


            // ========================================
            // MARK VERIFICATION SUCCESSFUL
            // ========================================

            db.prepare(`

                UPDATE password_reset_verifications

                SET
                    verified_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?

            `).run(

                resetRequest.id

            );


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(

                user.id,

                "PASSWORD_RESET_CODE_VERIFIED",

                "Verified a password reset code."

            );


            // ========================================
            // RESPONSE
            // ========================================

            return res.json({

                success: true,

                message:
                    "Password reset code verified successfully.",

                reset_verification_id:
                    resetRequest.id

            });


        } catch (error) {

            console.error(

                "Password reset verification error:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "An unexpected error occurred."

            });

        }

    }

);


// ========================================
// RESET PASSWORD
// ========================================
//
// POST
// /api/password-reset/reset
//
// Body:
//
// {
//     "email": "employee@company.com",
//     "reset_verification_id": 1,
//     "new_password": "NewPassword123!"
// }
// ========================================

router.post(

    "/reset",

    async (req, res) => {

        try {

            const email =
                normalizeEmail(
                    req.body.email
                );


            const resetVerificationId =
                Number(
                    req.body.reset_verification_id
                );


            const newPassword =
                String(
                    req.body.new_password ||
                    ""
                );


            // ========================================
            // VALIDATE INPUT
            // ========================================

            if (!email) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email address is required."

                });

            }


            if (

                !Number.isInteger(
                    resetVerificationId
                ) ||

                resetVerificationId <= 0

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid password reset verification."

                });

            }


            if (!newPassword) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password is required."

                });

            }


            if (
                newPassword.length < 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must be at least 8 characters long."

                });

            }


            // ========================================
            // GET USER
            // ========================================

            const user =
                db.prepare(`

                    SELECT
                        id,
                        email,
                        password_hash,
                        recovery_email,
                        recovery_email_verified,
                        is_active

                    FROM users

                    WHERE email = ?

                `).get(email);


            if (!user) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid password reset request."

                });

            }


            // ========================================
            // CHECK ACCOUNT STATUS
            // ========================================

            if (!user.is_active) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This account is inactive."

                });

            }


            // ========================================
            // CHECK VERIFIED RESET REQUEST
            // ========================================

            const resetRequest =
                db.prepare(`

                    SELECT
                        id,
                        user_id,
                        verified_at,
                        expires_at

                    FROM password_reset_verifications

                    WHERE id = ?

                    AND user_id = ?

                    AND verified_at IS NOT NULL

                `).get(

                    resetVerificationId,

                    user.id

                );


            if (!resetRequest) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please verify your password reset code first."

                });

            }


            // ========================================
            // CHECK EXPIRATION
            // ========================================

            const expirationDate =
                new Date(
                    resetRequest.expires_at +
                    "Z"
                );


            if (
                Date.now() >
                expirationDate.getTime()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Your password reset verification has expired. Please request a new code."

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

                `).all(user.id);


            for (
                const previousPassword
                of previousPasswords
            ) {

                const reusedPassword =
                    await bcrypt.compare(

                        newPassword,

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

                    newPassword,

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

                user.id,

                user.password_hash

            );


            // ========================================
            // HASH NEW PASSWORD
            // ========================================

            const newPasswordHash =
                await bcrypt.hash(

                    newPassword,

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

                user.id

            );


            // ========================================
            // REMOVE USED RESET REQUEST
            // ========================================

            db.prepare(`

                DELETE FROM password_reset_verifications

                WHERE id = ?

            `).run(

                resetVerificationId

            );


            // ========================================
            // ACTIVITY LOG
            // ========================================

            logActivity(

                user.id,

                "PASSWORD_RESET_COMPLETED",

                "Reset account password using the verified recovery email."

            );


            // ========================================
            // RESPONSE
            // ========================================

            return res.json({

                success: true,

                message:
                    "Password reset successfully."

            });


        } catch (error) {

            console.error(

                "Password reset error:",

                error

            );


            return res.status(500).json({

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