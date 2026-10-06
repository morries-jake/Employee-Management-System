// ========================================
// EMPLOYEE PROFILE
// ========================================


// ----------------------------------------
// ELEMENTS
// ----------------------------------------

const profileForm =
    document.getElementById("profileForm");

const passwordForm =
    document.getElementById("passwordForm");

const fullNameInput =
    document.getElementById("fullName");

const emailInput =
    document.getElementById("email");

const profileImage =
    document.getElementById("profileImage");

const profileImageInput =
    document.getElementById("profileImageInput");

const changePhotoButton =
    document.getElementById("changePhotoButton");

const removePhotoButton =
    document.getElementById("removePhotoButton");

const currentPasswordInput =
    document.getElementById("currentPassword");

const newPasswordInput =
    document.getElementById("newPassword");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const profileMessage =
    document.getElementById("profileMessage");

const recoveryStatus =
    document.getElementById("recoveryStatus");

const twoFactorStatus =
    document.getElementById("twoFactorStatus");

const twoFactorToggle =
    document.getElementById("twoFactorToggle");


// ----------------------------------------
// SHOW MESSAGE
// ----------------------------------------

function showMessage(message, type = "success") {

    if (!profileMessage) {
        return;
    }

    profileMessage.textContent =
        message;

    profileMessage.className =
        "profile-message";

    if (type === "success") {

        profileMessage.classList.add(
            "success"
        );

    } else if (type === "error") {

        profileMessage.classList.add(
            "error"
        );

    } else if (type === "info") {

        profileMessage.classList.add(
            "info"
        );

    }

    profileMessage.style.display =
        "block";


    setTimeout(() => {

        profileMessage.style.display =
            "none";

    }, 5000);
}


// ----------------------------------------
// GET INITIALS
// ----------------------------------------

function getInitials(fullName) {

    const name =
        (fullName || "").trim();


    if (name) {

        const words =
            name
                .split(/\s+/)
                .filter(Boolean);


        if (words.length >= 2) {

            return (
                words[0].charAt(0) +
                words[words.length - 1].charAt(0)
            ).toUpperCase();

        }


        return words[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return "EM";
}


// ----------------------------------------
// DISPLAY PROFILE IMAGE
// ----------------------------------------

function displayProfileImage(
    imageUrl,
    fullName
) {

    if (!profileImage) {
        return;
    }


    const initials =
        getInitials(fullName);


    // Clear previous image/content

    profileImage.innerHTML =
        "";

    profileImage.classList.remove(
        "has-image"
    );


    // No image

    if (!imageUrl) {

        profileImage.textContent =
            initials;

        return;
    }


    // Create image

    const image =
        document.createElement("img");


    image.src =
        imageUrl;

    image.alt =
        "Profile Photo";


    image.addEventListener(
        "load",
        () => {

            profileImage.classList.add(
                "has-image"
            );

        }
    );


    image.addEventListener(
        "error",
        () => {

            console.error(
                "Unable to load profile image:",
                imageUrl
            );

            profileImage.innerHTML =
                initials;

            profileImage.classList.remove(
                "has-image"
            );

        }
    );


    profileImage.appendChild(
        image
    );
}


// ----------------------------------------
// UPDATE PAGE NAME HOLDER
// ----------------------------------------

function updateNameHolder(fullName) {

    const heading =
        document.querySelector(
            ".profile-page-heading h1"
        );


    if (!heading) {
        return;
    }


    if (
        fullName &&
        fullName.trim() !== ""
    ) {

        heading.textContent =
            fullName;

    } else {

        heading.textContent =
            "Employee Profile";

    }
}


// ----------------------------------------
// UPDATE ROLE BADGE
// ----------------------------------------

function updateRoleBadge(role) {

    const roleBadge =
        document.querySelector(
            ".account-role-badge"
        );


    if (!roleBadge) {
        return;
    }


    if (role === "employee") {

        roleBadge.textContent =
            "Employee";

    } else if (role === "admin") {

        roleBadge.textContent =
            "Administrator";

    } else {

        roleBadge.textContent =
            "Employee";

    }
}


// ----------------------------------------
// LOAD EMPLOYEE PROFILE
// ----------------------------------------

async function loadProfile() {

    try {

        const response =
            await fetch(
                "/api/profile",
                {
                    method: "GET",
                    credentials: "include"
                }
            );


        const data =
            await response.json();


        // Session expired

        if (response.status === 401) {

            window.location.href =
                "login.html";

            return;
        }


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load profile."
            );

        }


        const user =
            data.user;


        if (!user) {

            throw new Error(
                "Profile information was not returned."
            );

        }


        // --------------------------------
        // SECURITY CHECK
        // --------------------------------

        if (user.role !== "employee") {

            if (user.role === "admin") {

                window.location.href =
                    "../admin/admin-profile.html";

            } else {

                window.location.href =
                    "login.html";

            }

            return;
        }


        // --------------------------------
        // PROFILE INFORMATION
        // --------------------------------

        if (fullNameInput) {

            fullNameInput.value =
                user.full_name || "";

        }


        if (emailInput) {

            emailInput.value =
                user.email || "";

            // Email is the account login
            // identifier and cannot be changed.

            emailInput.readOnly =
                true;

        }


        // --------------------------------
        // NAME HOLDER
        // --------------------------------

        updateNameHolder(
            user.full_name
        );


        // --------------------------------
        // ROLE BADGE
        // --------------------------------

        updateRoleBadge(
            user.role
        );


        // --------------------------------
        // PROFILE PHOTO
        // --------------------------------

        displayProfileImage(
            user.profile_image,
            user.full_name
        );


    } catch (error) {

        console.error(
            "Error loading employee profile:",
            error
        );


        showMessage(
            error.message ||
            "Unable to load your profile.",
            "error"
        );

    }

}


