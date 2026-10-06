// ========================================
// ADMIN DASHBOARD
// ========================================


// ----------------------------------------
// GLOBAL DATA
// ----------------------------------------

let employees = [];
let tasks = [];


// ----------------------------------------
// DOM ELEMENTS
// ----------------------------------------

const statsCards =
    document.querySelectorAll(".stat-card");

const taskSection =
    document.querySelectorAll(".dashboard-section")[0];

const employeeSection =
    document.querySelectorAll(".dashboard-section")[1];

const activitySection =
    document.querySelectorAll(".dashboard-section")[2];


// ----------------------------------------
// HELPER: ESCAPE HTML
// ----------------------------------------

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


// ----------------------------------------
// HELPER: INITIALS
// ----------------------------------------

function getInitials(name) {

    const text =
        (name || "").trim();

    if (!text) {
        return "US";
    }

    const words =
        text
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


// ----------------------------------------
// HELPER: DATE FORMAT
// ----------------------------------------

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
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Asia/Manila"
        }
    );
}


// ----------------------------------------
// HELPER: DATE + TIME
// ----------------------------------------

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


// ----------------------------------------
// HELPER: TIME AGO
// ----------------------------------------

function timeAgo(dateValue) {

    if (!dateValue) {
        return "";
    }

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const now =
        new Date();

    const difference =
        Math.floor(
            (
                now.getTime() -
                date.getTime()
            ) / 1000
        );

    if (difference < 60) {
        return "Just now";
    }

    const minutes =
        Math.floor(
            difference / 60
        );

    if (minutes < 60) {

        return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {

        return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    }

    const days =
        Math.floor(
            hours / 24
        );

    if (days < 30) {

        return `${days} day${days === 1 ? "" : "s"} ago`;

    }

    return formatDate(dateValue);
}


// ----------------------------------------
// HELPER: SHOW MESSAGE
// ----------------------------------------

function showDashboardMessage(
    message,
    type = "success"
) {

    let messageElement =
        document.getElementById(
            "dashboardMessage"
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

        if (messageElement) {
            messageElement.remove();
        }

    }, 5000);
}


// ----------------------------------------
// AUTHENTICATION CHECK
// ----------------------------------------

async function checkAdminSession() {

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

            return null;
        }

        if (data.user.role !== "admin") {

            window.location.href =
                "../employee/dashboard.html";

            return null;
        }

        return data.user;

    } catch (error) {

        console.error(
            "Session check error:",
            error
        );

        window.location.href =
            "login.html";

        return null;
    }
}


// ----------------------------------------
// LOAD LATEST PROFILE
// ----------------------------------------

async function loadCurrentProfile() {

    try {

        const response =
            await fetch(
                "/api/profile",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        if (response.status === 401) {

            window.location.href =
                "login.html";

            return null;
        }

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success ||
            !data.user
        ) {

            throw new Error(
                data.message ||
                "Unable to load profile."
            );
        }

        if (data.user.role !== "admin") {

            window.location.href =
                "../employee/dashboard.html";

            return null;
        }

        return data.user;

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

        return null;
    }
}


// ----------------------------------------
// UPDATE ADMIN PROFILE IN HEADER
// ----------------------------------------

