// ============================================================
// EMPLOYEE DASHBOARD
// ============================================================

// ------------------------------------------------------------
// GLOBAL DATA
// ------------------------------------------------------------

let currentUser = null;
let tasks = [];
let selectedTask = null;


// ------------------------------------------------------------
// DOM ELEMENTS
// ------------------------------------------------------------

const profileName =
    document.querySelector(".profile-name");

const profileRole =
    document.querySelector(".profile-role");

const profileAvatar =
    document.querySelector(".profile-avatar");

const dropdownUser =
    document.querySelector(".dropdown-user");

const logoutButton =
    document.querySelector("#logoutButton");


// ------------------------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------------------------

// Escape HTML to prevent unsafe content from being inserted.
function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// Get initials from a person's full name.
function getInitials(fullName) {

    if (!fullName) {
        return "EM";
    }

    const parts =
        fullName.trim().split(/\s+/);

    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


// Format a date into a readable format.
function formatDate(dateValue) {

    if (!dateValue) {
        return "—";
    }

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


// Format date and time.
// Uses Philippine time so the employee and admin dashboards
// display the same timestamp.
function formatDateTime(dateValue) {

    if (!dateValue) {
        return "—";
    }

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Manila"
        }
    );
}


// Determine whether a task is overdue.
function isTaskOverdue(task) {

    if (!task.deadline) {
        return false;
    }

    if (task.status === "Completed") {
        return false;
    }

    return new Date(task.deadline) < new Date();
}


// Return a CSS-friendly status class.
function getStatusClass(status) {

    if (!status) {
        return "pending";
    }

    return status
        .toLowerCase()
        .replace(/\s+/g, "-");
}


// Return a CSS-friendly priority class.
function getPriorityClass(priority) {

    if (!priority) {
        return "medium";
    }

    return priority
        .toLowerCase()
        .replace(/\s+/g, "-");
}


// Display a temporary message on the dashboard.
function showDashboardMessage(
    message,
    type = "success"
) {

    let messageElement =
        document.querySelector(
            "#dashboardMessage"
        );

    if (!messageElement) {

        messageElement =
            document.createElement("div");

        messageElement.id =
            "dashboardMessage";

        document.body.appendChild(
            messageElement
        );
    }

    messageElement.textContent =
        message;

    messageElement.className =
        `dashboard-message ${type}`;

    setTimeout(() => {

        messageElement.classList.remove(
            "show"
        );

    }, 3500);

    requestAnimationFrame(() => {

        messageElement.classList.add(
            "show"
        );

    });
}


// ------------------------------------------------------------
// SESSION CHECK
// ------------------------------------------------------------

async function checkEmployeeSession() {

    try {

        const response =
            await fetch(
                "/api/auth/me",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success ||
            !data.user
        ) {

            window.location.href =
                "login.html";

            return false;
        }

        currentUser =
            data.user;

        // Employees should not access this page
        // using an admin account.
        if (
            currentUser.role !==
            "employee"
        ) {

            if (
                currentUser.role ===
                "admin"
            ) {

                window.location.href =
                    "../admin/dashboard.html";

            } else {

                window.location.href =
                    "login.html";
            }

            return false;
        }

        updateHeaderProfile(
            currentUser
        );

        return true;

    } catch (error) {

        console.error(
            "Session check error:",
            error
        );

        window.location.href =
            "login.html";

        return false;
    }
}


// ------------------------------------------------------------
// LOAD LATEST PROFILE
// ------------------------------------------------------------

async function loadEmployeeProfile() {

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

        if (!response.ok) {

            if (
                response.status ===
                401
            ) {

                window.location.href =
                    "login.html";

                return false;
            }

            throw new Error(
                data.message ||
                "Failed to load profile."
            );
        }

        if (
            !data.success ||
            !data.user
        ) {

            throw new Error(
                "Profile information was not returned."
            );
        }

        if (
            data.user.role !==
            "employee"
        ) {

            if (
                data.user.role ===
                "admin"
            ) {

                window.location.href =
                    "../admin/dashboard.html";

            } else {

                window.location.href =
                    "login.html";
            }

            return false;
        }

        currentUser =
            data.user;

        updateHeaderProfile(
            currentUser
        );

        return true;

    } catch (error) {

        console.error(
            "Load employee profile error:",
            error
        );

        return false;
    }
}


// ------------------------------------------------------------
// HEADER PROFILE
// ------------------------------------------------------------

function updateHeaderProfile(user) {

    if (!user) {
        return;
    }

    const fullName =
        user.full_name ||
        "Employee";

    const email =
        user.email ||
        "employee@company.com";


    // Header name
    if (profileName) {

        profileName.textContent =
            fullName;
    }


    // Header role
    if (profileRole) {

        profileRole.textContent =
            "Employee";
    }


    // Dropdown name + email
    if (dropdownUser) {

        const nameElement =
            dropdownUser.querySelector(
                "strong"
            );

        const emailElement =
            dropdownUser.querySelector(
                "span"
            );

        if (nameElement) {

            nameElement.textContent =
                fullName;
        }

        if (emailElement) {

            emailElement.textContent =
                email;
        }
    }


    // Profile avatar
    if (profileAvatar) {

        profileAvatar.innerHTML = "";

        if (user.profile_image) {

            const image =
                document.createElement("img");

            image.alt =
                fullName;

            const cacheBuster =
                user.profile_image.includes("?")
                    ? "&t="
                    : "?t=";

            image.src =
                `${user.profile_image}${cacheBuster}${Date.now()}`;

            image.addEventListener(
                "error",
                () => {

                    profileAvatar.innerHTML =
                        "";

                    profileAvatar.textContent =
                        getInitials(fullName);
                }
            );

            profileAvatar.appendChild(
                image
            );

        } else {

            profileAvatar.textContent =
                getInitials(fullName);
        }
    }


    // Welcome message
    const welcomeName =
        document.querySelector(
            "#welcomeName"
        );

    if (welcomeName) {

        welcomeName.textContent =
            fullName;
    }


    const welcomeNames =
        document.querySelectorAll(
            ".welcome-name"
        );

    welcomeNames.forEach(
        element => {

            element.textContent =
                fullName;
        }
    );
}


