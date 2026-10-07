const express = require("express");
const crypto = require("crypto");
const db = require("../database");
const { requireLogin } = require("../middleware/auth");
const logActivity = require("../activity-log");
const { sendEmail } = require("../mailer");

const router = express.Router();

const CODE_EXPIRATION_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/*
|--------------------------------------------------------------------------
| Helper: Normalize email
|--------------------------------------------------------------------------
*/

function normalizeEmail(email) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

/*
|--------------------------------------------------------------------------
| Helper: Validate email
|--------------------------------------------------------------------------
*/

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/*
|--------------------------------------------------------------------------
| Helper: Generate verification code
|--------------------------------------------------------------------------
*/

function generateVerificationCode() {
    return crypto.randomInt(100000, 1000000).toString();
}

/*
|--------------------------------------------------------------------------
| Helper: Hash verification code
|--------------------------------------------------------------------------
*/

function hashVerificationCode(code) {
    return crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");
}

/*
|--------------------------------------------------------------------------
| GET /api/recovery-email/status
|--------------------------------------------------------------------------
| Returns the current recovery email status.
|--------------------------------------------------------------------------
*/

router.get("/status", requireLogin, (req, res) => {
    try {
        const user = db.prepare(`
            SELECT
                recovery_email,
                recovery_email_verified
            FROM users
            WHERE id = ?
        `).get(req.session.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found."
            });
        }

        const pendingVerification = db.prepare(`
            SELECT
                recovery_email,
                expires_at,
                created_at
            FROM recovery_email_verifications
            WHERE user_id = ?
              AND verified_at IS NULL
            ORDER BY id DESC
            LIMIT 1
        `).get(req.session.user.id);

        res.json({
            success: true,
            recovery_email: user.recovery_email || null,
            recovery_email_verified:
                user.recovery_email_verified === 1,
            pending_email:
                pendingVerification
                    ? pendingVerification.recovery_email
                    : null,
            pending_expires_at:
                pendingVerification
                    ? pendingVerification.expires_at
                    : null
        });

    } catch (error) {
        console.error(
            "Get recovery email status error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "An unexpected error occurred."
        });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/recovery-email/request
|--------------------------------------------------------------------------
| Requests a new verification code.
|--------------------------------------------------------------------------
*/

