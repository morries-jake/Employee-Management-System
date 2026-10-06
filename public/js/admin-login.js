// ========================================
// ADMIN LOGIN
// ========================================


// ========================================
// GET ELEMENTS
// ========================================

const loginForm =
    document.getElementById(
        "adminLoginForm"
    );

const loginMessage =
    document.getElementById(
        "loginMessage"
    );

const backButton =
    document.getElementById(
        "backButton"
    );


// ========================================
// LOGIN FORM SUBMISSION
// ========================================

loginForm.addEventListener(
    "submit",
    async function (event) {

        // Prevent the browser
        // from refreshing the page.
        event.preventDefault();


        // ========================================
        // GET FORM VALUES
        // ========================================

        const email =
            document
                .getElementById("email")
                .value
                .trim();

        const password =
            document
                .getElementById("password")
                .value;


        // ========================================
        // SHOW LOGIN MESSAGE
        // ========================================

        loginMessage.textContent =
            "Logging in...";


        try {

            // ========================================
            // SEND LOGIN REQUEST
            // ========================================

            const response =
                await fetch(
                    "/api/auth/admin-login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );


            // ========================================
            // READ SERVER RESPONSE
            // ========================================

            const data =
                await response.json();


            // ========================================
            // HANDLE LOGIN ERROR
            // ========================================

            if (!response.ok) {

                loginMessage.textContent =
                    data.message ||
                    "Login failed.";

                return;
            }


            // ========================================
            // VERIFY USER ROLE
            // ========================================

            if (
                !data.user ||
                data.user.role !== "admin"
            ) {

                loginMessage.textContent =
                    "Invalid administrator account.";

                return;
            }


            // ========================================
            // LOGIN SUCCESS
            // ========================================

            loginMessage.textContent =
                "Login successful. Redirecting...";


            window.location.href =
                "/admin/dashboard.html";


        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );


            loginMessage.textContent =
                "Unable to connect to the server.";
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
            "/index.html";

    }
);