// ------------------------------------------------------------
// LOAD EMPLOYEE TASKS
// ------------------------------------------------------------

async function loadTasks() {

    try {

        const response =
            await fetch(
                "/api/tasks/my",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            if (
                response.status ===
                401
            ) {

                window.location.href =
                    "login.html";

                return;
            }

            throw new Error(
                data.message ||
                "Failed to load tasks."
            );
        }

        tasks =
            Array.isArray(data.tasks)
                ? data.tasks
                : [];

        updateDashboardStats();

        renderTasks();

        renderUpcomingTasks();

        renderOverdueTasks();

    } catch (error) {

        console.error(
            "Load tasks error:",
            error
        );

        showDashboardMessage(
            "Unable to load your tasks.",
            "error"
        );
    }
}


// ------------------------------------------------------------
// DASHBOARD STATISTICS
// ------------------------------------------------------------

function updateDashboardStats() {

    const totalTasks =
        tasks.length;

    const pendingTasks =
        tasks.filter(
            task =>
                task.status ===
                "Pending"
        ).length;

    const inProgressTasks =
        tasks.filter(
            task =>
                task.status ===
                "In Progress"
        ).length;

    const completedTasks =
        tasks.filter(
            task =>
                task.status ===
                "Completed"
        ).length;

    const overdueTasks =
        tasks.filter(
            task =>
                isTaskOverdue(task)
        ).length;


    updateElementText(
        "#totalTasks",
        totalTasks
    );

    updateElementText(
        "#pendingTasks",
        pendingTasks
    );

    updateElementText(
        "#inProgressTasks",
        inProgressTasks
    );

    updateElementText(
        "#completedTasks",
        completedTasks
    );


    // IMPORTANT:
    // Do NOT update #overdueTasks here.
    // #overdueTasks is the actual overdue task
    // container, not the number element.
    //
    // The actual count is displayed in:
    // #overdueCount

    updateElementText(
        "#totalTaskCount",
        totalTasks
    );

    updateElementText(
        "#pendingTaskCount",
        pendingTasks
    );

    updateElementText(
        "#inProgressTaskCount",
        inProgressTasks
    );

    updateElementText(
        "#completedTaskCount",
        completedTasks
    );

    updateElementText(
        "#overdueTaskCount",
        overdueTasks
    );
}


function updateElementText(
    selector,
    value
) {

    const element =
        document.querySelector(
            selector
        );

    if (element) {

        element.textContent =
            value;
    }
}


// ------------------------------------------------------------
// RENDER TASKS
// ------------------------------------------------------------

// The employee dashboard uses:
//
// <tbody id="taskTableBody">
//
// The previous version of this function was looking for
// #taskList / .task-list / #tasksContainer, which did not exist.
//
// This version renders the tasks directly into the table body.
function renderTasks() {

    const taskTableBody =
        document.querySelector(
            "#taskTableBody"
        );

    if (!taskTableBody) {

        console.warn(
            "Task table body was not found in employee dashboard."
        );

        return;
    }


    // No tasks
    if (tasks.length === 0) {

        taskTableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="task-empty-cell"
                >
                    <div class="empty-state small">

                        <div class="empty-state-icon">
                            ✓
                        </div>

                        <h3>
                            No Tasks Assigned
                        </h3>

                        <p>
                            You currently have no assigned tasks.
                        </p>

                    </div>
                </td>
            </tr>
        `;

        return;
    }


    // Render every task as a table row.
    taskTableBody.innerHTML =
        tasks.map(
            task => {

                const overdue =
                    isTaskOverdue(task);

                const priority =
                    task.priority ||
                    "Medium";

                const status =
                    task.status ||
                    "Pending";

                const statusClass =
                    getStatusClass(
                        status
                    );

                const priorityClass =
                    getPriorityClass(
                        priority
                    );

                const completedAt =
                    task.completed_at ||
                    task.completedAt;


                return `
                    <tr
                        class="${
                            overdue
                                ? "task-row-overdue"
                                : ""
                        }"
                        data-task-id="${task.id}"
                    >

                        <!-- TASK -->

                        <td>

                            <div class="employee-task-title">

                                <strong>
                                    ${escapeHtml(
                                        task.title ||
                                        "Untitled Task"
                                    )}
                                </strong>


                            </div>

                        </td>


                        <!-- PRIORITY -->

                        <td>

                            <span
                                class="priority-badge ${priorityClass}"
                            >
                                ${escapeHtml(
                                    priority
                                )}
                            </span>

                        </td>


                        <!-- DEADLINE -->

                        <td>

                            <div class="task-date-time">

                                <strong
                                    class="${
                                        overdue
                                            ? "overdue-text"
                                            : ""
                                    }"
                                >
                                    ${formatDateTime(
                                        task.deadline
                                    )}
                                </strong>

                                ${
                                    overdue
                                        ? `
                                            <span class="task-overdue-label">
                                                Overdue
                                            </span>
                                        `
                                        : ""
                                }

                            </div>

                        </td>


                        <!-- COMPLETED AT -->

                        <td>

                            <div class="task-date-time">

                                ${
                                    status ===
                                        "Completed" &&
                                    completedAt
                                        ? `
                                            <strong>
                                                ${formatDateTime(
                                                    completedAt
                                                )}
                                            </strong>
                                        `
                                        : `
                                            <span class="not-completed">
                                                —
                                            </span>
                                        `
                                }

                            </div>

                        </td>


                        <!-- STATUS -->

                        <td>

                            <div class="employee-task-status">

                                <span
                                    class="status-badge ${statusClass}"
                                >
                                    ${escapeHtml(
                                        status
                                    )}
                                </span>

                                <div class="employee-task-actions">

                                    <button
                                        type="button"
                                        class="view-task-button"
                                        data-task-id="${task.id}"
                                    >
                                        View
                                    </button>

                                    ${
                                        status !==
                                        "Completed"
                                            ? `
                                                <button
                                                    type="button"
                                                    class="update-status-button"
                                                    data-task-id="${task.id}"
                                                >
                                                    Update
                                                </button>
                                            `
                                            : ""
                                    }

                                </div>

                            </div>

                        </td>

                    </tr>
                `;
            }
        ).join("");


    attachTaskButtons();
}


// ------------------------------------------------------------
// TASK BUTTON EVENTS
// ------------------------------------------------------------

function attachTaskButtons() {

    const viewButtons =
        document.querySelectorAll(
            ".view-task-button"
        );

    viewButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const taskId =
                        Number(
                            button.dataset.taskId
                        );

                    openTaskDetails(
                        taskId
                    );
                }
            );
        }
    );


    const statusButtons =
        document.querySelectorAll(
            ".update-status-button"
        );

    statusButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const taskId =
                        Number(
                            button.dataset.taskId
                        );

                    openStatusModal(
                        taskId
                    );
                }
            );
        }
    );
}


// ------------------------------------------------------------
// UPCOMING TASKS
// ------------------------------------------------------------

function renderUpcomingTasks() {

    const container =
        document.querySelector(
            "#upcomingTasks"
        ) ||
        document.querySelector(
            ".upcoming-tasks"
        );

    if (!container) {
        return;
    }

    const upcomingTasks =
        tasks
            .filter(
                task =>
                    task.status !==
                        "Completed" &&
                    task.deadline &&
                    new Date(task.deadline) >=
                        new Date()
            )
            .sort(
                (a, b) =>
                    new Date(a.deadline) -
                    new Date(b.deadline)
            )
            .slice(0, 5);


    const countElement =
        document.querySelector(
            "#upcomingCount"
        );

    if (countElement) {

        countElement.textContent =
            upcomingTasks.length;
    }


    if (upcomingTasks.length === 0) {

        container.innerHTML = `
            <div class="empty-state small">

                <div class="empty-state-icon">
                    ✓
                </div>

                <h3>
                    No Upcoming Tasks
                </h3>

                <p>
                    You have no upcoming tasks.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        upcomingTasks.map(
            task => {

                const priority =
                    task.priority ||
                    "Medium";

                const priorityClass =
                    getPriorityClass(
                        priority
                    );

                return `
                    <div
                        class="upcoming-task-item"
                        data-task-id="${task.id}"
                    >

                        <div class="upcoming-task-main">

                            <strong>
                                ${escapeHtml(
                                    task.title ||
                                    "Untitled Task"
                                )}
                            </strong>

                            <span>
                                ${formatDateTime(
                                    task.deadline
                                )}
                            </span>

                        </div>

                        <span
                            class="priority-badge ${priorityClass}"
                        >
                            ${escapeHtml(
                                priority
                            )}
                        </span>

                    </div>
                `;
            }
        ).join("");


    container
        .querySelectorAll(
            ".upcoming-task-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const taskId =
                            Number(
                                item.dataset.taskId
                            );

                        openTaskDetails(
                            taskId
                        );
                    }
                );
            }
        );
}