function updateHeaderProfile(user) {

    if (!user) {
        return;
    }

    const profileName =
        document.querySelector(
            ".profile-name"
        );

    const profileRole =
        document.querySelector(
            ".profile-role"
        );

    const profileAvatar =
        document.querySelector(
            ".profile-avatar"
        );

    const dropdownUser =
        document.querySelector(
            ".dropdown-user"
        );

    if (profileName) {

        profileName.textContent =
            user.full_name ||
            "Administrator";
    }

    if (profileRole) {

        profileRole.textContent =
            "Administrator";
    }


    // ----------------------------------------
    // UPDATE PROFILE AVATAR
    // ----------------------------------------

    if (profileAvatar) {

        profileAvatar.innerHTML = "";

        profileAvatar.classList.remove(
            "has-image"
        );

        const fullName =
            user.full_name ||
            "Administrator";

        const imageUrl =
            user.profile_image;

        if (imageUrl) {

            const image =
                document.createElement("img");

            image.src =
                imageUrl;

            image.alt =
                fullName;

            image.addEventListener(
                "load",
                function () {

                    profileAvatar.classList.add(
                        "has-image"
                    );

                }
            );

            image.addEventListener(
                "error",
                function () {

                    profileAvatar.innerHTML =
                        "";

                    profileAvatar.classList.remove(
                        "has-image"
                    );

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


    // ----------------------------------------
    // UPDATE DROPDOWN INFORMATION
    // ----------------------------------------

    if (dropdownUser) {

        dropdownUser.innerHTML = `

            <strong>
                ${escapeHtml(
                    user.full_name ||
                    "Administrator"
                )}
            </strong>

            <span>
                ${escapeHtml(
                    user.email || ""
                )}
            </span>

        `;
    }
}


// ----------------------------------------
// LOAD DASHBOARD STATISTICS
// ----------------------------------------

async function loadDashboardStats() {

    try {

        const response =
            await fetch(
                "/api/tasks/dashboard/stats",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        if (response.status === 401) {

            window.location.href =
                "login.html";

            return;
        }

        if (response.status === 403) {

            window.location.href =
                "../employee/dashboard.html";

            return;
        }

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load dashboard statistics."
            );
        }

        updateStatistics(data);

    } catch (error) {

        console.error(
            "Statistics error:",
            error
        );

        showDashboardMessage(
            error.message ||
            "Unable to load dashboard statistics.",
            "error"
        );
    }
}


// ----------------------------------------
// UPDATE STATISTICS
// ----------------------------------------

function updateStatistics(data) {

    const stats =
        data.stats || data;

    const totalEmployees =
        stats.totalEmployees ??
        stats.total_employees ??
        0;

    const totalTasks =
        stats.totalTasks ??
        stats.total_tasks ??
        0;

    const pending =
        stats.pending ??
        stats.pendingTasks ??
        stats.pending_tasks ??
        0;

    const inProgress =
        stats.inProgress ??
        stats.in_progress ??
        stats.inProgressTasks ??
        0;

    const completed =
        stats.completed ??
        stats.completedTasks ??
        stats.completed_tasks ??
        0;

    const overdue =
        stats.overdue ??
        stats.overdueTasks ??
        stats.overdue_tasks ??
        0;

    const values = [
        totalEmployees,
        totalTasks,
        pending,
        inProgress,
        completed,
        overdue
    ];

    statsCards.forEach(
        (card, index) => {

            const number =
                card.querySelector(
                    ".stat-number"
                );

            if (number) {

                number.textContent =
                    values[index];
            }

        }
    );
}


// ----------------------------------------
// LOAD EMPLOYEES
// ----------------------------------------

async function loadEmployees() {

    try {

        const response =
            await fetch(
                "/api/employees",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        if (response.status === 401) {

            window.location.href =
                "login.html";

            return;
        }

        if (response.status === 403) {

            window.location.href =
                "../employee/dashboard.html";

            return;
        }

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load employees."
            );
        }

        employees =
            data.employees ||
            data.users ||
            data.data ||
            [];

        renderEmployeeTable();

        populateEmployeeFilter();

    } catch (error) {

        console.error(
            "Employee loading error:",
            error
        );

        showDashboardMessage(
            error.message ||
            "Unable to load employees.",
            "error"
        );
    }
}


// ----------------------------------------
// RENDER EMPLOYEE TABLE
// ----------------------------------------

function renderEmployeeTable() {

    if (!employeeSection) {
        return;
    }

    const table =
        employeeSection.querySelector(
            ".employee-table"
        );

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {

        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    if (employees.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="text-align:center;"
                >
                    No employees found.
                </td>

            </tr>

        `;

        return;
    }

    tbody.innerHTML =
        employees
            .map(employee => {

                const name =
                    employee.full_name ||
                    employee.fullName ||
                    "Unknown Employee";

                const email =
                    employee.email ||
                    "—";

                const isActive =
                    Number(
                        employee.is_active
                    ) === 1 ||
                    employee.is_active === true;

                const statusClass =
                    isActive
                        ? "active"
                        : "inactive";

                const statusText =
                    isActive
                        ? "Active"
                        : "Inactive";

                const taskCount =
                    employee.task_count ??
                    employee.tasks_count ??
                    employee.tasks ??
                    0;

                return `

                    <tr>

                        <td>

                            <div class="employee-cell">

                                <div class="employee-avatar">

                                    ${escapeHtml(
                                        getInitials(
                                            name
                                        )
                                    )}

                                </div>

                                <div>

                                    <strong>
                                        ${escapeHtml(
                                            name
                                        )}
                                    </strong>

                                    <span>
                                        Employee
                                    </span>

                                </div>

                            </div>

                        </td>

                        <td>
                            ${escapeHtml(email)}
                        </td>

                        <td>

                            <span
                                class="employee-status ${statusClass}"
                            >
                                ${statusText}
                            </span>

                        </td>

                        <td>
                            ${escapeHtml(taskCount)}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="table-action manage-employee-button"
                                data-id="${employee.id}"
                            >
                                Manage
                            </button>

                        </td>

                    </tr>

                `;

            })
            .join("");

    attachEmployeeButtons();
}


// ----------------------------------------
// POPULATE EMPLOYEE FILTER
// ----------------------------------------

function populateEmployeeFilter() {

    if (!taskSection) {
        return;
    }

    const selects =
        taskSection.querySelectorAll(
            ".filter-control select"
        );

    if (selects.length < 1) {
        return;
    }

    const employeeSelect =
        selects[0];

    employeeSelect.innerHTML = `

        <option value="">
            All Employees
        </option>

    `;

    employees
        .filter(
            employee =>
                employee.role === "employee" ||
                !employee.role
        )
        .forEach(employee => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                employee.id;

            option.textContent =
                employee.full_name ||
                "Unknown Employee";

            employeeSelect.appendChild(
                option
            );

        });
}


// ----------------------------------------
// LOAD TASKS
// ----------------------------------------

async function loadTasks() {

    try {

        const filters =
            getTaskFilters();

        const params =
            new URLSearchParams();

        if (filters.search) {

            params.set(
                "search",
                filters.search
            );
        }

        if (filters.employee) {

            params.set(
                "employee",
                filters.employee
            );
        }

        if (filters.status) {

            params.set(
                "status",
                filters.status
            );
        }

        if (filters.priority) {

            params.set(
                "priority",
                filters.priority
            );
        }

        if (filters.overdue) {

            params.set(
                "overdue",
                filters.overdue
            );
        }

        const query =
            params.toString();

        const url =
            query
                ? `/api/tasks?${query}`
                : "/api/tasks";

        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        if (response.status === 401) {

            window.location.href =
                "login.html";

            return;
        }

        if (response.status === 403) {

            window.location.href =
                "../employee/dashboard.html";

            return;
        }

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load tasks."
            );
        }

        tasks =
            data.tasks ||
            data.data ||
            [];

        renderTaskTable();

    } catch (error) {

        console.error(
            "Task loading error:",
            error
        );

        showDashboardMessage(
            error.message ||
            "Unable to load tasks.",
            "error"
        );
    }
}


// ----------------------------------------
// GET TASK FILTERS
// ----------------------------------------

function getTaskFilters() {

    if (!taskSection) {

        return {
            search: "",
            employee: "",
            status: "",
            priority: "",
            overdue: ""
        };
    }

    const searchInput =
        taskSection.querySelector(
            ".filter-search input"
        );

    const selects =
        taskSection.querySelectorAll(
            ".filter-control select"
        );

    return {

        search:
            searchInput
                ? searchInput.value.trim()
                : "",

        employee:
            selects[0]
                ? selects[0].value
                : "",

        status:
            selects[1]
                ? selects[1].value
                : "",

        priority:
            selects[2]
                ? selects[2].value
                : "",

        overdue:
            selects[3]
                ? selects[3].value
                : ""

    };
}


// ----------------------------------------
// RENDER TASK TABLE
// ----------------------------------------

function renderTaskTable() {

    if (!taskSection) {
        return;
    }

    const table =
        taskSection.querySelector(
            ".task-table"
        );

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {

        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    if (tasks.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;"
                >
                    No tasks found.
                </td>

            </tr>

        `;

        return;
    }

    tbody.innerHTML =
        tasks
            .map(task => {

                const title =
                    task.title ||
                    "Untitled Task";

                const description =
                    task.description ||
                    "";

                const employeeName =
                    task.employee_name ||
                    task.employeeName ||
                    task.assigned_employee ||
                    task.assigned_to_name ||
                    "Unassigned";

                const priority =
                    task.priority ||
                    "Medium";

                const status =
                    task.status ||
                    "Pending";

                const isOverdue =
                    isTaskOverdue(task);


                // ----------------------------------------
                // STATUS CLASS
                // ----------------------------------------

                let statusClass =
                    "status-pending";

                if (status === "In Progress") {

                    statusClass =
                        "status-progress";

                } else if (status === "Completed") {

                    statusClass =
                        "status-completed";
                }


                // ----------------------------------------
                // DISPLAY STATUS
                // ----------------------------------------

                let displayStatus =
                    status;

                if (
                    isOverdue &&
                    status !== "Completed"
                ) {

                    statusClass =
                        "status-overdue";

                    displayStatus =
                        "Overdue";
                }


                // ----------------------------------------
                // PRIORITY CLASS
                // ----------------------------------------

                const priorityClass =
                    priority === "High"
                        ? "priority-high"
                        : priority === "Low"
                            ? "priority-low"
                            : "priority-medium";


                // ----------------------------------------
                // DEADLINE
                // ----------------------------------------

                const deadline =
                    formatDateTime(
                        task.deadline
                    );


                // ----------------------------------------
                // COMPLETED AT
                // ----------------------------------------

                const completedAt =
                    status === "Completed"
                        ? formatDateTime(
                            task.completed_at ||
                            task.completedAt
                        )
                        : "—";


                return `

                    <tr>

                        <!-- TASK -->

                        <td>

                            <div class="task-title">
                                ${escapeHtml(title)}
                            </div>

                            <div class="task-description">
                                ${escapeHtml(description)}
                            </div>

                        </td>


                        <!-- EMPLOYEE -->

                        <td>
                            ${escapeHtml(
                                employeeName
                            )}
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

                                <strong>
                                    ${escapeHtml(
                                        deadline
                                    )}
                                </strong>

                                ${
                                    isOverdue
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
                                    completedAt !== "—"
                                        ? `
                                            <strong>
                                                ${escapeHtml(
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

                            <span
                                class="status-badge ${statusClass}"
                            >
                                ${escapeHtml(
                                    displayStatus
                                )}
                            </span>

                        </td>

                    </tr>

                `;

            })
            .join("");
}


// ----------------------------------------
// CHECK OVERDUE
// ----------------------------------------

function isTaskOverdue(task) {

    if (!task.deadline) {
        return false;
    }

    if (task.status === "Completed") {
        return false;
    }

    const deadline =
        new Date(task.deadline);

    if (
        Number.isNaN(
            deadline.getTime()
        )
    ) {
        return false;
    }

    return deadline < new Date();
}


// ----------------------------------------
// FILTER EVENT LISTENERS
// ----------------------------------------

function setupTaskFilters() {

    if (!taskSection) {
        return;
    }

    const searchInput =
        taskSection.querySelector(
            ".filter-search input"
        );

    const selects =
        taskSection.querySelectorAll(
            ".filter-control select"
        );

    if (searchInput) {

        let searchTimer;

        searchInput.addEventListener(
            "input",
            function () {

                clearTimeout(
                    searchTimer
                );

                searchTimer =
                    setTimeout(
                        loadTasks,
                        300
                    );

            }
        );
    }

    selects.forEach(
        select => {

            select.addEventListener(
                "change",
                loadTasks
            );

        }
    );
}


// ----------------------------------------
// CREATE TASK MODAL
// ----------------------------------------

function openCreateTaskModal() {

    const existingModal =
        document.getElementById(
            "createTaskModal"
        );

    if (existingModal) {
        existingModal.remove();
    }

    const employeeOptions =
        employees
            .filter(
                employee =>
                    (
                        employee.role === "employee" ||
                        !employee.role
                    ) &&
                    (
                        Number(
                            employee.is_active
                        ) === 1 ||
                        employee.is_active === true
                    )
            )
            .map(
                employee => `

                    <option
                        value="${employee.id}"
                    >
                        ${escapeHtml(
                            employee.full_name ||
                            "Unknown Employee"
                        )}
                    </option>

                `
            )
            .join("");

    const modal =
        document.createElement("div");

    modal.id =
        "createTaskModal";

    modal.className =
        "dashboard-modal-overlay";

    modal.innerHTML = `

        <div class="dashboard-modal">

            <div class="dashboard-modal-header">

                <div>

                    <h2>
                        Create Task
                    </h2>

                    <p>
                        Create and assign a new employee task.
                    </p>

                </div>

                <button
                    type="button"
                    class="modal-close-button"
                    id="closeCreateTaskModal"
                >
                    ×
                </button>

            </div>

            <form id="createTaskForm">

                <div class="modal-form-group">

                    <label for="newTaskTitle">
                        Task Title
                    </label>

                    <input
                        type="text"
                        id="newTaskTitle"
                        name="title"
                        placeholder="Enter task title"
                        required
                    >

                </div>

                <div class="modal-form-group">

                    <label for="newTaskDescription">
                        Description
                    </label>

                    <textarea
                        id="newTaskDescription"
                        name="description"
                        placeholder="Enter task description"
                        rows="4"
                    ></textarea>

                </div>

                <div class="modal-form-row">

                    <div class="modal-form-group">

                        <label for="newTaskEmployee">
                            Assign Employee
                        </label>

                        <select
                            id="newTaskEmployee"
                            name="assigned_to"
                            required
                        >

                            <option value="">
                                Select employee
                            </option>

                            ${employeeOptions}

                        </select>

                    </div>

                    <div class="modal-form-group">

                        <label for="newTaskPriority">
                            Priority
                        </label>

                        <select
                            id="newTaskPriority"
                            name="priority"
                            required
                        >

                            <option value="Low">
                                Low
                            </option>

                            <option
                                value="Medium"
                                selected
                            >
                                Medium
                            </option>

                            <option value="High">
                                High
                            </option>

                        </select>

                    </div>

                </div>

                <div class="modal-form-group">

                    <label for="newTaskDeadline">
                        Deadline
                    </label>

                    <input
                        type="datetime-local"
                        id="newTaskDeadline"
                        name="deadline"
                        required
                    >

                    <small>
                        Select the exact date and time the task is due.
                    </small>

                </div>

                <div class="dashboard-modal-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelCreateTask"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Create Task
                    </button>

                </div>

            </form>

        </div>

    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeCreateTaskModal"
        )
        .addEventListener(
            "click",
            closeCreateTaskModal
        );

    document
        .getElementById(
            "cancelCreateTask"
        )
        .addEventListener(
            "click",
            closeCreateTaskModal
        );

    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {

                closeCreateTaskModal();
            }

        }
    );

    document
        .getElementById(
            "createTaskForm"
        )
        .addEventListener(
            "submit",
            createTask
        );
}


// ----------------------------------------
// CLOSE CREATE TASK MODAL
// ----------------------------------------

function closeCreateTaskModal() {

    const modal =
        document.getElementById(
            "createTaskModal"
        );

    if (modal) {
        modal.remove();
    }
}


// ----------------------------------------
// CREATE TASK
// ----------------------------------------

async function createTask(event) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    const title =
        formData
            .get("title")
            .trim();

    const description =
        formData
            .get("description")
            .trim();

    const assignedTo =
        formData
            .get("assigned_to");

    const priority =
        formData
            .get("priority");

    const deadline =
        formData
            .get("deadline");

    if (!title) {

        showDashboardMessage(
            "Please enter a task title.",
            "error"
        );

        return;
    }

    if (!assignedTo) {

        showDashboardMessage(
            "Please select an employee.",
            "error"
        );

        return;
    }

    if (!deadline) {

        showDashboardMessage(
            "Please select a deadline.",
            "error"
        );

        return;
    }

    try {

        const response =
            await fetch(
                "/api/tasks",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({

                        title,

                        description,

                        assigned_to:
                            Number(
                                assignedTo
                            ),

                        priority,

                        deadline

                    })
                }
            );

        const data =
            await response.json();

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
                "Unable to create task."
            );
        }

        closeCreateTaskModal();

        showDashboardMessage(
            "Task created successfully.",
            "success"
        );

        await Promise.all([

            loadTasks(),

            loadDashboardStats(),

            loadActivities()

        ]);

    } catch (error) {

        console.error(
            "Create task error:",
            error
        );

        showDashboardMessage(
            error.message ||
            "Unable to create task.",
            "error"
        );
    }
}


