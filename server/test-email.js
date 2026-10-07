const { sendEmail } = require("./mailer");

async function testEmail() {
    const recipient =
        process.env.EMAIL_TEST_RECIPIENT;

    if (!recipient) {
        throw new Error(
            "Set EMAIL_TEST_RECIPIENT to the address that should receive the test email."
        );
    }

    const result = await sendEmail({
        to: recipient,
        subject: "ETM Test Email",
        text: "This is a test email from the Employee Task Management System.",
        html: `
            <h2>ETM Test Email</h2>
            <p>
                This is a test email from the
                Employee Task Management System.
            </p>
            <p>
                If you received this message,
                Gmail and Nodemailer are working correctly.
            </p>
        `
    });

    if (result.success) {
        console.log("Test email sent successfully.");
    } else {
        console.error("Test email failed.");
        console.error(result.message);
    }
}

testEmail();