// ------------------------------------------------------------
// OVERDUE TASKS
// ------------------------------------------------------------

function renderOverdueTasks() {

    const container =
        document.querySelector(
            "#overdueTasks"
        ) ||
        document.querySelector(
            ".overdue-tasks"
        );

    if (!container) {
        return;
    }

    const overdueTasks =
        tasks
            .filter(
                task =>
                    isTaskOverdue(task)
            )
            .sort(
                (a, b) =>
                    new Date(a.deadline) -
                    new Date(b.deadline)
            )
            .slice(0, 5);


    const countElement =
        document.querySelector(
            "#overdueCount"
        );

    if (countElement) {

        countElement.textContent =
            overdueTasks.length;
    }


    if (overdueTasks.length === 0) {

        container.innerHTML = `
            <div class="empty-state small">

                <div class="empty-state-icon">
                    ✓
                </div>

                <h3>
                    No Overdue Tasks
                </h3>

                <p>
                    You have no overdue tasks.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        overdueTasks.map(
            task => {

                const priority =
                    task.priority ||
                    "Medium";

                const priorityClass =
                    getPriorityClass(
                        priority
                    );

                return `
                    <div
                        class="overdue-task-item"
                        data-task-id="${task.id}"
                    >

                        <div class="overdue-task-main">

                            <strong>
                                ${escapeHtml(
                                    task.title ||
                                    "Untitled Task"
                                )}
                            </strong>

                            <span class="overdue-text">
                                ${formatDateTime(
                                    task.deadline
                                )}
                            </span>

                        </div>

                        <span
                            class="priority-badge ${priorityClass}"
                        >
                            ${escapeHtml(
                                priority
                            )}
                        </span>

                    </div>
                `;
            }
        ).join("");


    container
        .querySelectorAll(
            ".overdue-task-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const taskId =
                            Number(
                                item.dataset.taskId
                            );

                        openTaskDetails(
                            taskId
                        );
                    }
                );
            }
        );
}


// ------------------------------------------------------------
// TASK DETAILS MODAL
// ------------------------------------------------------------

function openTaskDetails(taskId) {

    const task =
        tasks.find(
            item =>
                Number(item.id) ===
                Number(taskId)
        );

    if (!task) {

        showDashboardMessage(
            "Task could not be found.",
            "error"
        );

        return;
    }

    selectedTask =
        task;


    const modal =
        document.querySelector(
            "#taskDetailsModal"
        );

    if (!modal) {

        console.warn(
            "Task details modal was not found."
        );

        return;
    }


    const titleElement =
        modal.querySelector(
            "#taskDetailsTitle"
        );

    if (titleElement) {

        titleElement.textContent =
            task.title ||
            "Task Details";
    }


    const descriptionElement =
        modal.querySelector(
            "#taskDetailsDescription"
        );

    if (descriptionElement) {

        descriptionElement.textContent =
            task.description ||
            "No description provided.";
    }


    const priorityElement =
        modal.querySelector(
            "#taskDetailsPriority"
        );

    if (priorityElement) {

        priorityElement.textContent =
            task.priority ||
            "Medium";

        priorityElement.className =
            `priority-badge ${
                getPriorityClass(
                    task.priority ||
                    "Medium"
                )
            }`;
    }


    const statusElement =
        modal.querySelector(
            "#taskDetailsStatus"
        );

    if (statusElement) {

        const status =
            task.status ||
            "Pending";

        statusElement.textContent =
            status;

        statusElement.className =
            `status-badge ${
                getStatusClass(
                    status
                )
            }`;
    }


    const createdElement =
        modal.querySelector(
            "#taskDetailsCreated"
        );

    if (createdElement) {

        createdElement.textContent =
            formatDateTime(
                task.created_at
            );
    }


    const deadlineElement =
        modal.querySelector(
            "#taskDetailsDeadline"
        );

    if (deadlineElement) {

        deadlineElement.textContent =
            formatDateTime(
                task.deadline
            );

        if (
            isTaskOverdue(task)
        ) {

            deadlineElement.classList.add(
                "overdue-text"
            );

        } else {

            deadlineElement.classList.remove(
                "overdue-text"
            );
        }
    }


    const completedElement =
        modal.querySelector(
            "#taskDetailsCompleted"
        );

    if (completedElement) {

        const completedAt =
            task.completed_at ||
            task.completedAt;

        completedElement.textContent =
            task.status ===
                "Completed"
                ? formatDateTime(
                    completedAt
                )
                : "—";
    }


    const updatesContainer =
        modal.querySelector(
            "#taskUpdates"
        );

    if (updatesContainer) {

        updatesContainer.innerHTML = `
            <div class="loading-state">
                Loading updates...
            </div>
        `;
    }


    modal.hidden = false;

    document.body.classList.add(
        "modal-open"
    );


    loadTaskUpdates(
        task.id
    );
}


// ------------------------------------------------------------
// CLOSE TASK DETAILS MODAL
// ------------------------------------------------------------

function closeTaskDetails() {

    const modal =
        document.querySelector(
            "#taskDetailsModal"
        );

    if (modal) {

        modal.hidden = true;
    }

    document.body.classList.remove(
        "modal-open"
    );

    selectedTask = null;
}


// ------------------------------------------------------------
// LOAD TASK UPDATES
// ------------------------------------------------------------

async function loadTaskUpdates(taskId) {

    const container =
        document.querySelector(
            "#taskUpdates"
        );

    if (!container) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/tasks/${taskId}/updates`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load task updates."
            );
        }

        const updates =
            Array.isArray(
                data.updates
            )
                ? data.updates
                : [];


        if (updates.length === 0) {

            container.innerHTML = `
                <div class="empty-state small">

                    <div class="empty-state-icon">
                        💬
                    </div>

                    <h3>
                        No Updates Yet
                    </h3>

                    <p>
                        No notes or updates have been added to this task.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            updates.map(
                update => {

                    return `
                        <div class="task-update-item">

                            <div class="task-update-header">

                                <strong>
                                    ${escapeHtml(
                                        update.user_name ||
                                        update.full_name ||
                                        "Employee"
                                    )}
                                </strong>

                                <span>
                                    ${formatDateTime(
                                        update.created_at
                                    )}
                                </span>

                            </div>

                            <p>
                                ${escapeHtml(
                                    update.note ||
                                    update.update_text ||
                                    ""
                                )}
                            </p>

                        </div>
                    `;
                }
            ).join("");

    } catch (error) {

        console.error(
            "Load task updates error:",
            error
        );

        container.innerHTML = `
            <div class="error-state">
                Unable to load task updates.
            </div>
        `;
    }
}


// ------------------------------------------------------------
// STATUS UPDATE MODAL
// ------------------------------------------------------------

function openStatusModal(taskId) {

    const task =
        tasks.find(
            item =>
                Number(item.id) ===
                Number(taskId)
        );

    if (!task) {

        showDashboardMessage(
            "Task could not be found.",
            "error"
        );

        return;
    }

    selectedTask =
        task;


    const modal =
        document.querySelector(
            "#statusUpdateModal"
        );

    if (!modal) {

        console.warn(
            "Status update modal was not found."
        );

        return;
    }


    const titleElement =
        modal.querySelector(
            "#statusUpdateTaskTitle"
        );

    if (titleElement) {

        titleElement.textContent =
            task.title ||
            "Update Task Status";
    }


    const statusSelect =
        modal.querySelector(
            "#statusSelect"
        );

    if (statusSelect) {

        statusSelect.value =
            task.status ||
            "Pending";
    }


    const noteInput =
        modal.querySelector(
            "#statusUpdateNote"
        );

    if (noteInput) {

        noteInput.value = "";
    }


    modal.hidden = false;

    document.body.classList.add(
        "modal-open"
    );
}


// ------------------------------------------------------------
// CLOSE STATUS UPDATE MODAL
// ------------------------------------------------------------

function closeStatusModal() {

    const modal =
        document.querySelector(
            "#statusUpdateModal"
        );

    if (modal) {

        modal.hidden = true;
    }

    document.body.classList.remove(
        "modal-open"
    );

    selectedTask = null;
}


// ------------------------------------------------------------
// UPDATE TASK STATUS
// ------------------------------------------------------------

async function updateTaskStatus() {

    if (!selectedTask) {

        showDashboardMessage(
            "No task selected.",
            "error"
        );

        return;
    }


    const statusSelect =
        document.querySelector(
            "#statusSelect"
        );

    if (!statusSelect) {
        return;
    }


    const newStatus =
        statusSelect.value;


    const allowedStatuses = [
        "Pending",
        "In Progress",
        "Completed"
    ];

    if (
        !allowedStatuses.includes(
            newStatus
        )
    ) {

        showDashboardMessage(
            "Invalid task status.",
            "error"
        );

        return;
    }


    const taskId =
        selectedTask.id;


    try {

        const response =
            await fetch(
                `/api/tasks/${taskId}/status`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        status:
                            newStatus
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to update task status."
            );
        }


        closeStatusModal();

        showDashboardMessage(
            "Task status updated successfully.",
            "success"
        );


        await loadTasks();

    } catch (error) {

        console.error(
            "Update task status error:",
            error
        );

        showDashboardMessage(
            error.message ||
            "Unable to update task status.",
            "error"
        );
    }
}


// ------------------------------------------------------------
// ADD TASK UPDATE / NOTE
// ------------------------------------------------------------

async function addTaskUpdate() {

    if (!selectedTask) {

        showDashboardMessage(
            "No task selected.",
            "error"
        );

        return;
    }


    const noteInput =
        document.querySelector(
            "#taskUpdateInput"
        ) ||
        document.querySelector(
            "#statusUpdateNote"
        );


    if (!noteInput) {
        return;
    }


    const note =
        noteInput.value.trim();


    if (!note) {

        showDashboardMessage(
            "Please enter an update.",
            "error"
        );

        return;
    }


    if (note.length > 2000) {

        showDashboardMessage(
            "Update cannot exceed 2000 characters.",
            "error"
        );

        return;
    }


    const taskId =
        selectedTask.id;


    try {

        const response =
            await fetch(
                `/api/tasks/${taskId}/updates`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        note
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to add task update."
            );
        }


        noteInput.value = "";


        showDashboardMessage(
            "Task update added successfully.",
            "success"
        );


        await loadTaskUpdates(
            taskId
        );

    } catch (error) {

        console.error(
            "Add task update error:",
            error
        );

        showDashboardMessage(
            error.message ||
            "Unable to add task update.",
            "error"
        );
    }
}


// ------------------------------------------------------------
// PROFILE DROPDOWN
// ------------------------------------------------------------

function setupProfileDropdown() {

    const profileButton =
        document.querySelector(
            "#profileButton"
        );

    const profileDropdown =
        document.querySelector(
            "#profileDropdown"
        );

    if (
        !profileButton ||
        !profileDropdown
    ) {
        return;
    }


    profileButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            const isOpen =
                profileDropdown.classList.contains(
                    "show"
                );

            profileDropdown.classList.toggle(
                "show",
                !isOpen
            );

            profileButton.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );
        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                !profileDropdown.contains(
                    event.target
                ) &&
                !profileButton.contains(
                    event.target
                )
            ) {

                profileDropdown.classList.remove(
                    "show"
                );

                profileButton.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        }
    );
}


// ------------------------------------------------------------
// PROFILE NAVIGATION
// ------------------------------------------------------------

function setupProfileNavigation() {

    const profileLink =
        document.querySelector(
            "#profileLink"
        );

    if (profileLink) {

        profileLink.addEventListener(
            "click",
            () => {

                window.location.href =
                    "employee-profile.html";
            }
        );
    }
}


// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

async function logoutEmployee() {

    try {

        const response =
            await fetch(
                "/api/auth/logout",
                {
                    method: "POST",
                    credentials: "include"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Logout failed."
            );
        }

        window.location.href =
            "../index.html";

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        showDashboardMessage(
            "Unable to log out. Please try again.",
            "error"
        );
    }
}


// ------------------------------------------------------------
// LOGOUT CONFIRMATION MODAL
// ------------------------------------------------------------

function openLogoutModal() {

    const modal =
        document.querySelector(
            "#logoutModal"
        );

    if (!modal) {

        if (
            confirm(
                "Are you sure you want to log out?"
            )
        ) {

            logoutEmployee();
        }

        return;
    }

    modal.hidden = false;

    document.body.classList.add(
        "modal-open"
    );
}


function closeLogoutModal() {

    const modal =
        document.querySelector(
            "#logoutModal"
        );

    if (modal) {

        modal.hidden = true;
    }

    document.body.classList.remove(
        "modal-open"
    );
}


function setupLogout() {

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openLogoutModal();
        }
    );


    const confirmLogoutButton =
        document.querySelector(
            "#confirmLogoutButton"
        );

    if (confirmLogoutButton) {

        confirmLogoutButton.addEventListener(
            "click",
            async () => {

                closeLogoutModal();

                await logoutEmployee();
            }
        );
    }


    const cancelLogoutButton =
        document.querySelector(
            "#cancelLogoutButton"
        );

    if (cancelLogoutButton) {

        cancelLogoutButton.addEventListener(
            "click",
            () => {

                closeLogoutModal();
            }
        );
    }
}


// ------------------------------------------------------------
// MODAL EVENT SETUP
// ------------------------------------------------------------

function setupModalEvents() {

    const closeTaskDetailsButton =
        document.querySelector(
            "#closeTaskDetails"
        );

    if (closeTaskDetailsButton) {

        closeTaskDetailsButton.addEventListener(
            "click",
            closeTaskDetails
        );
    }


    const closeTaskDetailsModalButton =
        document.querySelector(
            "#closeTaskDetailsModal"
        );

    if (closeTaskDetailsModalButton) {

        closeTaskDetailsModalButton.addEventListener(
            "click",
            closeTaskDetails
        );
    }


    const closeStatusButton =
        document.querySelector(
            "#closeStatusModal"
        );

    if (closeStatusButton) {

        closeStatusButton.addEventListener(
            "click",
            closeStatusModal
        );
    }


    const cancelStatusButton =
        document.querySelector(
            "#cancelStatusUpdate"
        );

    if (cancelStatusButton) {

        cancelStatusButton.addEventListener(
            "click",
            closeStatusModal
        );
    }


    const saveStatusButton =
        document.querySelector(
            "#saveStatusButton"
        );

    if (saveStatusButton) {

        saveStatusButton.addEventListener(
            "click",
            updateTaskStatus
        );
    }


    const addUpdateButton =
        document.querySelector(
            "#addTaskUpdateButton"
        );

    if (addUpdateButton) {

        addUpdateButton.addEventListener(
            "click",
            addTaskUpdate
        );
    }


    // Close modal by clicking outside the content.
    document.addEventListener(
        "click",
        event => {

            const taskDetailsModal =
                document.querySelector(
                    "#taskDetailsModal"
                );

            const statusUpdateModal =
                document.querySelector(
                    "#statusUpdateModal"
                );

            const logoutModal =
                document.querySelector(
                    "#logoutModal"
                );


            if (
                taskDetailsModal &&
                !taskDetailsModal.hidden &&
                event.target ===
                    taskDetailsModal
            ) {

                closeTaskDetails();
            }


            if (
                statusUpdateModal &&
                !statusUpdateModal.hidden &&
                event.target ===
                    statusUpdateModal
            ) {

                closeStatusModal();
            }


            if (
                logoutModal &&
                !logoutModal.hidden &&
                event.target ===
                    logoutModal
            ) {

                closeLogoutModal();
            }
        }
    );


    // Close active modal with Escape.
    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            const taskDetailsModal =
                document.querySelector(
                    "#taskDetailsModal"
                );

            const statusUpdateModal =
                document.querySelector(
                    "#statusUpdateModal"
                );

            const logoutModal =
                document.querySelector(
                    "#logoutModal"
                );


            if (
                taskDetailsModal &&
                !taskDetailsModal.hidden
            ) {

                closeTaskDetails();

                return;
            }


            if (
                statusUpdateModal &&
                !statusUpdateModal.hidden
            ) {

                closeStatusModal();

                return;
            }


            if (
                logoutModal &&
                !logoutModal.hidden
            ) {

                closeLogoutModal();
            }
        }
    );
}


// ------------------------------------------------------------
// ADDITIONAL MODAL CSS
// ------------------------------------------------------------

function injectDashboardModalStyles() {

    if (
        document.querySelector(
            "#employeeDashboardDynamicStyles"
        )
    ) {
        return;
    }


    const style =
        document.createElement("style");

    style.id =
        "employeeDashboardDynamicStyles";

    style.textContent = `

        /* ====================================================
           TASK DATE AND TIME
        ==================================================== */

        .task-date-time {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 150px;
        }

        .task-date-time strong {
            color: #374151;
            font-size: 13px;
            font-weight: 600;
            line-height: 1.4;
        }

        .task-overdue-label {
            display: inline-block;
            width: fit-content;
            padding: 2px 7px;
            border-radius: 999px;
            background: #fef2f2;
            color: #b91c1c;
            font-size: 11px;
            font-weight: 700;
        }

        .not-completed {
            color: #9ca3af;
            font-size: 14px;
        }


        /* ====================================================
           MODAL BACKDROP
        ==================================================== */

        .modal-open {
            overflow: hidden;
        }


        /* ====================================================
           DASHBOARD MESSAGE
        ==================================================== */

        .dashboard-message {
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 9999;
            min-width: 280px;
            max-width: 420px;
            padding: 14px 18px;
            border-radius: 10px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
            color: #374151;
            font-size: 14px;
            font-weight: 600;
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition:
                opacity 0.2s ease,
                transform 0.2s ease;
        }

        .dashboard-message.show {
            opacity: 1;
            transform: translateY(0);
        }

        .dashboard-message.success {
            border-left: 4px solid #16a34a;
        }

        .dashboard-message.error {
            border-left: 4px solid #dc2626;
        }


        /* ====================================================
           MODAL BACKDROP
        ==================================================== */

        .dashboard-modal {
            position: fixed;
            inset: 0;
            z-index: 5000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(15, 23, 42, 0.55);
        }

        .dashboard-modal[hidden] {
            display: none;
        }

        .dashboard-modal-content {
            width: min(620px, 100%);
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            background: #ffffff;
            border-radius: 14px;
            box-shadow:
                0 20px 50px rgba(0, 0, 0, 0.2);
        }


        /* ====================================================
           TASK DETAILS
        ==================================================== */

        .task-details-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            padding: 22px 24px;
            border-bottom: 1px solid #e5e7eb;
        }

        .task-details-header h2 {
            margin: 0;
            color: #111827;
            font-size: 20px;
        }

        .modal-close-button {
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: none;
            border-radius: 8px;
            background: #f3f4f6;
            color: #374151;
            font-size: 20px;
            cursor: pointer;
        }

        .modal-close-button:hover {
            background: #e5e7eb;
        }

        .task-details-body {
            padding: 24px;
        }

        .task-details-description {
            margin: 0 0 22px;
            color: #4b5563;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .task-details-grid {
            display: grid;
            grid-template-columns:
                repeat(2, minmax(0, 1fr));
            gap: 16px;
        }

        .task-detail-item {
            padding: 14px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            background: #f9fafb;
        }

        .task-detail-label {
            display: block;
            margin-bottom: 6px;
            color: #6b7280;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .task-detail-value {
            color: #111827;
            font-size: 14px;
            font-weight: 600;
        }


        /* ====================================================
           TASK UPDATES
        ==================================================== */

        .task-updates-section {
            margin-top: 26px;
        }

        .task-updates-section h3 {
            margin: 0 0 14px;
            color: #111827;
            font-size: 16px;
        }

        .task-updates {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .task-update-item {
            padding: 14px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            background: #ffffff;
        }

        .task-update-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
        }

        .task-update-header strong {
            color: #374151;
            font-size: 13px;
        }

        .task-update-header span {
            color: #9ca3af;
            font-size: 12px;
        }

        .task-update-item p {
            margin: 0;
            color: #4b5563;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
        }


        /* ====================================================
           STATUS UPDATE MODAL
        ==================================================== */

        .status-update-form {
            padding: 24px;
        }

        .status-update-form label {
            display: block;
            margin-bottom: 8px;
            color: #374151;
            font-size: 13px;
            font-weight: 600;
        }

        .status-update-form select,
        .status-update-form textarea {
            width: 100%;
            box-sizing: border-box;
            padding: 11px 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: #ffffff;
            color: #111827;
            font-family: inherit;
            font-size: 14px;
            outline: none;
        }

        .status-update-form select:focus,
        .status-update-form textarea:focus {
            border-color: #2864e6;
            box-shadow:
                0 0 0 3px rgba(40, 100, 230, 0.1);
        }

        .status-update-form textarea {
            min-height: 110px;
            resize: vertical;
        }

        .status-update-field {
            margin-bottom: 18px;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
        }

        .modal-actions button {
            min-height: 40px;
            padding: 0 16px;
            border: none;
            border-radius: 8px;
            font-family: inherit;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
        }

        .modal-button-secondary {
            background: #f3f4f6;
            color: #374151;
        }

        .modal-button-secondary:hover {
            background: #e5e7eb;
        }

        .modal-button-primary {
            background: #2864e6;
            color: #ffffff;
        }

        .modal-button-primary:hover {
            background: #1f4fbf;
        }


        /* ====================================================
           EMPTY / ERROR STATES
        ==================================================== */

        .empty-state.small {
            padding: 28px 16px;
            text-align: center;
        }

        .empty-state-icon {
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
            border-radius: 50%;
            background: #eff6ff;
            color: #2864e6;
            font-size: 18px;
            font-weight: 700;
        }

        .empty-state.small h3 {
            margin: 0 0 6px;
            color: #374151;
            font-size: 15px;
        }

        .empty-state.small p {
            margin: 0;
            color: #9ca3af;
            font-size: 13px;
        }

        .loading-state,
        .error-state {
            padding: 20px;
            color: #6b7280;
            text-align: center;
            font-size: 13px;
        }

        .error-state {
            color: #b91c1c;
        }


        /* ====================================================
           LOGOUT MODAL
        ==================================================== */

        .logout-modal-content {
            width: min(420px, 100%);
            padding: 26px;
            background: #ffffff;
            border-radius: 14px;
            box-shadow:
                0 20px 50px rgba(0, 0, 0, 0.2);
            text-align: center;
        }

        .logout-modal-content h2 {
            margin: 0 0 8px;
            color: #111827;
            font-size: 20px;
        }

        .logout-modal-content p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
            line-height: 1.5;
        }


        /* ====================================================
           MOBILE MODAL
        ==================================================== */

        @media (max-width: 640px) {

            .dashboard-modal {
                padding: 12px;
            }

            .dashboard-modal-content {
                max-height: calc(100vh - 24px);
                border-radius: 12px;
            }

            .task-details-grid {
                grid-template-columns: 1fr;
            }

            .task-details-header,
            .task-details-body,
            .status-update-form {
                padding: 18px;
            }

            .task-update-header {
                align-items: flex-start;
                flex-direction: column;
                gap: 4px;
            }

            .modal-actions {
                flex-direction: column;
            }

            .modal-actions button {
                width: 100%;
            }

            .dashboard-message {
                left: 16px;
                right: 16px;
                min-width: 0;
                max-width: none;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}


// ------------------------------------------------------------
// CREATE MISSING MODAL ELEMENTS
// ------------------------------------------------------------

function ensureTaskDetailsModal() {

    if (
        document.querySelector(
            "#taskDetailsModal"
        )
    ) {
        return;
    }


    const modal =
        document.createElement("div");

    modal.id =
        "taskDetailsModal";

    modal.className =
        "dashboard-modal";

    modal.hidden = true;

    modal.innerHTML = `

        <div class="dashboard-modal-content">

            <div class="task-details-header">

                <h2 id="taskDetailsTitle">
                    Task Details
                </h2>

                <button
                    type="button"
                    id="closeTaskDetails"
                    class="modal-close-button"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div class="task-details-body">

                <p
                    id="taskDetailsDescription"
                    class="task-details-description"
                >
                </p>


                <div class="task-details-grid">

                    <div class="task-detail-item">

                        <span class="task-detail-label">
                            Priority
                        </span>

                        <div
                            id="taskDetailsPriority"
                            class="task-detail-value"
                        >
                            —
                        </div>

                    </div>


                    <div class="task-detail-item">

                        <span class="task-detail-label">
                            Status
                        </span>

                        <div
                            id="taskDetailsStatus"
                            class="task-detail-value"
                        >
                            —
                        </div>

                    </div>


                    <div class="task-detail-item">

                        <span class="task-detail-label">
                            Date Created
                        </span>

                        <div
                            id="taskDetailsCreated"
                            class="task-detail-value"
                        >
                            —
                        </div>

                    </div>


                    <div class="task-detail-item">

                        <span class="task-detail-label">
                            Deadline
                        </span>

                        <div
                            id="taskDetailsDeadline"
                            class="task-detail-value"
                        >
                            —
                        </div>

                    </div>


                    <div class="task-detail-item">

                        <span class="task-detail-label">
                            Date Completed
                        </span>

                        <div
                            id="taskDetailsCompleted"
                            class="task-detail-value"
                        >
                            —
                        </div>

                    </div>

                </div>


                <div class="task-updates-section">

                    <h3>
                        Task Updates
                    </h3>

                    <div
                        id="taskUpdates"
                        class="task-updates"
                    >
                        <div class="loading-state">
                            Loading updates...
                        </div>
                    </div>

                </div>


                <div class="status-update-form">

                    <div class="status-update-field">

                        <label for="taskUpdateInput">
                            Add Update / Note
                        </label>

                        <textarea
                            id="taskUpdateInput"
                            placeholder="Write an update or note..."
                            maxlength="2000"
                        ></textarea>

                    </div>

                    <div class="modal-actions">

                        <button
                            type="button"
                            id="addTaskUpdateButton"
                            class="modal-button-primary"
                        >
                            Add Update
                        </button>

                    </div>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );
}


function ensureStatusUpdateModal() {

    if (
        document.querySelector(
            "#statusUpdateModal"
        )
    ) {
        return;
    }


    const modal =
        document.createElement("div");

    modal.id =
        "statusUpdateModal";

    modal.className =
        "dashboard-modal";

    modal.hidden = true;

    modal.innerHTML = `

        <div class="dashboard-modal-content">

            <div class="task-details-header">

                <div>

                    <h2>
                        Update Task
                    </h2>

                    <p
                        id="statusUpdateTaskTitle"
                        style="
                            margin: 6px 0 0;
                            color: #6b7280;
                            font-size: 13px;
                        "
                    >
                    </p>

                </div>

                <button
                    type="button"
                    id="closeStatusModal"
                    class="modal-close-button"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div class="status-update-form">

                <div class="status-update-field">

                    <label for="statusSelect">
                        Status
                    </label>

                    <select id="statusSelect">

                        <option value="Pending">
                            Pending
                        </option>

                        <option value="In Progress">
                            In Progress
                        </option>

                        <option value="Completed">
                            Completed
                        </option>

                    </select>

                </div>


                <div class="status-update-field">

                    <label for="statusUpdateNote">
                        Update / Note
                    </label>

                    <textarea
                        id="statusUpdateNote"
                        maxlength="2000"
                        placeholder="Optional note about this status change..."
                    ></textarea>

                </div>


                <div class="modal-actions">

                    <button
                        type="button"
                        id="cancelStatusUpdate"
                        class="modal-button-secondary"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        id="saveStatusButton"
                        class="modal-button-primary"
                    >
                        Save Changes
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );
}


