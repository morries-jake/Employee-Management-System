// ========================================
// FORGOT PASSWORD
// ========================================


// ========================================
// GET ROLE AND EMAIL FROM URL
// ========================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const role =
    urlParams.get("role");

const initialEmail =
    urlParams.get("email");


// Only allow valid roles
const userRole =
    role === "admin" || role === "employee"
        ? role
        : null;


// ========================================
// ELEMENTS
// ========================================

// Step 1
const resetEmailStep =
    document.getElementById(
        "resetEmailStep"
    );

const resetEmailForm =
    document.getElementById(
        "resetEmailForm"
    );

const resetEmail =
    document.getElementById(
        "resetEmail"
    );

const resetEmailTitle =
    document.getElementById(
        "resetEmailTitle"
    );

const resetEmailDescription =
    document.getElementById(
        "resetEmailDescription"
    );

const requestResetButton =
    document.getElementById(
        "requestResetButton"
    );

const resetEmailMessage =
    document.getElementById(
        "resetEmailMessage"
    );


// Step 2
const resetCodeStep =
    document.getElementById(
        "resetCodeStep"
    );

const resetCodeForm =
    document.getElementById(
        "resetCodeForm"
    );

const resetCode =
    document.getElementById(
        "resetCode"
    );

const verifyResetCodeButton =
    document.getElementById(
        "verifyResetCodeButton"
    );

const resetCodeMessage =
    document.getElementById(
        "resetCodeMessage"
    );

const resendResetCodeButton =
    document.getElementById(
        "resendResetCodeButton"
    );

const resendResetMessage =
    document.getElementById(
        "resendResetMessage"
    );

const cancelResetButton =
    document.getElementById(
        "cancelResetButton"
    );


// Step 3
const resetPasswordStep =
    document.getElementById(
        "resetPasswordStep"
    );

const resetPasswordForm =
    document.getElementById(
        "resetPasswordForm"
    );

const newResetPassword =
    document.getElementById(
        "newResetPassword"
    );

const confirmResetPassword =
    document.getElementById(
        "confirmResetPassword"
    );

const resetPasswordButton =
    document.getElementById(
        "resetPasswordButton"
    );

const resetPasswordMessage =
    document.getElementById(
        "resetPasswordMessage"
    );


// Footer
const forgotPasswordFooter =
    document.getElementById(
        "forgotPasswordFooter"
    );

const backToLoginButton =
    document.getElementById(
        "backToLoginButton"
    );


// ========================================
// STATE
// ========================================

let currentEmail =
    "";

let verificationCodeVerified =
    false;

// NEW:
// Stores the verification record ID returned
// by the backend after successful code verification.
let resetVerificationId =
    null;

let resendTimer =
    null;

let resendSeconds =
    0;


// ========================================
// CHECK ROLE
// ========================================

if (!userRole) {

    resetEmailStep.hidden =
        true;

    resetCodeStep.hidden =
        true;

    resetPasswordStep.hidden =
        true;

    forgotPasswordFooter.hidden =
        false;

    backToLoginButton.textContent =
        "Back to Login";

} else {

    if (userRole === "admin") {

        document.title =
            "Admin Password Recovery | Employee Task Management";

        resetEmailTitle.textContent =
            "Admin Password Recovery";

        resetEmailDescription.textContent =
            "Enter your administrator account email to begin password recovery.";

        backToLoginButton.textContent =
            "Back to Admin Login";

    } else {

        document.title =
            "Forgot Password | Employee Task Management";

        resetEmailTitle.textContent =
            "Forgot Password";

        resetEmailDescription.textContent =
            "Enter your company account email to receive a password reset code.";

        backToLoginButton.textContent =
            "Back to Employee Login";

    }
}


// ========================================
// SHOW STEP
// ========================================

function showStep(step) {

    resetEmailStep.hidden =
        step !== 1;

    resetCodeStep.hidden =
        step !== 2;

    resetPasswordStep.hidden =
        step !== 3;

    forgotPasswordFooter.hidden =
        step === 2;

}


// ========================================
// SHOW MESSAGE
// ========================================