// ----------------------------------------
// ADD EMPLOYEE MODAL
// ----------------------------------------

function openAddEmployeeModal() {

    const existingModal =
        document.getElementById(
            "addEmployeeModal"
        );

    if (existingModal) {
        existingModal.remove();
    }

    const modal =
        document.createElement("div");

    modal.id =
        "addEmployeeModal";

    modal.className =
        "dashboard-modal-overlay";

    modal.innerHTML = `

        <div class="dashboard-modal">

            <div class="dashboard-modal-header">

                <div>

                    <h2>
                        Add Employee
                    </h2>

                    <p>
                        Create a new employee account.
                    </p>

                </div>

                <button
                    type="button"
                    class="modal-close-button"
                    id="closeAddEmployeeModal"
                >
                    ×
                </button>

            </div>

            <form id="addEmployeeForm">

                <div class="modal-form-group">

                    <label for="newEmployeeName">
                        Full Name
                    </label>

                    <input
                        type="text"
                        id="newEmployeeName"
                        name="full_name"
                        placeholder="Enter full name"
                        required
                    >

                </div>

                <div class="modal-form-group">

                    <label for="newEmployeeEmail">
                        Email Address
                    </label>

                    <input
                        type="email"
                        id="newEmployeeEmail"
                        name="email"
                        placeholder="Enter email address"
                        required
                    >

                </div>

                <div class="modal-form-group">

                    <label for="newEmployeePassword">
                        Password
                    </label>

                    <input
                        type="password"
                        id="newEmployeePassword"
                        name="password"
                        placeholder="Enter temporary password"
                        minlength="8"
                        required
                    >

                    <small>
                        Password must be at least 8 characters.
                    </small>

                </div>

                <div class="dashboard-modal-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelAddEmployee"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Add Employee
                    </button>

                </div>

            </form>

        </div>

    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeAddEmployeeModal"
        )
        .addEventListener(
            "click",
            closeAddEmployeeModal
        );

    document
        .getElementById(
            "cancelAddEmployee"
        )
        .addEventListener(
            "click",
            closeAddEmployeeModal
        );

    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {

                closeAddEmployeeModal();
            }

        }
    );

    document
        .getElementById(
            "addEmployeeForm"
        )
        .addEventListener(
            "submit",
            createEmployee
        );
}


// ----------------------------------------
// CLOSE ADD EMPLOYEE MODAL
// ----------------------------------------

function closeAddEmployeeModal() {

    const modal =
        document.getElementById(
            "addEmployeeModal"
        );

    if (modal) {
        modal.remove();
    }
}


// ----------------------------------------
// CREATE EMPLOYEE
// ----------------------------------------

async function createEmployee(event) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    const fullName =
        formData
            .get("full_name")
            .trim();

    const email =
        formData
            .get("email")
            .trim()
            .toLowerCase();

    const password =
        formData
            .get("password");

    if (fullName.length < 2) {

        showDashboardMessage(
            "Please enter a valid full name.",
            "error"
        );

        return;
    }

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        showDashboardMessage(
            "Please enter a valid email address.",
            "error"
        );

        return;
    }

    if (password.length < 8) {

        showDashboardMessage(
            "Password must be at least 8 characters.",
            "error"
        );

        return;
    }

    try {

        const response =
            await fetch(
                "/api/employees",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({

                        full_name:
                            fullName,

                        email:
                            email,

                        password:
                            password

                    })
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {

            window.location.href =
                "login.html";

            return;
        }

        if (response.status === 403) {

            window.location.href =
                "../employee/dashboard.html";

            return;
        }

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to create employee."
            );
        }

        closeAddEmployeeModal();

        showDashboardMessage(
            "Employee account created successfully.",
            "success"
        );

        await Promise.all([

            loadEmployees(),

            loadDashboardStats(),

            loadActivities()

        ]);

    } catch (error) {

        console.error(
            "Create employee error:",
            error
        );

        showDashboardMessage(
            error.message ||
            "Unable to create employee.",
            "error"
        );
    }
}


// ----------------------------------------
// MANAGE EMPLOYEE BUTTONS
// ----------------------------------------

function attachEmployeeButtons() {

    const buttons =
        document.querySelectorAll(
            ".manage-employee-button"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const employeeId =
                    Number(
                        button.dataset.id
                    );

                openManageEmployeeModal(
                    employeeId
                );

            }
        );

    });
}


// ----------------------------------------
// MANAGE EMPLOYEE MODAL
// ----------------------------------------

function openManageEmployeeModal(
    employeeId
) {

    const employee =
        employees.find(
            item =>
                Number(item.id) ===
                Number(employeeId)
        );

    if (!employee) {

        showDashboardMessage(
            "Employee information could not be found.",
            "error"
        );

        return;
    }

    const existingModal =
        document.getElementById(
            "manageEmployeeModal"
        );

    if (existingModal) {
        existingModal.remove();
    }

    const isActive =
        Number(employee.is_active) === 1 ||
        employee.is_active === true;

    const modal =
        document.createElement("div");

    modal.id =
        "manageEmployeeModal";

    modal.className =
        "dashboard-modal-overlay";

    modal.innerHTML = `

        <div class="dashboard-modal">

            <div class="dashboard-modal-header">

                <div>

                    <h2>
                        Manage Employee
                    </h2>

                    <p>
                        Update employee account information.
                    </p>

                </div>

                <button
                    type="button"
                    class="modal-close-button"
                    id="closeManageEmployeeModal"
                >
                    ×
                </button>

            </div>

            <form id="manageEmployeeForm">

                <input
                    type="hidden"
                    id="manageEmployeeId"
                    value="${employee.id}"
                >

                <div class="modal-form-group">

                    <label for="manageEmployeeName">
                        Full Name
                    </label>

                    <input
                        type="text"
                        id="manageEmployeeName"
                        value="${escapeHtml(
                            employee.full_name || ""
                        )}"
                        required
                    >

                </div>

                <div class="modal-form-group">

                    <label for="manageEmployeeEmail">
                        Email Address
                    </label>

                    <input
                        type="email"
                        id="manageEmployeeEmail"
                        value="${escapeHtml(
                            employee.email || ""
                        )}"
                        required
                    >

                </div>

                <div class="modal-form-group">

                    <label for="manageEmployeeStatus">
                        Account Status
                    </label>

                    <select
                        id="manageEmployeeStatus"
                    >

                        <option
                            value="1"
                            ${isActive ? "selected" : ""}
                        >
                            Active
                        </option>

                        <option
                            value="0"
                            ${!isActive ? "selected" : ""}
                        >
                            Inactive
                        </option>

                    </select>

                </div>

                <div class="dashboard-modal-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelManageEmployee"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Save Changes
                    </button>

                </div>

            </form>

        </div>

    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeManageEmployeeModal"
        )
        .addEventListener(
            "click",
            closeManageEmployeeModal
        );

    document
        .getElementById(
            "cancelManageEmployee"
        )
        .addEventListener(
            "click",
            closeManageEmployeeModal
        );

    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {

                closeManageEmployeeModal();
            }

        }
    );

    document
        .getElementById(
            "manageEmployeeForm"
        )
        .addEventListener(
            "submit",
            updateEmployee
        );
}