function ensureLogoutModal() {

    if (
        document.querySelector(
            "#logoutModal"
        )
    ) {
        return;
    }


    const modal =
        document.createElement("div");

    modal.id =
        "logoutModal";

    modal.className =
        "dashboard-modal";

    modal.hidden = true;

    modal.innerHTML = `

        <div class="logout-modal-content">

            <h2>
                Log Out
            </h2>

            <p>
                Are you sure you want to log out?
            </p>

            <div class="modal-actions">

                <button
                    type="button"
                    id="cancelLogoutButton"
                    class="modal-button-secondary"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    id="confirmLogoutButton"
                    class="modal-button-primary"
                >
                    Log Out
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );
}


// ------------------------------------------------------------
// TASK UPDATE NOTE WHEN STATUS IS CHANGED
// ------------------------------------------------------------

async function addStatusChangeNote(
    taskId,
    note
) {

    if (!note) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/tasks/${taskId}/updates`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        note
                    })
                }
            );

        if (!response.ok) {

            const data =
                await response.json();

            throw new Error(
                data.message ||
                "Failed to add status note."
            );
        }

    } catch (error) {

        console.error(
            "Add status change note error:",
            error
        );
    }
}


// ------------------------------------------------------------
// REPLACE STATUS UPDATE WITH NOTE SUPPORT
// ------------------------------------------------------------

