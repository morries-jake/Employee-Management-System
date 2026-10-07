// =========================================
// REUSABLE PROFILE PAGE
// Employee Task Management System
// Works for BOTH Admin and Employee
// =========================================


// =========================================
// GLOBAL VARIABLES
// =========================================

let currentUser = null;
let recoveryEmail = null;
let recoveryResendTimer = null;


// =========================================
// DOM ELEMENTS
// =========================================

const profilePageTitle =
    document.getElementById("profilePageTitle");

const profilePageDescription =
    document.getElementById("profilePageDescription");

const profileBrandSubtitle =
    document.getElementById("profileBrandSubtitle");

const backToDashboardButton =
    document.getElementById("backToDashboardButton");

const profileImage =
    document.getElementById("profileImage");

const accountRoleBadge =
    document.getElementById("accountRoleBadge");

const profileForm =
    document.getElementById("profileForm");

const fullNameInput =
    document.getElementById("fullName");

const fullNameHelp =
    document.getElementById("fullNameHelp");

const profileEmailInput =
    document.getElementById("profileEmail");

const saveProfileButton =
    document.getElementById("saveProfileButton");

const profileImageInput =
    document.getElementById("profileImageInput");

const changePhotoButton =
    document.getElementById("changePhotoButton");

const removePhotoButton =
    document.getElementById("removePhotoButton");

const passwordForm =
    document.getElementById("passwordForm");

const currentPasswordInput =
    document.getElementById("currentPassword");

const newPasswordInput =
    document.getElementById("newPassword");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const toggleCurrentPassword =
    document.getElementById("toggleCurrentPassword");

const toggleNewPassword =
    document.getElementById("toggleNewPassword");

const toggleConfirmPassword =
    document.getElementById("toggleConfirmPassword");

const recoveryStatus =
    document.getElementById("recoveryStatus");

const recoveryEmailFormSection =
    document.getElementById(
        "recoveryEmailFormSection"
    );

const recoveryEmailForm =
    document.getElementById("recoveryEmailForm");

const recoveryEmailInput =
    document.getElementById("recoveryEmail");

const connectRecoveryEmailButton =
    document.getElementById(
        "connectRecoveryEmailButton"
    );

const recoveryVerificationSection =
    document.getElementById(
        "recoveryVerificationSection"
    );

const recoveryVerificationMessage =
    document.getElementById(
        "recoveryVerificationMessage"
    );

const recoveryVerificationCode =
    document.getElementById(
        "recoveryVerificationCode"
    );

const verifyRecoveryEmailButton =
    document.getElementById(
        "verifyRecoveryEmailButton"
    );

const resendRecoveryEmailButton =
    document.getElementById(
        "resendRecoveryEmailButton"
    );

const cancelRecoveryVerificationButton =
    document.getElementById(
        "cancelRecoveryVerificationButton"
    );

const recoveryResendMessage =
    document.getElementById(
        "recoveryResendMessage"
    );

const recoveryConnectedSection =
    document.getElementById(
        "recoveryConnectedSection"
    );

const connectedRecoveryEmail =
    document.getElementById(
        "connectedRecoveryEmail"
    );

const changeRecoveryEmailButton =
    document.getElementById(
        "changeRecoveryEmailButton"
    );

const disconnectRecoveryEmailButton =
    document.getElementById(
        "disconnectRecoveryEmailButton"
    );

const twoFactorStatus =
    document.getElementById("twoFactorStatus");

const twoFactorToggle =
    document.getElementById("twoFactorToggle");

const profileMessage =
    document.getElementById("profileMessage");


// =========================================
// PAGE INITIALIZATION
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupPasswordToggles();

        setupProfileEvents();

        setupRecoveryEvents();

        setupTwoFactor();

        loadProfile();

        loadRecoveryEmailStatus();

    }
);


// =========================================
// LOAD PROFILE
// =========================================