router.post("/request", requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;

        const recoveryEmail =
            normalizeEmail(req.body.recovery_email);

        /*
        |--------------------------------------------------------------------------
        | Validate email
        |--------------------------------------------------------------------------
        */

        if (!recoveryEmail) {
            return res.status(400).json({
                success: false,
                message: "Recovery email is required."
            });
        }

        if (!isValidEmail(recoveryEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Get current user
        |--------------------------------------------------------------------------
        */

        const user = db.prepare(`
            SELECT
                id,
                email,
                recovery_email,
                recovery_email_verified
            FROM users
            WHERE id = ?
        `).get(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Recovery email should be different from login email
        |--------------------------------------------------------------------------
        */

        if (
            recoveryEmail ===
            String(user.email).trim().toLowerCase()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Recovery email must be different from your login email."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent rapid resend requests
        |--------------------------------------------------------------------------
        */

        const latestVerification = db.prepare(`
            SELECT
                created_at
            FROM recovery_email_verifications
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 1
        `).get(userId);

        if (latestVerification) {
            const createdAt =
                new Date(
                    String(
                        latestVerification.created_at
                    ).replace(" ", "T") + "Z"
                );

            const elapsedSeconds =
                (Date.now() - createdAt.getTime()) /
                1000;

            if (
                !Number.isNaN(elapsedSeconds) &&
                elapsedSeconds <
                    RESEND_COOLDOWN_SECONDS
            ) {
                const remainingSeconds =
                    Math.ceil(
                        RESEND_COOLDOWN_SECONDS -
                        elapsedSeconds
                    );

                return res.status(429).json({
                    success: false,
                    message:
                        `Please wait ${remainingSeconds} seconds before requesting another code.`,
                    retry_after_seconds:
                        remainingSeconds
                });
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Generate verification code
        |--------------------------------------------------------------------------
        */

        const verificationCode =
            generateVerificationCode();

        const codeHash =
            hashVerificationCode(
                verificationCode
            );

        /*
        |--------------------------------------------------------------------------
        | Expiration
        |--------------------------------------------------------------------------
        */

        const expiresAt =
            new Date(
                Date.now() +
                CODE_EXPIRATION_MINUTES *
                60 *
                1000
            ).toISOString();

        /*
        |--------------------------------------------------------------------------
        | Remove previous pending verification codes
        |--------------------------------------------------------------------------
        */

        db.prepare(`
            DELETE FROM recovery_email_verifications
            WHERE user_id = ?
              AND verified_at IS NULL
        `).run(userId);

        /*
        |--------------------------------------------------------------------------
        | Store hashed verification code
        |--------------------------------------------------------------------------
        */

        db.prepare(`
            INSERT INTO recovery_email_verifications (
                user_id,
                recovery_email,
                code_hash,
                expires_at
            )
            VALUES (?, ?, ?, ?)
        `).run(
            userId,
            recoveryEmail,
            codeHash,
            expiresAt
        );

        /*
        |--------------------------------------------------------------------------
        | Send verification email
        |--------------------------------------------------------------------------
        */

        const emailResult =
            await sendEmail({
                to: recoveryEmail,
                subject:
                    "Your ETM Recovery Email Verification Code",
                text:
                    `Your ETM verification code is ${verificationCode}. ` +
                    `This code expires in ${CODE_EXPIRATION_MINUTES} minutes.`,
                html: `
                    <div style="
                        font-family: Arial, sans-serif;
                        max-width: 500px;
                        margin: 0 auto;
                        padding: 24px;
                        color: #222;
                    ">
                        <h2 style="margin-bottom: 8px;">
                            ETM Recovery Email Verification
                        </h2>

                        <p>
                            You requested to connect this email
                            address as your recovery email for
                            the Employee Task Management System.
                        </p>

                        <p>
                            Your verification code is:
                        </p>

                        <div style="
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 6px;
                            margin: 20px 0;
                            padding: 16px;
                            text-align: center;
                            background: #f4f6f8;
                            border-radius: 8px;
                        ">
                            ${verificationCode}
                        </div>

                        <p>
                            This code expires in
                            ${CODE_EXPIRATION_MINUTES} minutes.
                        </p>

                        <p>
                            If you did not request this,
                            you can safely ignore this email.
                        </p>

                        <hr style="
                            border: none;
                            border-top: 1px solid #ddd;
                            margin: 24px 0;
                        ">

                        <p style="
                            font-size: 12px;
                            color: #777;
                        ">
                            Employee Task Management System
                        </p>
                    </div>
                `
            });

        /*
        |--------------------------------------------------------------------------
        | Email sending failed
        |--------------------------------------------------------------------------
        */

        if (!emailResult.success) {
            db.prepare(`
                DELETE FROM recovery_email_verifications
                WHERE user_id = ?
                  AND recovery_email = ?
                  AND verified_at IS NULL
            `).run(
                userId,
                recoveryEmail
            );

            return res.status(500).json({
                success: false,
                message:
                    "The verification email could not be sent. Please try again later."
            });
        }

        res.json({
            success: true,
            message:
                "A verification code has been sent to your recovery email.",
            recovery_email: recoveryEmail,
            expires_in_minutes:
                CODE_EXPIRATION_MINUTES,
            resend_after_seconds:
                RESEND_COOLDOWN_SECONDS
        });

    } catch (error) {
        console.error(
            "Request recovery email verification error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "An unexpected error occurred."
        });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/recovery-email/verify
|--------------------------------------------------------------------------
| Verifies the 6-digit recovery email code.
|--------------------------------------------------------------------------
*/

router.post("/verify", requireLogin, (req, res) => {
    try {
        const userId = req.session.user.id;

        const recoveryEmail =
            normalizeEmail(req.body.recovery_email);

        const verificationCode =
            String(
                req.body.verification_code || ""
            ).trim();

        /*
        |--------------------------------------------------------------------------
        | Validate input
        |--------------------------------------------------------------------------
        */

        if (!recoveryEmail) {
            return res.status(400).json({
                success: false,
                message: "Recovery email is required."
            });
        }

        if (!isValidEmail(recoveryEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
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
                    "Verification code must be exactly 6 digits."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Get latest pending verification
        |--------------------------------------------------------------------------
        */

        const verification =
            db.prepare(`
                SELECT
                    id,
                    recovery_email,
                    code_hash,
                    expires_at,
                    attempts
                FROM recovery_email_verifications
                WHERE user_id = ?
                  AND verified_at IS NULL
                ORDER BY id DESC
                LIMIT 1
            `).get(userId);

        if (!verification) {
            return res.status(400).json({
                success: false,
                message:
                    "No pending verification request was found."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Make sure email matches
        |--------------------------------------------------------------------------
        */

        if (
            verification.recovery_email !==
            recoveryEmail
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "The recovery email does not match the pending verification."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Check attempt limit
        |--------------------------------------------------------------------------
        */

        if (
            verification.attempts >=
            MAX_ATTEMPTS
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Too many incorrect attempts. Please request a new verification code."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Check expiration
        |--------------------------------------------------------------------------
        */

        const expiresAt =
            new Date(
                verification.expires_at
            );

        if (
            Number.isNaN(
                expiresAt.getTime()
            ) ||
            Date.now() >
                expiresAt.getTime()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This verification code has expired. Please request a new code."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Hash submitted code
        |--------------------------------------------------------------------------
        */

        const submittedHash =
            hashVerificationCode(
                verificationCode
            );

        /*
        |--------------------------------------------------------------------------
        | Compare hashes
        |--------------------------------------------------------------------------
        */

        const codeMatches =
            crypto.timingSafeEqual(
                Buffer.from(
                    verification.code_hash,
                    "utf8"
                ),
                Buffer.from(
                    submittedHash,
                    "utf8"
                )
            );

        /*
        |--------------------------------------------------------------------------
        | Incorrect code
        |--------------------------------------------------------------------------
        */

        if (!codeMatches) {
            const newAttemptCount =
                verification.attempts + 1;

            db.prepare(`
                UPDATE recovery_email_verifications
                SET attempts = ?
                WHERE id = ?
            `).run(
                newAttemptCount,
                verification.id
            );

            const remainingAttempts =
                Math.max(
                    0,
                    MAX_ATTEMPTS -
                    newAttemptCount
                );

            return res.status(400).json({
                success: false,
                message:
                    remainingAttempts > 0
                        ? "Incorrect verification code."
                        : "Too many incorrect attempts. Please request a new verification code.",
                remaining_attempts:
                    remainingAttempts
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Verify recovery email
        |--------------------------------------------------------------------------
        */

        const now =
            new Date().toISOString();

        const updateUser =
            db.transaction(() => {
                db.prepare(`
                    UPDATE users
                    SET
                        recovery_email = ?,
                        recovery_email_verified = 1
                    WHERE id = ?
                `).run(
                    recoveryEmail,
                    userId
                );

                db.prepare(`
                    UPDATE recovery_email_verifications
                    SET verified_at = ?
                    WHERE id = ?
                `).run(
                    now,
                    verification.id
                );
            });

        updateUser();

        /*
        |--------------------------------------------------------------------------
        | Activity log
        |--------------------------------------------------------------------------
        */

        logActivity(
            userId,
            "RECOVERY_EMAIL_VERIFIED",
            `Recovery email ${recoveryEmail} was successfully verified.`
        );

        res.json({
            success: true,
            message:
                "Recovery email verified successfully.",
            recovery_email:
                recoveryEmail,
            recovery_email_verified:
                true
        });

    } catch (error) {
        console.error(
            "Verify recovery email error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "An unexpected error occurred."
        });
    }
});

/*
|--------------------------------------------------------------------------
| DELETE /api/recovery-email
|--------------------------------------------------------------------------
| Disconnects the currently verified recovery email.
|--------------------------------------------------------------------------
*/

router.delete("/", requireLogin, (req, res) => {
    try {
        const userId = req.session.user.id;

        const user = db.prepare(`
            SELECT
                recovery_email,
                recovery_email_verified
            FROM users
            WHERE id = ?
        `).get(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found."
            });
        }

        if (
            !user.recovery_email ||
            user.recovery_email_verified !== 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "No verified recovery email is connected."
            });
        }

        const oldRecoveryEmail =
            user.recovery_email;

        const disconnect =
            db.transaction(() => {
                db.prepare(`
                    UPDATE users
                    SET
                        recovery_email = NULL,
                        recovery_email_verified = 0
                    WHERE id = ?
                `).run(userId);

                db.prepare(`
                    DELETE FROM recovery_email_verifications
                    WHERE user_id = ?
                `).run(userId);
            });

        disconnect();

        logActivity(
            userId,
            "RECOVERY_EMAIL_DISCONNECTED",
            `Recovery email ${oldRecoveryEmail} was disconnected.`
        );

        res.json({
            success: true,
            message:
                "Recovery email disconnected successfully."
        });

    } catch (error) {
        console.error(
            "Disconnect recovery email error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "An unexpected error occurred."
        });
    }
});

module.exports = router;