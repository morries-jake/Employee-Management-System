// ========================================
// LOGIN
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // ========================================
        // GET ROLE FROM URL
        // ========================================

        const urlParams =
            new URLSearchParams(
                window.location.search
            );

        const role =
            urlParams.get("role");


        // Only allow valid roles

        const userRole =
            role === "admin" ||
            role === "employee"
                ? role
                : null;


        // ========================================
        // ELEMENTS
        // ========================================

        const pageTitle =
            document.querySelector("title");

        const loginTitle =
            document.getElementById(
                "loginTitle"
            );

        const loginDescription =
            document.getElementById(
                "loginDescription"
            );

        const loginForm =
            document.getElementById(
                "loginForm"
            );

        const emailInput =
            document.getElementById(
                "email"
            );

        const passwordInput =
            document.getElementById(
                "password"
            );

        const togglePasswordButton =
            document.getElementById(
                "togglePasswordButton"
            );

        const forgotPasswordButton =
            document.getElementById(
                "forgotPasswordButton"
            );

        const loginButton =
            document.getElementById(
                "loginButton"
            );

        const loginMessage =
            document.getElementById(
                "loginMessage"
            );

        const backButton =
            document.getElementById(
                "backButton"
            );

        const eyeOpen =
            document.querySelector(
                ".eye-open"
            );

        const eyeClosed =
            document.querySelector(
                ".eye-closed"
            );


        // ========================================
        // CHECK ROLE
        // ========================================

        if (!userRole) {

            loginTitle.textContent =
                "Invalid Login";

            loginDescription.textContent =
                "Please select a valid account type.";

            loginForm.style.display =
                "none";

            return;
        }


        // ========================================
        // ROLE-SPECIFIC CONTENT
        // ========================================

        if (userRole === "admin") {

            pageTitle.textContent =
                "Admin Login | Employee Task Management";

            loginTitle.textContent =
                "Admin Login";

            loginDescription.textContent =
                "Sign in to access the administrator dashboard.";

        } else {

            pageTitle.textContent =
                "Employee Login | Employee Task Management";

            loginTitle.textContent =
                "Employee Login";

            loginDescription.textContent =
                "Sign in to access your employee dashboard.";
        }


        // ========================================
        // MESSAGE
        // ========================================

        function showMessage(
            message,
            type = "normal"
        ) {

            loginMessage.textContent =
                message;

            if (type === "error") {

                loginMessage.style.color =
                    "#dc2626";

            } else if (type === "success") {

                loginMessage.style.color =
                    "#16a34a";

            } else {

                loginMessage.style.color =
                    "#6b7280";
            }
        }


        // ========================================
        // CLEAR MESSAGE
        // ========================================

        function clearMessage() {

            loginMessage.textContent =
                "";

            loginMessage.style.color =
                "#6b7280";
        }


        // ========================================
        // PASSWORD TOGGLE
        // ========================================

        togglePasswordButton.addEventListener(
            "click",
            function () {

                const isPassword =
                    passwordInput.type ===
                    "password";

                if (isPassword) {

                    passwordInput.type =
                        "text";

                    togglePasswordButton.setAttribute(
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

                    togglePasswordButton.setAttribute(
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


        // ========================================
        // EMAIL VALIDATION
        // ========================================

        function isValidEmail(email) {

            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(email);
        }


        // ========================================
        // FORGOT PASSWORD BUTTON
        // ========================================

        function updateForgotPasswordButton() {

            const email =
                emailInput.value.trim();

            forgotPasswordButton.disabled =
                !isValidEmail(email);
        }


        emailInput.addEventListener(
            "input",
            function () {

                clearMessage();

                updateForgotPasswordButton();
            }
        );


        updateForgotPasswordButton();


        // ========================================
        // FORGOT PASSWORD
        // ========================================

        forgotPasswordButton.addEventListener(
            "click",
            function () {

                const email =
                    emailInput.value
                        .trim()
                        .toLowerCase();

                if (!isValidEmail(email)) {

                    showMessage(
                        "Please enter a valid email address first.",
                        "error"
                    );

                    emailInput.focus();

                    return;
                }


                const encodedEmail =
                    encodeURIComponent(
                        email
                    );


                // Shared forgot password page

                window.location.href =
                    `./forgot-password.html?role=${userRole}&email=${encodedEmail}`;
            }
        );


        // ========================================
        // LOGIN
        // ========================================

        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                clearMessage();


                const email =
                    emailInput.value
                        .trim()
                        .toLowerCase();

                const password =
                    passwordInput.value;


                // ========================================
                // VALIDATE EMAIL
                // ========================================

                if (!email) {

                    showMessage(
                        "Please enter your email address.",
                        "error"
                    );

                    emailInput.focus();

                    return;
                }


                if (!isValidEmail(email)) {

                    showMessage(
                        "Please enter a valid email address.",
                        "error"
                    );

                    emailInput.focus();

                    return;
                }


                // ========================================
                // VALIDATE PASSWORD
                // ========================================

                if (!password) {

                    showMessage(
                        "Please enter your password.",
                        "error"
                    );

                    passwordInput.focus();

                    return;
                }


                // ========================================
                // DISABLE LOGIN BUTTON
                // ========================================

                loginButton.disabled =
                    true;

                loginButton.textContent =
                    "Signing in...";


                try {

                    // ========================================
                    // SELECT LOGIN API
                    // ========================================

                    const endpoint =
                        userRole === "admin"
                            ? "/api/auth/admin-login"
                            : "/api/auth/employee-login";


                    // ========================================
                    // LOGIN REQUEST
                    // ========================================

                    const response =
                        await fetch(
                            endpoint,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                credentials:
                                    "include",

                                body:
                                    JSON.stringify({
                                        email:
                                            email,

                                        password:
                                            password
                                    })
                            }
                        );


                    const data =
                        await response.json();


                    // ========================================
                    // LOGIN ERROR
                    // ========================================

                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        showMessage(
                            data.message ||
                                "Login failed. Please check your email and password.",
                            "error"
                        );

                        return;
                    }


                    // ========================================
                    // VERIFY ROLE
                    // ========================================

                    if (
                        !data.user ||
                        data.user.role !==
                            userRole
                    ) {

                        showMessage(
                            "This account does not have permission to access this login page.",
                            "error"
                        );


                        // Clean up incorrect session

                        try {

                            await fetch(
                                "/api/auth/logout",
                                {
                                    method:
                                        "POST",

                                    credentials:
                                        "include"
                                }
                            );

                        } catch (
                            logoutError
                        ) {

                            console.error(
                                "Logout cleanup error:",
                                logoutError
                            );
                        }

                        return;
                    }


                    // ========================================
                    // LOGIN SUCCESS
                    // ========================================

                    showMessage(
                        "Login successful. Redirecting...",
                        "success"
                    );


                    // ========================================
                    // REDIRECT TO DASHBOARD
                    // ========================================

                    if (
                        userRole ===
                        "admin"
                    ) {

                        window.location.href =
                            "../admin/dashboard.html";

                    } else {

                        window.location.href =
                            "../employee/dashboard.html";
                    }

                } catch (error) {

                    console.error(
                        "Login error:",
                        error
                    );

                    showMessage(
                        "Unable to connect to the server. Please try again.",
                        "error"
                    );

                } finally {

                    loginButton.disabled =
                        false;

                    loginButton.textContent =
                        "Login";
                }
            }
        );


        // ========================================
        // BACK BUTTON
        // ========================================

        backButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "../index.html";
            }
        );

    }
);