async function loadProfile() {

    try {

        const response =
            await fetch(
                "/api/profile",
                {
                    method: "GET",
                    credentials: "same-origin"
                }
            );

        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            if (response.status === 401) {

                window.location.href =
                    "../index.html";

                return;
            }

            showMessage(
                data.message ||
                    "Unable to load your profile.",
                "error"
            );

            return;
        }


        currentUser =
            data.user;

        displayUserProfile(
            currentUser
        );

    } catch (error) {

        console.error(
            "Load profile error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );
    }
}


// =========================================
// DISPLAY USER PROFILE
// =========================================

function displayUserProfile(user) {

    if (!user) {
        return;
    }


    // -----------------------------------------
    // ROLE
    // -----------------------------------------

    const isAdmin =
        user.role === "admin";


    // -----------------------------------------
    // PAGE TEXT
    // -----------------------------------------

    if (isAdmin) {

        document.title =
            "Administrator Profile - ETM";

        if (profilePageTitle) {

            profilePageTitle.textContent =
                "Administrator Profile";
        }

        if (profilePageDescription) {

            profilePageDescription.textContent =
                "Manage your administrator profile, account information, and security.";
        }

        if (profileBrandSubtitle) {

            profileBrandSubtitle.textContent =
                "Administrator Profile";
        }

    } else {

        document.title =
            "Employee Profile - ETM";

        if (profilePageTitle) {

            profilePageTitle.textContent =
                "Employee Profile";
        }

        if (profilePageDescription) {

            profilePageDescription.textContent =
                "Manage your profile information and account security.";
        }

        if (profileBrandSubtitle) {

            profileBrandSubtitle.textContent =
                "Employee Profile";
        }
    }


    // -----------------------------------------
    // ROLE BADGE
    // -----------------------------------------

    if (accountRoleBadge) {

        accountRoleBadge.textContent =
            isAdmin
                ? "Administrator"
                : "Employee";
    }


    // -----------------------------------------
    // FULL NAME
    // -----------------------------------------

    if (fullNameInput) {

        fullNameInput.value =
            user.full_name || "";
    }


    // -----------------------------------------
    // EMAIL
    // -----------------------------------------

    if (profileEmailInput) {

        profileEmailInput.value =
            user.email || "";
    }


    // -----------------------------------------
    // PROFILE IMAGE
    // -----------------------------------------

    displayProfileImage(user);


    // -----------------------------------------
    // NAME CHANGE STATUS
    // -----------------------------------------

    updateNameChangeState(user);
}


// =========================================
// PROFILE IMAGE DISPLAY
// =========================================

function displayProfileImage(user) {

    if (!profileImage) {
        return;
    }


    profileImage.innerHTML = "";


    if (user.profile_image) {

        const image =
            document.createElement("img");

        image.src =
            user.profile_image;

        image.alt =
            "Profile photo";

        image.onerror =
            function () {

                displayInitials(user);

            };

        profileImage.appendChild(
            image
        );

    } else {

        displayInitials(user);
    }
}


// =========================================
// DISPLAY INITIALS
// =========================================

function displayInitials(user) {

    if (!profileImage) {
        return;
    }


    const initials =
        getInitials(
            user.full_name
        );

    profileImage.textContent =
        initials;
}


// =========================================
// GET INITIALS
// =========================================

function getInitials(fullName) {

    if (!fullName) {
        return "U";
    }


    const nameParts =
        fullName
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (nameParts.length === 1) {

        return nameParts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        nameParts[0][0] +
        nameParts[nameParts.length - 1][0]
    ).toUpperCase();
}


// =========================================
// NAME CHANGE RULE
// =========================================