// ----------------------------------------
// CLOSE MANAGE EMPLOYEE MODAL
// ----------------------------------------

function closeManageEmployeeModal() {

    const modal =
        document.getElementById(
            "manageEmployeeModal"
        );

    if (modal) {
        modal.remove();
    }
}


// ----------------------------------------
// UPDATE EMPLOYEE
// ----------------------------------------

async function updateEmployee(event) {

    event.preventDefault();

    const employeeId =
        Number(
            document.getElementById(
                "manageEmployeeId"
            ).value
        );

    const fullName =
        document.getElementById(
            "manageEmployeeName"
        ).value.trim();

    const email =
        document.getElementById(
            "manageEmployeeEmail"
        ).value.trim()
        .toLowerCase();

    const isActive =
        document.getElementById(
            "manageEmployeeStatus"
        ).value;

    if (!fullName) {

        showDashboardMessage(
            "Full name is required.",
            "error"
        );

        return;
    }

    if (fullName.length < 2) {

        showDashboardMessage(
            "Please enter a valid full name.",
            "error"
        );

        return;
    }

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        showDashboardMessage(
            "Please enter a valid email address.",
            "error"
        );

        return;
    }

    try {

        const response =
            await fetch(
                `/api/employees/${employeeId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({

                        full_name:
                            fullName,

                        email:
                            email

                    })
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {

            window.location.href =
                "login.html";

            return;
        }

        if (response.status === 403) {

            window.location.href =
                "../employee/dashboard.html";

            return;
        }

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to update employee."
            );
        }

        const statusResponse =
            await fetch(
                `/api/employees/${employeeId}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({

                        is_active:
                            Number(isActive)

                    })
                }
            );

        const statusData =
            await statusResponse.json();

        if (
            !statusResponse.ok ||
            !statusData.success
        ) {

            throw new Error(
                statusData.message ||
                "Employee information was updated, but status could not be changed."
            );
        }

        closeManageEmployeeModal();

        showDashboardMessage(
            "Employee updated successfully.",
            "success"
        );

        await Promise.all([

            loadEmployees(),

            loadDashboardStats(),

            loadTasks(),

            loadActivities()

        ]);

    } catch (error) {

        console.error(
            "Update employee error:",
            error
        );

        showDashboardMessage(
            error.message ||
            "Unable to update employee.",
            "error"
        );
    }
}