// ----------------------------------------
// SAVE PROFILE INFORMATION
// ----------------------------------------

if (profileForm) {

    profileForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const fullName =
                fullNameInput.value.trim();


            // --------------------------------
            // CLIENT VALIDATION
            // --------------------------------

            if (!fullName) {

                showMessage(
                    "Please enter your full name.",
                    "error"
                );

                fullNameInput.focus();

                return;
            }


            if (fullName.length < 2) {

                showMessage(
                    "Full name must be at least 2 characters.",
                    "error"
                );

                fullNameInput.focus();

                return;
            }


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

                            credentials: "include",

                            body: JSON.stringify({

                                full_name:
                                    fullName

                            })
                        }
                    );


                const data =
                    await response.json();


                // Session expired

                if (response.status === 401) {

                    window.location.href =
                        "login.html";

                    return;
                }


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to update profile."
                    );

                }


                // --------------------------------
                // UPDATE PROFILE DATA
                // --------------------------------

                if (data.user) {

                    if (fullNameInput) {

                        fullNameInput.value =
                            data.user.full_name || "";

                    }


                    if (emailInput) {

                        emailInput.value =
                            data.user.email || "";

                    }


                    updateNameHolder(
                        data.user.full_name
                    );


                    updateRoleBadge(
                        data.user.role
                    );


                    displayProfileImage(
                        data.user.profile_image,
                        data.user.full_name
                    );

                } else {

                    updateNameHolder(
                        fullName
                    );

                }


                showMessage(
                    "Profile updated successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Profile update error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to update your profile.",
                    "error"
                );

            }

        }
    );

}


// ----------------------------------------
// CHANGE PHOTO BUTTON
// ----------------------------------------

if (
    changePhotoButton &&
    profileImageInput
) {

    changePhotoButton.addEventListener(
        "click",
        function () {

            profileImageInput.click();

        }
    );

}


// ----------------------------------------
// PROFILE IMAGE UPLOAD
// ----------------------------------------

if (profileImageInput) {

    profileImageInput.addEventListener(
        "change",
        async function () {

            const file =
                profileImageInput.files[0];


            if (!file) {
                return;
            }


            // --------------------------------
            // VALIDATE FILE TYPE
            // --------------------------------

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


            // --------------------------------
            // VALIDATE FILE SIZE
            // --------------------------------

            const maxSize =
                5 * 1024 * 1024;


            if (file.size > maxSize) {

                showMessage(
                    "Profile photo must be 5 MB or smaller.",
                    "error"
                );


                profileImageInput.value =
                    "";

                return;
            }


            try {

                const formData =
                    new FormData();


                // IMPORTANT:
                // This must match the backend.
                // The admin profile uses
                // "profile_image".

                formData.append(
                    "profile_image",
                    file
                );


                const response =
                    await fetch(
                        "/api/profile/image",
                        {
                            method: "POST",
                            credentials: "include",
                            body: formData
                        }
                    );


                const data =
                    await response.json();


                // Session expired

                if (response.status === 401) {

                    window.location.href =
                        "login.html";

                    return;
                }


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to upload profile photo."
                    );

                }


                // --------------------------------
                // DISPLAY UPLOADED IMAGE
                // --------------------------------

                displayProfileImage(
                    data.profile_image,
                    fullNameInput.value
                );


                showMessage(
                    "Profile photo updated successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Profile image upload error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to upload profile photo.",
                    "error"
                );


            } finally {

                profileImageInput.value =
                    "";

            }

        }
    );

}


