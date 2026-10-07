const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

async function sendEmail({ to, subject, text, html }) {
    try {
        const info = await transporter.sendMail({
            from: `"ETM Support" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        });

        console.log("Email sent successfully.");
        console.log("Message ID:", info.messageId);

        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error("Email sending error:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

async function verifyEmailConnection() {
    try {
        await transporter.verify();

        console.log("Gmail SMTP connection successful.");

        return true;
    } catch (error) {
        console.error("Gmail SMTP connection failed.");
        console.error(error.message);

        return false;
    }
}

module.exports = {
    sendEmail,
    verifyEmailConnection
};