// ----------------------------------------
// LOAD ACTIVITY
// ----------------------------------------

async function loadActivities() {

    if (!activitySection) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/activity",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        if (response.status === 401) {

            window.location.href =
                "login.html";

            return;
        }

        if (response.status === 403) {
            return;
        }

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load activity."
            );
        }

        const activities =
            data.activities ||
            data.data ||
            [];

        renderActivities(
            activities
        );

    } catch (error) {

        console.error(
            "Activity loading error:",
            error
        );
    }
}


// ----------------------------------------
// RENDER ACTIVITIES
// ----------------------------------------

function renderActivities(
    activities
) {

    if (!activitySection) {
        return;
    }

    const activityList =
        activitySection.querySelector(
            ".activity-list"
        );

    if (!activityList) {
        return;
    }

    if (activities.length === 0) {

        activityList.innerHTML = `

            <div class="activity-item">

                <div class="activity-content">

                    <strong>
                        No recent activity
                    </strong>

                    <span>
                        There are no recorded activities yet.
                    </span>

                </div>

            </div>

        `;

        return;
    }

    const latestActivities =
        activities.slice(
            0,
            10
        );

    activityList.innerHTML =
        latestActivities
            .map(activity => {

                const name =
                    activity.full_name ||
                    activity.user_name ||
                    "System";

                const initials =
                    getInitials(
                        name
                    );

                const description =
                    activity.description ||
                    activity.action ||
                    "Performed an action";

                const time =
                    timeAgo(
                        activity.created_at
                    );

                const iconClass =
                    activity.action &&
                    activity.action.includes(
                        "TASK_CREATED"
                    )
                        ? "orange-icon"
                        : "blue-icon";

                return `

                    <div class="activity-item">

                        <div
                            class="activity-icon ${iconClass}"
                        >
                            ${escapeHtml(
                                initials
                            )}
                        </div>

                        <div class="activity-content">

                            <strong>
                                ${escapeHtml(
                                    name
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    description
                                )}
                            </span>

                            <small>
                                ${escapeHtml(
                                    time
                                )}
                            </small>

                        </div>

                    </div>

                `;

            })
            .join("");
}