// ----------------------------------------
// REMOVE PROFILE PHOTO
// ----------------------------------------

if (removePhotoButton) {

    removePhotoButton.addEventListener(
        "click",
        async function () {

            const confirmed =
                confirm(
                    "Are you sure you want to remove your profile photo?"
                );


            if (!confirmed) {
                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/profile/image",
                        {
                            method: "DELETE",
                            credentials: "include"
                        }
                    );


                const data =
                    await response.json();


                // Session expired

                if (response.status === 401) {

                    window.location.href =
                        "login.html";

                    return;
                }


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to remove profile photo."
                    );

                }


                // Return to initials

                displayProfileImage(
                    null,
                    fullNameInput.value
                );


                showMessage(
                    "Profile photo removed successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Remove profile image error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to remove profile photo.",
                    "error"
                );

            }

        }
    );

}


// ----------------------------------------
// CHANGE PASSWORD
// ----------------------------------------

if (passwordForm) {

    passwordForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const currentPassword =
                currentPasswordInput.value;

            const newPassword =
                newPasswordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;


            // --------------------------------
            // VALIDATION
            // --------------------------------

            if (!currentPassword) {

                showMessage(
                    "Please enter your current password.",
                    "error"
                );

                currentPasswordInput.focus();

                return;
            }


            if (!newPassword) {

                showMessage(
                    "Please enter a new password.",
                    "error"
                );

                newPasswordInput.focus();

                return;
            }


            if (newPassword.length < 8) {

                showMessage(
                    "New password must be at least 8 characters.",
                    "error"
                );

                newPasswordInput.focus();

                return;
            }


            if (!confirmPassword) {

                showMessage(
                    "Please confirm your new password.",
                    "error"
                );

                confirmPasswordInput.focus();

                return;
            }


            if (
                newPassword !==
                confirmPassword
            ) {

                showMessage(
                    "New password and confirmation do not match.",
                    "error"
                );

                confirmPasswordInput.focus();

                return;
            }


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

                            credentials: "include",

                            body: JSON.stringify({

                                current_password:
                                    currentPassword,

                                new_password:
                                    newPassword

                            })
                        }
                    );


                const data =
                    await response.json();


                // Session expired

                if (response.status === 401) {

                    window.location.href =
                        "login.html";

                    return;
                }


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to change password."
                    );

                }


                // Clear password fields

                currentPasswordInput.value =
                    "";

                newPasswordInput.value =
                    "";

                confirmPasswordInput.value =
                    "";


                showMessage(
                    "Password updated successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Password update error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to change password.",
                    "error"
                );

            }

        }
    );

}


// ----------------------------------------
// RECOVERY EMAIL
// ----------------------------------------
//
// The backend for recovery email is not
// implemented yet.
// ----------------------------------------

const connectRecoveryEmailButton =
    document.getElementById(
        "connectRecoveryEmailButton"
    );


const recoveryEmailInput =
    document.getElementById(
        "recoveryEmail"
    );


if (connectRecoveryEmailButton) {

    connectRecoveryEmailButton.addEventListener(
        "click",
        function () {

            const recoveryEmail =
                recoveryEmailInput
                    ? recoveryEmailInput.value.trim()
                    : "";


            if (!recoveryEmail) {

                showMessage(
                    "Please enter a recovery email address.",
                    "error"
                );


                if (recoveryEmailInput) {

                    recoveryEmailInput.focus();

                }

                return;
            }


            showMessage(
                "Recovery email verification will be available after the recovery email feature is connected to the backend.",
                "info"
            );

        }
    );

}


// ----------------------------------------
// TWO-FACTOR AUTHENTICATION
// ----------------------------------------
//
// The backend for 2FA is not implemented yet.
// ----------------------------------------

if (twoFactorToggle) {

    twoFactorToggle.addEventListener(
        "change",
        function () {

            // Reset toggle

            twoFactorToggle.checked =
                false;


            if (twoFactorStatus) {

                twoFactorStatus.textContent =
                    "Disabled";


                twoFactorStatus.classList.remove(
                    "enabled"
                );


                twoFactorStatus.classList.add(
                    "disabled"
                );

            }


            showMessage(
                "Two-factor authentication will be available after the 2FA backend is implemented.",
                "info"
            );

        }
    );

}


// ----------------------------------------
// INITIALIZE
// ----------------------------------------

loadProfile();