async function updateTaskStatusWithNote() {

    if (!selectedTask) {

        showDashboardMessage(
            "No task selected.",
            "error"
        );

        return;
    }


    const statusSelect =
        document.querySelector(
            "#statusSelect"
        );

    if (!statusSelect) {
        return;
    }


    const noteInput =
        document.querySelector(
            "#statusUpdateNote"
        );


    const newStatus =
        statusSelect.value;

    const note =
        noteInput
            ? noteInput.value.trim()
            : "";


    const allowedStatuses = [
        "Pending",
        "In Progress",
        "Completed"
    ];


    if (
        !allowedStatuses.includes(
            newStatus
        )
    ) {

        showDashboardMessage(
            "Invalid task status.",
            "error"
        );

        return;
    }


    if (note.length > 2000) {

        showDashboardMessage(
            "Update cannot exceed 2000 characters.",
            "error"
        );

        return;
    }


    const taskId =
        selectedTask.id;


    try {

        const response =
            await fetch(
                `/api/tasks/${taskId}/status`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        status:
                            newStatus
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to update task status."
            );
        }


        if (note) {

            await addStatusChangeNote(
                taskId,
                note
            );
        }


        closeStatusModal();

        showDashboardMessage(
            "Task status updated successfully.",
            "success"
        );


        await loadTasks();

    } catch (error) {

        console.error(
            "Update task status error:",
            error
        );

        showDashboardMessage(
            error.message ||
            "Unable to update task status.",
            "error"
        );
    }
}