function updateNameChangeState(user) {

    if (
        !fullNameInput ||
        !saveProfileButton
    ) {

        return;
    }


    // -----------------------------------------
    // BACKEND SAYS NAME CAN BE CHANGED
    // -----------------------------------------

    if (
        user.can_change_name === true
    ) {

        fullNameInput.disabled =
            false;

        saveProfileButton.disabled =
            false;

        if (fullNameHelp) {

            fullNameHelp.textContent =
                "You can change your name now.";
        }

        return;
    }


    // -----------------------------------------
    // BACKEND SAYS NAME IS LOCKED
    // -----------------------------------------

    if (
        user.can_change_name === false
    ) {

        fullNameInput.disabled =
            true;

        saveProfileButton.disabled =
            true;

        if (fullNameHelp) {

            if (
                user.next_full_name_change_at
            ) {

                const date =
                    formatDate(
                        user.next_full_name_change_at
                    );

                fullNameHelp.textContent =
                    `Your name can next be changed on ${date}.`;

            } else {

                fullNameHelp.textContent =
                    "Your name cannot currently be changed.";
            }
        }

        return;
    }


    // -----------------------------------------
    // BACKEND HAS NOT PROVIDED THE STATE
    // -----------------------------------------

    fullNameInput.disabled =
        false;

    saveProfileButton.disabled =
        false;

    if (fullNameHelp) {

        fullNameHelp.textContent =
            "You can change your name once every 365 days.";
    }
}


// =========================================
// PROFILE EVENTS
// =========================================

function setupProfileEvents() {

    // -----------------------------------------
    // PROFILE FORM
    // -----------------------------------------

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            handleProfileSubmit
        );
    }


    // -----------------------------------------
    // CHANGE PHOTO
    // -----------------------------------------

    if (changePhotoButton) {

        changePhotoButton.addEventListener(
            "click",
            function () {

                if (profileImageInput) {

                    profileImageInput.click();
                }
            }
        );
    }


    // -----------------------------------------
    // FILE SELECTED
    // -----------------------------------------

    if (profileImageInput) {

        profileImageInput.addEventListener(
            "change",
            handleProfileImageUpload
        );
    }


    // -----------------------------------------
    // REMOVE PHOTO
    // -----------------------------------------

    if (removePhotoButton) {

        removePhotoButton.addEventListener(
            "click",
            handleRemoveProfileImage
        );
    }


    // -----------------------------------------
    // BACK TO DASHBOARD
    // -----------------------------------------

    if (backToDashboardButton) {

        backToDashboardButton.addEventListener(
            "click",
            handleBackToDashboard
        );
    }
}


// =========================================
// SAVE PROFILE
// =========================================