function showMessage(
    element,
    message,
    type = "normal"
) {

    element.textContent =
        message;

    if (type === "error") {

        element.style.color =
            "#dc2626";

    } else if (type === "success") {

        element.style.color =
            "#16a34a";

    } else {

        element.style.color =
            "#6b7280";

    }

}


// ========================================
// CLEAR MESSAGE
// ========================================

function clearMessage(element) {

    element.textContent =
        "";

    element.style.color =
        "#6b7280";

}


// ========================================
// EMAIL VALIDATION
// ========================================

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


// ========================================
// PASSWORD TOGGLE
// ========================================

function setupPasswordToggle(
    passwordInput,
    toggleButton
) {

    const eyeOpen =
        toggleButton.querySelector(
            ".eye-open"
        );

    const eyeClosed =
        toggleButton.querySelector(
            ".eye-closed"
        );


    toggleButton.addEventListener(
        "click",
        () => {

            const isPassword =
                passwordInput.type === "password";


            if (isPassword) {

                passwordInput.type =
                    "text";

                toggleButton.setAttribute(
                    "aria-label",
                    "Hide password"
                );

                eyeOpen.style.display =
                    "none";

                eyeClosed.style.display =
                    "block";

            } else {

                passwordInput.type =
                    "password";

                toggleButton.setAttribute(
                    "aria-label",
                    "Show password"
                );

                eyeOpen.style.display =
                    "block";

                eyeClosed.style.display =
                    "none";

            }

        }
    );

}


setupPasswordToggle(
    newResetPassword,
    document.getElementById(
        "toggleNewResetPassword"
    )
);


setupPasswordToggle(
    confirmResetPassword,
    document.getElementById(
        "toggleConfirmResetPassword"
    )
);


// ========================================
// PREFILL EMAIL
// ========================================

if (
    initialEmail &&
    isValidEmail(initialEmail)
) {

    resetEmail.value =
        initialEmail;

    currentEmail =
        initialEmail.toLowerCase();

}


// ========================================
// SHOW INITIAL STEP
// ========================================

showStep(1);


// ========================================
// STEP 1
// REQUEST RESET CODE
// ========================================

resetEmailForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearMessage(
            resetEmailMessage
        );


        const email =
            resetEmail.value
                .trim()
                .toLowerCase();


        // Validate email
        if (!email) {

            showMessage(
                resetEmailMessage,
                "Please enter your email address.",
                "error"
            );

            resetEmail.focus();

            return;

        }


        if (!isValidEmail(email)) {

            showMessage(
                resetEmailMessage,
                "Please enter a valid email address.",
                "error"
            );

            resetEmail.focus();

            return;

        }


        requestResetButton.disabled =
            true;

        requestResetButton.textContent =
            "Sending...";


        try {

            const response =
                await fetch(
                    "/api/password-reset/request",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            email: email
                        })
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                showMessage(
                    resetEmailMessage,
                    data.message ||
                        "Unable to send the reset code.",
                    "error"
                );

                return;

            }


            currentEmail =
                email;

            verificationCodeVerified =
                false;

            // NEW:
            // Any new reset request creates a new
            // verification record.
            resetVerificationId =
                null;


            showMessage(
                resetEmailMessage,
                data.message ||
                    "A verification code has been sent to your recovery email.",
                "success"
            );


            // Move to code verification
            setTimeout(
                () => {

                    clearMessage(
                        resetEmailMessage
                    );

                    showStep(2);

                    resetCode.focus();

                    startResendTimer();

                },
                700
            );


        } catch (error) {

            console.error(
                "Password reset request error:",
                error
            );

            showMessage(
                resetEmailMessage,
                "Unable to connect to the server. Please try again.",
                "error"
            );

        } finally {

            requestResetButton.disabled =
                false;

            requestResetButton.textContent =
                "Send Reset Code";

        }

    }
);


// ========================================
// STEP 2
// VERIFY CODE
// ========================================

resetCodeForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearMessage(
            resetCodeMessage
        );


        const code =
            resetCode.value
                .trim()
                .replace(/\D/g, "");


        // Validate code
        if (!code) {

            showMessage(
                resetCodeMessage,
                "Please enter the verification code.",
                "error"
            );

            resetCode.focus();

            return;

        }


        if (code.length !== 6) {

            showMessage(
                resetCodeMessage,
                "The verification code must contain 6 digits.",
                "error"
            );

            resetCode.focus();

            return;

        }


        verifyResetCodeButton.disabled =
            true;

        verifyResetCodeButton.textContent =
            "Verifying...";


        try {

            const response =
                await fetch(
                    "/api/password-reset/verify",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({

                            email:
                                currentEmail,

                            verification_code:
                                code

                        })
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                showMessage(
                    resetCodeMessage,
                    data.message ||
                        "Invalid verification code.",
                    "error"
                );

                return;

            }


            // ========================================
            // IMPORTANT FIX
            // ========================================

            verificationCodeVerified =
                true;

            // The backend returns this value:
            //
            // reset_verification_id
            //
            // We must save it because the final
            // password reset request requires it.

            resetVerificationId =
                data.reset_verification_id;


            // Make sure the backend actually
            // returned a valid verification ID.

            if (!resetVerificationId) {

                verificationCodeVerified =
                    false;

                showMessage(
                    resetCodeMessage,
                    "Verification succeeded, but the reset verification could not be created. Please request a new code.",
                    "error"
                );

                return;

            }


            showMessage(
                resetCodeMessage,
                data.message ||
                    "Verification successful.",
                "success"
            );


            clearResendTimer();


            setTimeout(
                () => {

                    clearMessage(
                        resetCodeMessage
                    );

                    showStep(3);

                    newResetPassword.focus();

                },
                500
            );


        } catch (error) {

            console.error(
                "Password reset verification error:",
                error
            );

            showMessage(
                resetCodeMessage,
                "Unable to connect to the server. Please try again.",
                "error"
            );

        } finally {

            verifyResetCodeButton.disabled =
                false;

            verifyResetCodeButton.textContent =
                "Verify Code";

        }

    }
);


// ========================================
// RESEND CODE
// ========================================

resendResetCodeButton.addEventListener(
    "click",
    async () => {

        if (
            resendSeconds > 0
        ) {

            return;

        }


        clearMessage(
            resendResetMessage
        );


        resendResetCodeButton.disabled =
            true;

        resendResetCodeButton.textContent =
            "Sending...";


        try {

            const response =
                await fetch(
                    "/api/password-reset/request",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            email:
                                currentEmail
                        })
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                showMessage(
                    resendResetMessage,
                    data.message ||
                        "Unable to resend the code.",
                    "error"
                );

                return;

            }


            resetCode.value =
                "";

            verificationCodeVerified =
                false;

            // NEW:
            // The resend creates a new verification
            // request, so the old ID must not be reused.
            resetVerificationId =
                null;


            showMessage(
                resendResetMessage,
                data.message ||
                    "A new verification code has been sent.",
                "success"
            );


            startResendTimer();


        } catch (error) {

            console.error(
                "Resend reset code error:",
                error
            );

            showMessage(
                resendResetMessage,
                "Unable to connect to the server. Please try again.",
                "error"
            );

        } finally {

            if (
                resendSeconds === 0
            ) {

                resendResetCodeButton.disabled =
                    false;

            }

            resendResetCodeButton.textContent =
                "Resend Code";

        }

    }
);


// ========================================
// RESEND TIMER
// ========================================

function startResendTimer() {

    clearResendTimer();


    resendSeconds =
        60;


    resendResetCodeButton.disabled =
        true;


    updateResendButton();


    resendTimer =
        setInterval(
            () => {

                resendSeconds--;

                updateResendButton();


                if (
                    resendSeconds <= 0
                ) {

                    clearResendTimer();

                }

            },
            1000
        );

}


// ========================================
// UPDATE RESEND BUTTON
// ========================================

function updateResendButton() {

    if (
        resendSeconds > 0
    ) {

        resendResetCodeButton.disabled =
            true;

        resendResetCodeButton.textContent =
            `Resend Code (${resendSeconds}s)`;

    } else {

        resendResetCodeButton.disabled =
            false;

        resendResetCodeButton.textContent =
            "Resend Code";

    }

}