// ------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------

async function initializeEmployeeDashboard() {

    // Add any dynamically required modals.
    ensureTaskDetailsModal();

    ensureStatusUpdateModal();

    ensureLogoutModal();

    // Add dynamic styling.
    injectDashboardModalStyles();

    // Set up UI events.
    setupProfileDropdown();

    setupProfileNavigation();

    setupLogout();

    setupModalEvents();


    // Check authentication first.
    const sessionValid =
        await checkEmployeeSession();

    if (!sessionValid) {
        return;
    }


    // Load the latest profile from the database.
    await loadEmployeeProfile();


    // Load assigned tasks.
    await loadTasks();
}


// ------------------------------------------------------------
// AUTO REFRESH
// ------------------------------------------------------------

let dashboardRefreshInterval = null;


function startDashboardAutoRefresh() {

    if (dashboardRefreshInterval) {

        clearInterval(
            dashboardRefreshInterval
        );
    }


    // Refresh every 60 seconds.
    dashboardRefreshInterval =
        setInterval(
            async () => {

                try {

                    const sessionValid =
                        await checkEmployeeSession();

                    if (!sessionValid) {
                        return;
                    }

                    await loadEmployeeProfile();

                    await loadTasks();

                } catch (error) {

                    console.error(
                        "Dashboard auto-refresh error:",
                        error
                    );
                }

            },
            60000
        );
}


// ------------------------------------------------------------
// PAGE LOAD
// ------------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await initializeEmployeeDashboard();

        startDashboardAutoRefresh();

    }
);


// ------------------------------------------------------------
// PAGE VISIBILITY REFRESH
// ------------------------------------------------------------

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState !==
            "visible"
        ) {
            return;
        }


        // When the user returns to the dashboard,
        // refresh the latest task/profile information.
        try {

            const sessionValid =
                await checkEmployeeSession();

            if (!sessionValid) {
                return;
            }

            await loadEmployeeProfile();

            await loadTasks();

        } catch (error) {

            console.error(
                "Visibility refresh error:",
                error
            );
        }
    }
);