async function handleProfileSubmit(event) {

    event.preventDefault();


    if (!currentUser) {
        return;
    }


    const fullName =
        fullNameInput.value.trim();


    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (fullName.length < 2) {

        showMessage(
            "Please enter your full name.",
            "error"
        );

        return;
    }


    if (fullName.length > 100) {

        showMessage(
            "Your name must be 100 characters or less.",
            "error"
        );

        return;
    }


    // -----------------------------------------
    // NO CHANGE
    // -----------------------------------------

    if (
        fullName ===
        (currentUser.full_name || "")
            .trim()
    ) {

        showMessage(
            "There are no profile changes to save.",
            "info"
        );

        return;
    }


    setButtonLoading(
        saveProfileButton,
        true,
        "Saving..."
    );


    try {

        const response =
            await fetch(
                "/api/profile",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials:
                        "same-origin",

                    body:
                        JSON.stringify({
                            full_name:
                                fullName
                        })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            if (
                data.can_change_at &&
                fullNameHelp
            ) {

                fullNameHelp.textContent =
                    `Your name can next be changed on ${formatDate(data.can_change_at)}.`;
            }

            showMessage(
                data.message ||
                    "Unable to update your profile.",
                "error"
            );

            return;
        }


        // -------------------------------------
        // UPDATE LOCAL PROFILE
        // -------------------------------------

        if (data.user) {

            currentUser = {
                ...currentUser,
                ...data.user
            };

        } else {

            currentUser.full_name =
                fullName;
        }


        fullNameInput.value =
            currentUser.full_name;


        updateNameChangeState(
            currentUser
        );


        showMessage(
            "Your profile has been updated successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Update profile error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );

    } finally {

        setButtonLoading(
            saveProfileButton,
            false,
            "Save Changes"
        );
    }
}


// =========================================
// PROFILE IMAGE UPLOAD
// =========================================

async function handleProfileImageUpload(
    event
) {

    const file =
        event.target.files[0];


    if (!file) {
        return;
    }


    // -----------------------------------------
    // FILE TYPE
    // -----------------------------------------

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (
        !allowedTypes.includes(
            file.type
        )
    ) {

        showMessage(
            "Please select a JPG, PNG, or WebP image.",
            "error"
        );

        profileImageInput.value =
            "";

        return;
    }


    // -----------------------------------------
    // FILE SIZE
    // -----------------------------------------

    const maxFileSize =
        5 * 1024 * 1024;


    if (
        file.size >
        maxFileSize
    ) {

        showMessage(
            "The profile image must be 5 MB or smaller.",
            "error"
        );

        profileImageInput.value =
            "";

        return;
    }


    setButtonLoading(
        changePhotoButton,
        true,
        "Uploading..."
    );


    try {

        const formData =
            new FormData();


        formData.append(
            "profile_image",
            file
        );


        const response =
            await fetch(
                "/api/profile/image",
                {
                    method: "POST",

                    credentials:
                        "same-origin",

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            showMessage(
                data.message ||
                    "Unable to upload your profile photo.",
                "error"
            );

            return;
        }


        // -------------------------------------
        // UPDATE PROFILE IMAGE
        // -------------------------------------

        if (
            data.profile_image
        ) {

            currentUser.profile_image =
                data.profile_image;
        }


        if (
            data.user &&
            data.user.profile_image
        ) {

            currentUser.profile_image =
                data.user.profile_image;
        }


        displayProfileImage(
            currentUser
        );


        showMessage(
            "Your profile photo has been updated.",
            "success"
        );

    } catch (error) {

        console.error(
            "Profile image upload error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );

    } finally {

        profileImageInput.value =
            "";

        setButtonLoading(
            changePhotoButton,
            false,
            "Change Photo"
        );
    }
}


// =========================================
// REMOVE PROFILE IMAGE
// =========================================

async function handleRemoveProfileImage() {

    if (!currentUser) {
        return;
    }


    if (
        !currentUser.profile_image
    ) {

        showMessage(
            "You do not have a profile photo.",
            "info"
        );

        return;
    }


    const confirmed =
        window.confirm(
            "Are you sure you want to remove your profile photo?"
        );


    if (!confirmed) {
        return;
    }


    setButtonLoading(
        removePhotoButton,
        true,
        "Removing..."
    );


    try {

        const response =
            await fetch(
                "/api/profile/image",
                {
                    method: "DELETE",

                    credentials:
                        "same-origin"
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            showMessage(
                data.message ||
                    "Unable to remove your profile photo.",
                "error"
            );

            return;
        }


        currentUser.profile_image =
            null;


        displayProfileImage(
            currentUser
        );


        showMessage(
            "Your profile photo has been removed.",
            "success"
        );

    } catch (error) {

        console.error(
            "Remove profile image error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );

    } finally {

        setButtonLoading(
            removePhotoButton,
            false,
            "Remove Photo"
        );
    }
}


// =========================================
// PASSWORD TOGGLES
// =========================================

function setupPasswordToggles() {

    setupPasswordToggle(
        currentPasswordInput,
        toggleCurrentPassword
    );

    setupPasswordToggle(
        newPasswordInput,
        toggleNewPassword
    );

    setupPasswordToggle(
        confirmPasswordInput,
        toggleConfirmPassword
    );
}


function setupPasswordToggle(
    passwordInput,
    toggleButton
) {

    if (
        !passwordInput ||
        !toggleButton
    ) {

        return;
    }


    toggleButton.addEventListener(
        "click",
        function () {

            const isPassword =
                passwordInput.type ===
                "password";


            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";


            toggleButton.classList.toggle(
                "password-visible",
                isPassword
            );


            toggleButton.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );
        }
    );
}


// =========================================
// CHANGE PASSWORD
// =========================================

if (passwordForm) {

    passwordForm.addEventListener(
        "submit",
        handlePasswordChange
    );
}


async function handlePasswordChange(
    event
) {

    event.preventDefault();


    const currentPassword =
        currentPasswordInput.value;

    const newPassword =
        newPasswordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;


    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
    ) {

        showMessage(
            "Please complete all password fields.",
            "error"
        );

        return;
    }


    if (
        newPassword !==
        confirmPassword
    ) {

        showMessage(
            "The new passwords do not match.",
            "error"
        );

        return;
    }


    if (
        newPassword.length < 8
    ) {

        showMessage(
            "Your new password must be at least 8 characters long.",
            "error"
        );

        return;
    }


    if (
        newPassword ===
        currentPassword
    ) {

        showMessage(
            "Your new password must be different from your current password.",
            "error"
        );

        return;
    }


    const submitButton =
        passwordForm.querySelector(
            'button[type="submit"]'
        );


    setButtonLoading(
        submitButton,
        true,
        "Changing..."
    );


    try {

        const response =
            await fetch(
                "/api/profile/password",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials:
                        "same-origin",

                    body:
                        JSON.stringify({
                            current_password:
                                currentPassword,

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
                data.message ||
                    "Unable to change your password.",
                "error"
            );

            return;
        }


        passwordForm.reset();


        resetPasswordToggle(
            toggleCurrentPassword,
            currentPasswordInput
        );

        resetPasswordToggle(
            toggleNewPassword,
            newPasswordInput
        );

        resetPasswordToggle(
            toggleConfirmPassword,
            confirmPasswordInput
        );


        showMessage(
            "Your password has been changed successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Change password error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );

    } finally {

        setButtonLoading(
            submitButton,
            false,
            "Change Password"
        );
    }
}


// =========================================
// RESET PASSWORD TOGGLE
// =========================================

function resetPasswordToggle(
    toggleButton,
    passwordInput
) {

    if (
        !toggleButton ||
        !passwordInput
    ) {

        return;
    }


    passwordInput.type =
        "password";


    toggleButton.classList.remove(
        "password-visible"
    );


    toggleButton.setAttribute(
        "aria-label",
        "Show password"
    );
}


// =========================================
// RECOVERY EMAIL EVENTS
// =========================================

function setupRecoveryEvents() {

    // -----------------------------------------
    // CONNECT / ADD RECOVERY EMAIL
    // -----------------------------------------

    if (recoveryEmailForm) {

        recoveryEmailForm.addEventListener(
            "submit",
            handleRecoveryEmailRequest
        );

    } else if (
        connectRecoveryEmailButton
    ) {

        connectRecoveryEmailButton.addEventListener(
            "click",
            handleRecoveryEmailRequest
        );
    }


    // -----------------------------------------
    // VERIFY
    // -----------------------------------------

    if (
        verifyRecoveryEmailButton
    ) {

        verifyRecoveryEmailButton.addEventListener(
            "click",
            handleRecoveryEmailVerification
        );
    }


    // -----------------------------------------
    // RESEND
    // -----------------------------------------

    if (
        resendRecoveryEmailButton
    ) {

        resendRecoveryEmailButton.addEventListener(
            "click",
            handleRecoveryEmailResend
        );
    }


    // -----------------------------------------
    // CANCEL
    // -----------------------------------------

    if (
        cancelRecoveryVerificationButton
    ) {

        cancelRecoveryVerificationButton.addEventListener(
            "click",
            cancelRecoveryVerification
        );
    }


    // -----------------------------------------
    // CHANGE
    // -----------------------------------------

    if (
        changeRecoveryEmailButton
    ) {

        changeRecoveryEmailButton.addEventListener(
            "click",
            showRecoveryEmailForm
        );
    }


    // -----------------------------------------
    // DISCONNECT
    // -----------------------------------------

    if (
        disconnectRecoveryEmailButton
    ) {

        disconnectRecoveryEmailButton.addEventListener(
            "click",
            handleDisconnectRecoveryEmail
        );
    }
}


// =========================================
// LOAD RECOVERY EMAIL STATUS
// =========================================

async function loadRecoveryEmailStatus() {

    if (!recoveryStatus) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/recovery-email/status",
                {
                    method: "GET",

                    credentials:
                        "same-origin"
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            recoveryStatus.textContent =
                data.message ||
                "Unable to check recovery email status.";

            return;
        }


        displayRecoveryEmailStatus(
            data
        );

    } catch (error) {

        console.error(
            "Recovery email status error:",
            error
        );

        recoveryStatus.textContent =
            "Unable to connect to the server.";
    }
}


// =========================================
// DISPLAY RECOVERY EMAIL STATUS
// =========================================

function displayRecoveryEmailStatus(
    data
) {

    /*
        The backend may return slightly
        different property names depending
        on the current implementation.

        Supported forms:

        data.connected
        data.hasRecoveryEmail
        data.recovery_email
        data.email
    */


    const connected =
        data.connected === true ||
        data.hasRecoveryEmail === true ||
        Boolean(
            data.recovery_email ||
            data.email
        );


    if (connected) {

        recoveryEmail =
            data.recovery_email ||
            data.email ||
            "";


        showConnectedRecoveryEmail(
            recoveryEmail
        );

    } else {

        showRecoveryEmailForm();
    }
}


// =========================================
// SHOW RECOVERY EMAIL FORM
// =========================================

function showRecoveryEmailForm() {

    if (
        recoveryEmailFormSection
    ) {

        recoveryEmailFormSection.hidden =
            false;
    }


    if (
        recoveryVerificationSection
    ) {

        recoveryVerificationSection.hidden =
            true;
    }


    if (
        recoveryConnectedSection
    ) {

        recoveryConnectedSection.hidden =
            true;
    }


    if (recoveryStatus) {

        recoveryStatus.textContent =
            "No recovery email is connected to this account.";
    }
}


// =========================================
// REQUEST RECOVERY EMAIL VERIFICATION
// =========================================

async function handleRecoveryEmailRequest(
    event
) {

    if (event) {

        event.preventDefault();
    }


    if (!recoveryEmailInput) {
        return;
    }


    const email =
        recoveryEmailInput.value
            .trim()
            .toLowerCase();


    // -----------------------------------------
    // VALIDATE EMAIL
    // -----------------------------------------

    if (!isValidEmail(email)) {

        showMessage(
            "Please enter a valid recovery email address.",
            "error"
        );

        return;
    }


    setButtonLoading(
        connectRecoveryEmailButton,
        true,
        "Sending..."
    );


    try {

        const response =
            await fetch(
                "/api/recovery-email/request",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials:
                        "same-origin",

                    body:
                        JSON.stringify({
                            recovery_email:
                                email
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
                data.message ||
                    "Unable to send the verification code.",
                "error"
            );

            return;
        }


        recoveryEmail =
            email;


        showRecoveryVerification(
            email
        );


        startRecoveryResendTimer(
            data.cooldown_seconds ||
                60
        );


        showMessage(
            "A verification code has been sent to your recovery email.",
            "success"
        );

    } catch (error) {

        console.error(
            "Recovery email request error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );

    } finally {

        setButtonLoading(
            connectRecoveryEmailButton,
            false,
            "Connect Recovery Email"
        );
    }
}


// =========================================
// SHOW VERIFICATION SECTION
// =========================================

function showRecoveryVerification(
    email
) {

    if (
        recoveryEmailFormSection
    ) {

        recoveryEmailFormSection.hidden =
            true;
    }


    if (
        recoveryVerificationSection
    ) {

        recoveryVerificationSection.hidden =
            false;
    }


    if (
        recoveryConnectedSection
    ) {

        recoveryConnectedSection.hidden =
            true;
    }


    if (
        recoveryVerificationMessage
    ) {

        recoveryVerificationMessage.textContent =
            `We sent a verification code to ${email}.`;
    }


    if (
        recoveryVerificationCode
    ) {

        recoveryVerificationCode.value =
            "";

        recoveryVerificationCode.focus();
    }


    if (recoveryStatus) {

        recoveryStatus.textContent =
            "Verification required.";
    }
}


// =========================================
// VERIFY RECOVERY EMAIL
// =========================================

async function handleRecoveryEmailVerification() {

    if (!recoveryVerificationCode) {
        return;
    }


    const code =
        recoveryVerificationCode.value
            .trim();


    if (
        !/^\d{6}$/.test(code)
    ) {

        showMessage(
            "Please enter the 6-digit verification code.",
            "error"
        );

        return;
    }


    if (!recoveryEmail) {

        showMessage(
            "Recovery email information is missing. Please try again.",
            "error"
        );

        return;
    }


    setButtonLoading(
        verifyRecoveryEmailButton,
        true,
        "Verifying..."
    );


    try {

        const response =
            await fetch(
                "/api/recovery-email/verify",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials:
                        "same-origin",

                    body:
                        JSON.stringify({
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
                data.message ||
                    "Unable to verify the recovery email.",
                "error"
            );

            return;
        }


        clearRecoveryResendTimer();


        showConnectedRecoveryEmail(
            recoveryEmail
        );


        showMessage(
            "Your recovery email has been verified successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Recovery email verification error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );

    } finally {

        setButtonLoading(
            verifyRecoveryEmailButton,
            false,
            "Verify Email"
        );
    }
}


// =========================================
// SHOW CONNECTED RECOVERY EMAIL
// =========================================

function showConnectedRecoveryEmail(
    email
) {

    recoveryEmail =
        email;


    if (
        recoveryEmailFormSection
    ) {

        recoveryEmailFormSection.hidden =
            true;
    }


    if (
        recoveryVerificationSection
    ) {

        recoveryVerificationSection.hidden =
            true;
    }


    if (
        recoveryConnectedSection
    ) {

        recoveryConnectedSection.hidden =
            false;
    }


    if (
        connectedRecoveryEmail
    ) {

        connectedRecoveryEmail.textContent =
            email;
    }


    if (recoveryStatus) {

        recoveryStatus.textContent =
            "Your recovery email is connected and verified.";
    }


    clearRecoveryResendTimer();
}


// =========================================
// RESEND RECOVERY EMAIL
// =========================================

async function handleRecoveryEmailResend() {

    if (!recoveryEmail) {

        showMessage(
            "Recovery email information is missing.",
            "error"
        );

        return;
    }


    setButtonLoading(
        resendRecoveryEmailButton,
        true,
        "Sending..."
    );


    try {

        const response =
            await fetch(
                "/api/recovery-email/request",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials:
                        "same-origin",

                    body:
                        JSON.stringify({
                            recovery_email:
                                recoveryEmail
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
                data.message ||
                    "Unable to resend the verification code.",
                "error"
            );

            return;
        }


        startRecoveryResendTimer(
            data.cooldown_seconds ||
                60
        );


        showMessage(
            "A new verification code has been sent.",
            "success"
        );

    } catch (error) {

        console.error(
            "Recovery email resend error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );

    } finally {

        setButtonLoading(
            resendRecoveryEmailButton,
            false,
            "Resend Code"
        );
    }
}


// =========================================
// RECOVERY RESEND TIMER
// =========================================

function startRecoveryResendTimer(
    seconds
) {

    clearRecoveryResendTimer();


    let remaining =
        Number(seconds) || 60;


    updateRecoveryResendMessage(
        remaining
    );


    if (
        resendRecoveryEmailButton
    ) {

        resendRecoveryEmailButton.disabled =
            true;
    }


    recoveryResendTimer =
        setInterval(
            function () {

                remaining--;


                updateRecoveryResendMessage(
                    remaining
                );


                if (
                    remaining <= 0
                ) {

                    clearRecoveryResendTimer();
                }

            },
            1000
        );
}


// =========================================
// UPDATE RESEND MESSAGE
// =========================================

function updateRecoveryResendMessage(
    seconds
) {

    if (!recoveryResendMessage) {
        return;
    }


    if (seconds > 0) {

        recoveryResendMessage.textContent =
            `You can request another code in ${seconds} second${seconds === 1 ? "" : "s"}.`;

    } else {

        recoveryResendMessage.textContent =
            "You can request a new verification code.";
    }
}


// =========================================
// CLEAR RESEND TIMER
// =========================================

function clearRecoveryResendTimer() {

    if (recoveryResendTimer) {

        clearInterval(
            recoveryResendTimer
        );

        recoveryResendTimer =
            null;
    }


    if (
        resendRecoveryEmailButton
    ) {

        resendRecoveryEmailButton.disabled =
            false;
    }
}


// =========================================
// CANCEL RECOVERY VERIFICATION
// =========================================

function cancelRecoveryVerification() {

    clearRecoveryResendTimer();

    recoveryEmail =
        null;


    if (
        recoveryVerificationCode
    ) {

        recoveryVerificationCode.value =
            "";
    }


    showRecoveryEmailForm();
}


// =========================================
// DISCONNECT RECOVERY EMAIL
// =========================================

async function handleDisconnectRecoveryEmail() {

    const confirmed =
        window.confirm(
            "Are you sure you want to disconnect your recovery email?"
        );


    if (!confirmed) {
        return;
    }


    setButtonLoading(
        disconnectRecoveryEmailButton,
        true,
        "Disconnecting..."
    );


    try {

        const response =
            await fetch(
                "/api/recovery-email",
                {
                    method: "DELETE",

                    credentials:
                        "same-origin"
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            showMessage(
                data.message ||
                    "Unable to disconnect the recovery email.",
                "error"
            );

            return;
        }


        recoveryEmail =
            null;


        showRecoveryEmailForm();


        if (recoveryEmailInput) {

            recoveryEmailInput.value =
                "";
        }


        showMessage(
            "Your recovery email has been disconnected.",
            "success"
        );

    } catch (error) {

        console.error(
            "Disconnect recovery email error:",
            error
        );

        showMessage(
            "Unable to connect to the server.",
            "error"
        );

    } finally {

        setButtonLoading(
            disconnectRecoveryEmailButton,
            false,
            "Disconnect"
        );
    }
}


// =========================================
// TWO-FACTOR AUTHENTICATION
// =========================================

function setupTwoFactor() {

    if (!twoFactorToggle) {
        return;
    }


    twoFactorToggle.addEventListener(
        "change",
        handleTwoFactorToggle
    );
}


function handleTwoFactorToggle() {

    /*
        The complete 2FA backend has not yet
        been connected to this reusable profile
        page.

        Do not pretend that 2FA was enabled.

        When the 2FA backend is implemented,
        this section can call the appropriate
        setup/enable endpoint.
    */


    // Keep the current state disabled for now.

    twoFactorToggle.checked =
        false;


    if (twoFactorStatus) {

        twoFactorStatus.textContent =
            "Not enabled";
    }


    showMessage(
        "Two-factor authentication will be available after the 2FA backend is implemented.",
        "info"
    );
}


// =========================================
// BACK TO DASHBOARD
// =========================================

function handleBackToDashboard() {

    if (!currentUser) {

        window.location.href =
            "../index.html";

        return;
    }


    if (
        currentUser.role === "admin"
    ) {

        window.location.href =
            "../admin/dashboard.html";

    } else {

        window.location.href =
            "../employee/dashboard.html";
    }
}


// =========================================
// EMAIL VALIDATION
// =========================================

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);
}


// =========================================
// FORMAT DATE
// =========================================

function formatDate(dateValue) {

    if (!dateValue) {
        return "";
    }


    const date =
        new Date(dateValue);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(dateValue);
    }


    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );
}


// =========================================
// SHOW MESSAGE
// =========================================

function showMessage(
    message,
    type = "info"
) {

    if (!profileMessage) {
        return;
    }


    profileMessage.textContent =
        message;


    profileMessage.className =
        "profile-message";


    profileMessage.classList.add(
        type
    );


    profileMessage.hidden =
        false;


    // Automatically hide messages
    // after several seconds.

    window.clearTimeout(
        showMessage.timeout
    );


    showMessage.timeout =
        window.setTimeout(
            function () {

                if (profileMessage) {

                    profileMessage.hidden =
                        true;
                }

            },
            6000
        );
}


// =========================================
// BUTTON LOADING STATE
// =========================================

function setButtonLoading(
    button,
    loading,
    loadingText
) {

    if (!button) {
        return;
    }


    if (loading) {

        if (
            !button.dataset.originalText
        ) {

            button.dataset.originalText =
                button.textContent;
        }


        button.disabled =
            true;

        button.textContent =
            loadingText;

    } else {

        button.disabled =
            false;

        button.textContent =
            button.dataset.originalText ||
            button.textContent;

        delete button.dataset.originalText;
    }
}