// ----------------------------------------
// PROFILE DROPDOWN
// ----------------------------------------

function setupProfileDropdown() {

    const profileButton =
        document.querySelector(
            ".profile-button"
        );

    const profileDropdown =
        document.querySelector(
            ".profile-dropdown"
        );

    if (
        !profileButton ||
        !profileDropdown
    ) {
        return;
    }

    profileButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            profileDropdown.classList.toggle(
                "show"
            );

        }
    );

    document.addEventListener(
        "click",
        function (event) {

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

            }

        }
    );
}


// ----------------------------------------
// LOGOUT
// ----------------------------------------

function setupLogout() {

    const logoutButton =
        document.querySelector(
            ".logout-item"
        );

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener(
        "click",
        async function () {

            const confirmed =
                confirm(
                    "Are you sure you want to log out?"
                );

            if (!confirmed) {
                return;
            }

            try {

                const response =
                    await fetch(
                        "/api/auth/logout",
                        {
                            method: "POST",
                            credentials: "include"
                        }
                    );

                if (!response.ok) {

                    throw new Error(
                        "Logout failed."
                    );
                }

                window.location.href =
                    "login.html";

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
    );
}


// ----------------------------------------
// CREATE TASK BUTTON
// ----------------------------------------

function setupCreateTaskButton() {

    if (!taskSection) {
        return;
    }

    const button =
        taskSection.querySelector(
            ".section-header .primary-button"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        openCreateTaskModal
    );
}


// ----------------------------------------
// ADD EMPLOYEE BUTTON
// ----------------------------------------

function setupAddEmployeeButton() {

    if (!employeeSection) {
        return;
    }

    const button =
        employeeSection.querySelector(
            ".section-header .secondary-button"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        openAddEmployeeModal
    );
}


// ----------------------------------------
// VIEW ALL ACTIVITY
// ----------------------------------------

function setupViewAllActivity() {

    if (!activitySection) {
        return;
    }

    const link =
        activitySection.querySelector(
            ".view-all-link"
        );

    if (!link) {
        return;
    }

    link.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            await loadActivities();

            showDashboardMessage(
                "Showing the latest available activity.",
                "info"
            );

        }
    );
}


