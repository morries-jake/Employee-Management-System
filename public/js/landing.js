// ========================================
// LANDING PAGE
// ========================================


// ========================================
// ELEMENTS
// ========================================

const loginButton =
    document.getElementById(
        "loginButton"
    );


const loginModal =
    document.getElementById(
        "loginModal"
    );


const employeeLoginButton =
    document.getElementById(
        "employeeLoginButton"
    );


const adminLoginButton =
    document.getElementById(
        "adminLoginButton"
    );


const closeLoginModal =
    document.getElementById(
        "closeLoginModal"
    );


// ========================================
// OPEN LOGIN MODAL
// ========================================

loginButton.addEventListener(
    "click",
    function () {

        loginModal.hidden = false;

    }
);


// ========================================
// EMPLOYEE LOGIN
// ========================================

employeeLoginButton.addEventListener(
    "click",
    function () {

        window.location.href =
            "/employee/login.html";

    }
);


// ========================================
// ADMIN LOGIN
// ========================================

adminLoginButton.addEventListener(
    "click",
    function () {

        window.location.href =
            "/admin/login.html";

    }
);


// ========================================
// CLOSE LOGIN MODAL
// ========================================

closeLoginModal.addEventListener(
    "click",
    function () {

        loginModal.hidden = true;

    }
);


// ========================================
// CLICK OUTSIDE MODAL
// ========================================

loginModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target === loginModal
        ) {

            loginModal.hidden = true;

        }

    }
);


// ========================================
// ESCAPE KEY
// ========================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            !loginModal.hidden
        ) {

            loginModal.hidden = true;

        }

    }
);