// ========================================
// CLEAR RESEND TIMER
// ========================================

function clearResendTimer() {

    if (resendTimer) {

        clearInterval(
            resendTimer
        );

        resendTimer =
            null;

    }


    resendSeconds =
        0;


    resendResetCodeButton.disabled =
        false;

    resendResetCodeButton.textContent =
        "Resend Code";

}


// ========================================
// BACK FROM CODE VERIFICATION
// ========================================

cancelResetButton.addEventListener(
    "click",
    () => {

        clearResendTimer();

        clearMessage(
            resetCodeMessage
        );

        clearMessage(
            resendResetMessage
        );

        resetCode.value =
            "";

        verificationCodeVerified =
            false;

        resetVerificationId =
            null;

        showStep(1);

        resetEmail.focus();

    }
);


// ========================================
// STEP 3
// RESET PASSWORD
// ========================================

resetPasswordForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearMessage(
            resetPasswordMessage
        );


        // ========================================
        // MAKE SURE CODE WAS VERIFIED
        // ========================================

        if (
            !verificationCodeVerified ||
            !resetVerificationId
        ) {

            showMessage(
                resetPasswordMessage,
                "Please verify the reset code first.",
                "error"
            );

            showStep(2);

            resetCode.focus();

            return;

        }


        const newPassword =
            newResetPassword.value;

        const confirmPassword =
            confirmResetPassword.value;


        // Validate password
        if (!newPassword) {

            showMessage(
                resetPasswordMessage,
                "Please enter a new password.",
                "error"
            );

            newResetPassword.focus();

            return;

        }


        if (
            newPassword.length < 8
        ) {

            showMessage(
                resetPasswordMessage,
                "Password must be at least 8 characters long.",
                "error"
            );

            newResetPassword.focus();

            return;

        }


        if (!confirmPassword) {

            showMessage(
                resetPasswordMessage,
                "Please confirm your new password.",
                "error"
            );

            confirmResetPassword.focus();

            return;

        }


        if (
            newPassword !==
            confirmPassword
        ) {

            showMessage(
                resetPasswordMessage,
                "Passwords do not match.",
                "error"
            );

            confirmResetPassword.focus();

            return;

        }


        resetPasswordButton.disabled =
            true;

        resetPasswordButton.textContent =
            "Resetting...";


        try {

            const response =
                await fetch(
                    "/api/password-reset/reset",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({

                            email:
                                currentEmail,

                            // IMPORTANT FIX:
                            // The backend requires this ID
                            // to identify the verified
                            // password reset request.
                            reset_verification_id:
                                resetVerificationId,

                            new_password:
                                newPassword

                        })
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                showMessage(
                    resetPasswordMessage,
                    data.message ||
                        "Unable to reset your password.",
                    "error"
                );

                return;

            }


            showMessage(
                resetPasswordMessage,
                data.message ||
                    "Password reset successful.",
                "success"
            );


            resetPasswordButton.disabled =
                true;


            setTimeout(
                () => {

                    if (
                        userRole === "admin"
                    ) {

                        window.location.href =
                            "./login.html?role=admin";

                    } else {

                        window.location.href =
                            "./login.html?role=employee";

                    }

                },
                1200
            );


        } catch (error) {

            console.error(
                "Password reset error:",
                error
            );

            showMessage(
                resetPasswordMessage,
                "Unable to connect to the server. Please try again.",
                "error"
            );

        } finally {

            if (
                !resetPasswordButton.disabled
            ) {

                resetPasswordButton.textContent =
                    "Reset Password";

            }

        }

    }
);


// ========================================
// BACK TO LOGIN
// ========================================

backToLoginButton.addEventListener(
    "click",
    () => {

        if (
            userRole === "admin"
        ) {

            window.location.href =
                "./login.html?role=admin";

        } else if (
            userRole === "employee"
        ) {

            window.location.href =
                "./login.html?role=employee";

        } else {

            window.location.href =
                "./login.html";

        }

    }
);