// ----------------------------------------
// ADD DASHBOARD MODAL STYLES
// ----------------------------------------

function addModalStyles() {

    if (
        document.getElementById(
            "dashboardModalStyles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "dashboardModalStyles";

    style.textContent = `

        .dashboard-modal-overlay {

            position: fixed;

            inset: 0;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 20px;

            background:
                rgba(15, 23, 42, 0.55);

            z-index: 9999;

        }


        .dashboard-modal {

            width: 100%;

            max-width: 620px;

            max-height: 90vh;

            overflow-y: auto;

            background: #ffffff;

            border-radius: 12px;

            box-shadow:
                0 20px 50px
                rgba(15, 23, 42, 0.2);

            border-top:
                4px solid #F59E0B;

        }


        .dashboard-modal-header {

            display: flex;

            justify-content:
                space-between;

            align-items:
                flex-start;

            gap: 20px;

            padding: 24px;

            border-bottom:
                1px solid #e5e7eb;

        }


        .dashboard-modal-header h2 {

            margin:
                0 0 6px;

            color:
                #1F2937;

        }


        .dashboard-modal-header p {

            margin: 0;

            color:
                #6b7280;

        }


        .modal-close-button {

            border: none;

            background:
                transparent;

            font-size:
                28px;

            line-height:
                1;

            color:
                #6b7280;

            cursor:
                pointer;

            padding:
                0 4px;

        }


        .modal-close-button:hover {

            color:
                #1F2937;

        }


        #createTaskForm,
        #addEmployeeForm,
        #manageEmployeeForm {

            padding:
                24px;

        }


        .modal-form-group {

            display:
                flex;

            flex-direction:
                column;

            gap:
                7px;

            margin-bottom:
                18px;

        }


        .modal-form-group label {

            font-weight:
                600;

            color:
                #374151;

        }


        .modal-form-group input,
        .modal-form-group select,
        .modal-form-group textarea {

            width:
                100%;

            box-sizing:
                border-box;

            padding:
                11px 12px;

            border:
                1px solid #d1d5db;

            border-radius:
                7px;

            background:
                #ffffff;

            color:
                #1f2937;

            font:
                inherit;

        }


        .modal-form-group input:focus,
        .modal-form-group select:focus,
        .modal-form-group textarea:focus {

            outline:
                none;

            border-color:
                #2864e6;

            box-shadow:
                0 0 0 3px
                rgba(40, 100, 230, 0.1);

        }


        .modal-form-group textarea {

            resize:
                vertical;

        }


        .modal-form-group small {

            color:
                #6b7280;

            font-size:
                12px;

        }


        .modal-form-row {

            display:
                grid;

            grid-template-columns:
                repeat(
                    2,
                    minmax(0, 1fr)
                );

            gap:
                16px;

        }


        .dashboard-modal-actions {

            display:
                flex;

            justify-content:
                flex-end;

            gap:
                10px;

            padding-top:
                8px;

        }


        .dashboard-message {

            position:
                fixed;

            top:
                20px;

            right:
                20px;

            max-width:
                380px;

            padding:
                14px 18px;

            border-radius:
                8px;

            font-size:
                14px;

            font-weight:
                600;

            box-shadow:
                0 8px 25px
                rgba(0, 0, 0, 0.12);

            z-index:
                10000;

        }


        .dashboard-message.success {

            background:
                #ecfdf5;

            color:
                #047857;

            border:
                1px solid #a7f3d0;

        }


        .dashboard-message.error {

            background:
                #fef2f2;

            color:
                #b91c1c;

            border:
                1px solid #fecaca;

        }


        .dashboard-message.info {

            background:
                #eff6ff;

            color:
                #1d4ed8;

            border:
                1px solid #bfdbfe;

        }


        .profile-dropdown.show {

            display:
                block;

        }


        /* ----------------------------------------
           TASK DATE/TIME
        ---------------------------------------- */

        .task-date-time {

            display:
                flex;

            flex-direction:
                column;

            gap:
                4px;

            min-width:
                150px;

        }


        .task-date-time strong {

            color:
                #374151;

            font-size:
                13px;

            font-weight:
                600;

            line-height:
                1.4;

        }


        .task-overdue-label {

            display:
                inline-block;

            width:
                fit-content;

            padding:
                2px 7px;

            border-radius:
                999px;

            background:
                #fef2f2;

            color:
                #b91c1c;

            font-size:
                11px;

            font-weight:
                700;

        }


        .not-completed {

            color:
                #9ca3af;

            font-size:
                14px;

        }


        @media (max-width: 600px) {

            .dashboard-modal-overlay {

                padding:
                    12px;

            }


            .dashboard-modal-header {

                padding:
                    18px;

            }


            #createTaskForm,
            #addEmployeeForm,
            #manageEmployeeForm {

                padding:
                    18px;

            }


            .modal-form-row {

                grid-template-columns:
                    1fr;

                gap:
                    0;

            }


            .dashboard-modal-actions {

                flex-direction:
                    column-reverse;

            }


            .dashboard-modal-actions button {

                width:
                    100%;

            }

        }

    `;

    document.head.appendChild(
        style
    );
}


// ----------------------------------------
// INITIALIZE DASHBOARD
// ----------------------------------------

async function initializeDashboard() {

    console.log(
        "Initializing Admin Dashboard..."
    );

    addModalStyles();

    const admin =
        await checkAdminSession();

    if (!admin) {
        return;
    }


    // ----------------------------------------
    // LOAD LATEST PROFILE FROM DATABASE
    // ----------------------------------------

    const latestProfile =
        await loadCurrentProfile();

    updateHeaderProfile(
        latestProfile || admin
    );

    setupProfileDropdown();

    setupLogout();

    setupTaskFilters();

    setupCreateTaskButton();

    setupAddEmployeeButton();

    setupViewAllActivity();


    // ----------------------------------------
    // LOAD ALL DASHBOARD DATA
    // ----------------------------------------

    await Promise.all([

        loadDashboardStats(),

        loadEmployees(),

        loadTasks(),

        loadActivities()

    ]);

    console.log(
        "Admin Dashboard loaded successfully."
    );
}


// ----------------------------------------
// START
// ----------------------------------------

initializeDashboard();