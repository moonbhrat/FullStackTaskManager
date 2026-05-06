// Taskyfy — main dashboard JS
// all API calls now include the JWT token in Authorization header

const API_BASE = "/tasks";

// -------------------------------------------------------
// AUTH GUARD — redirect to login if not logged in
// -------------------------------------------------------
const token = localStorage.getItem("taskyfy_token");
const storedUser = localStorage.getItem("taskyfy_user");

if (!token || !storedUser) {
  // not logged in — boot them to login page
  window.location.href = "login.html";
}

// parse stored user — show name in navbar
let currentUser = null;
try {
  currentUser = JSON.parse(storedUser);
} catch (_) {
  // corrupted storage — just log out
  localStorage.clear();
  window.location.href = "login.html";
}

// -------------------------------------------------------
// SHARED FETCH HELPER — always attach Bearer token
// -------------------------------------------------------
async function apiFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });

  // if server says 401, token is expired/invalid — force re-login
  if (res.status === 401) {
    localStorage.removeItem("taskyfy_token");
    localStorage.removeItem("taskyfy_user");
    window.location.href = "login.html";
    return null;
  }

  return res;
}

// -------------------------------------------------------
// STATE
// -------------------------------------------------------
let allTasks = [];
let currentFilter = "all";

// -------------------------------------------------------
// DOM REFS
// -------------------------------------------------------
const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitle");
const taskDescInput = document.getElementById("taskDesc");
const taskList = document.getElementById("taskList");
const loader = document.getElementById("loader");
const emptyState = document.getElementById("emptyState");
const submitBtn = document.getElementById("submitBtn");
const submitBtnText = document.getElementById("submitBtnText");
const titleError = document.getElementById("titleError");

// stats
const statTotal = document.getElementById("statTotal");
const statDone = document.getElementById("statDone");
const statPending = document.getElementById("statPending");

// theme
const themeToggleBtn = document.getElementById("themeToggleBtn");
const htmlEl = document.documentElement;

// modal
const editModal = document.getElementById("editModal");
const editTitle = document.getElementById("editTitle");
const editDesc = document.getElementById("editDesc");
const editTaskId = document.getElementById("editTaskId");
const editTitleError = document.getElementById("editTitleError");
const saveEditBtn = document.getElementById("saveEditBtn");
const saveEditBtnText = document.getElementById("saveEditBtnText");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");

// navbar user info
const userAvatar = document.getElementById("userAvatar");
const userNameEl = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");

// toast
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");
let toastTimer = null;

// -------------------------------------------------------
// POPULATE USER INFO IN NAVBAR
// -------------------------------------------------------
function initUserInfo() {
  if (!currentUser) return;
  userNameEl.textContent = currentUser.name;
  // show first letter of name as avatar
  userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
}

// -------------------------------------------------------
// LOGOUT
// -------------------------------------------------------
logoutBtn.addEventListener("click", () => {
  // wipe auth data and send back to login
  localStorage.removeItem("taskyfy_token");
  localStorage.removeItem("taskyfy_user");
  window.location.href = "login.html";
});

// -------------------------------------------------------
// THEME
// -------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem("taskyfy_theme") || "light";
  htmlEl.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
  themeToggleBtn.innerHTML = theme === "dark"
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}

themeToggleBtn.addEventListener("click", () => {
  const curr = htmlEl.getAttribute("data-theme");
  const next = curr === "dark" ? "light" : "dark";
  htmlEl.setAttribute("data-theme", next);
  localStorage.setItem("taskyfy_theme", next);
  updateThemeIcon(next);
});

// -------------------------------------------------------
// TOAST
// -------------------------------------------------------
function showToast(msg, duration = 2800) {
  toastMsg.textContent = msg;
  toast.classList.remove("hidden");
  void toast.offsetWidth; // force reflow so transition fires
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, duration);
}

// -------------------------------------------------------
// API CALLS
// -------------------------------------------------------

async function fetchTasks() {
  showLoader(true);
  try {
    const res = await apiFetch(API_BASE);
    if (!res) return; // 401 redirect already handled in apiFetch

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to load tasks");

    allTasks = json.data;
    renderTasks();
    updateStats();
  } catch (err) {
    console.error("fetchTasks error:", err.message);
    showToast("⚠️ Could not load tasks. Is the server running?");
  } finally {
    showLoader(false);
  }
}

async function createTask(title, description) {
  try {
    setSubmitLoading(true);
    const res = await apiFetch(API_BASE, {
      method: "POST",
      body: JSON.stringify({ title, description }),
    });
    if (!res) return;

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Could not create task");

    allTasks.unshift(json.data);
    renderTasks();
    updateStats();
    showToast("✅ Task added!");
    taskForm.reset();
    titleError.textContent = "";
  } catch (err) {
    console.error("createTask error:", err.message);
    showToast("❌ " + err.message);
  } finally {
    setSubmitLoading(false);
  }
}

async function toggleComplete(id) {
  const task = allTasks.find((t) => t._id === id);
  if (!task) return;

  try {
    const res = await apiFetch(`${API_BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ completed: !task.completed }),
    });
    if (!res) return;

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Update failed");

    // update local state — no need for full re-fetch
    const idx = allTasks.findIndex((t) => t._id === id);
    if (idx !== -1) allTasks[idx] = json.data;

    renderTasks();
    updateStats();
    showToast(json.data.completed ? "✅ Marked as done!" : "🔄 Marked as pending");
  } catch (err) {
    console.error("toggleComplete error:", err.message);
    showToast("❌ " + err.message);
  }
}

async function deleteTask(id) {
  if (!confirm("Delete this task? This can't be undone.")) return;

  try {
    const res = await apiFetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!res) return;

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Delete failed");

    allTasks = allTasks.filter((t) => t._id !== id);
    renderTasks();
    updateStats();
    showToast("🗑️ Task deleted");
  } catch (err) {
    console.error("deleteTask error:", err.message);
    showToast("❌ " + err.message);
  }
}

async function saveEdit() {
  const id = editTaskId.value;
  const title = editTitle.value.trim();
  const description = editDesc.value.trim();

  if (!title) {
    editTitleError.textContent = "Title is required";
    editTitle.focus();
    return;
  }
  editTitleError.textContent = "";

  try {
    saveEditBtnText.textContent = "Saving...";
    saveEditBtn.disabled = true;

    const res = await apiFetch(`${API_BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, description }),
    });
    if (!res) return;

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Edit failed");

    const idx = allTasks.findIndex((t) => t._id === id);
    if (idx !== -1) allTasks[idx] = json.data;

    closeModal();
    renderTasks();
    showToast("✏️ Task updated!");
  } catch (err) {
    console.error("saveEdit error:", err.message);
    showToast("❌ " + err.message);
  } finally {
    saveEditBtnText.textContent = "Save Changes";
    saveEditBtn.disabled = false;
  }
}

// -------------------------------------------------------
// RENDER
// -------------------------------------------------------

function renderTasks() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  filtered.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-card${task.completed ? " completed" : ""}`;
    li.dataset.id = task._id;

    const createdDate = new Date(task.createdAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });

    li.innerHTML = `
      <input
        type="checkbox"
        class="task-check"
        ${task.completed ? "checked" : ""}
        title="${task.completed ? "Mark as pending" : "Mark as done"}"
        data-id="${task._id}"
      />
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ""}
        <div class="task-meta">Added on ${createdDate}</div>
        ${task.completed ? '<span class="badge-done">Done</span>' : ""}
      </div>
      <div class="task-actions">
        <button class="btn btn-edit edit-btn" data-id="${task._id}" title="Edit task">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn btn-danger delete-btn" data-id="${task._id}" title="Delete task">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    taskList.appendChild(li);
  });
}

function getFilteredTasks() {
  if (currentFilter === "completed") return allTasks.filter((t) => t.completed);
  if (currentFilter === "pending") return allTasks.filter((t) => !t.completed);
  return allTasks;
}

function updateStats() {
  const total = allTasks.length;
  const done = allTasks.filter((t) => t.completed).length;
  statTotal.textContent = total;
  statDone.textContent = done;
  statPending.textContent = total - done;
}

// -------------------------------------------------------
// MODAL
// -------------------------------------------------------

function openEditModal(id) {
  const task = allTasks.find((t) => t._id === id);
  if (!task) return;

  editTaskId.value = task._id;
  editTitle.value = task.title;
  editDesc.value = task.description || "";
  editTitleError.textContent = "";
  editModal.classList.remove("hidden");
  editTitle.focus();
}

function closeModal() {
  editModal.classList.add("hidden");
}

editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeModal();
});
modalCloseBtn.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);
saveEditBtn.addEventListener("click", saveEdit);

// -------------------------------------------------------
// FORM SUBMIT
// -------------------------------------------------------

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  const description = taskDescInput.value.trim();

  // handle edge case if user submits empty task
  if (!title) {
    titleError.textContent = "Please enter a task title";
    taskTitleInput.focus();
    return;
  }
  titleError.textContent = "";
  await createTask(title, description);
});

taskTitleInput.addEventListener("input", () => {
  if (taskTitleInput.value.trim()) titleError.textContent = "";
});

// -------------------------------------------------------
// EVENT DELEGATION — task list clicks
// -------------------------------------------------------

taskList.addEventListener("click", (e) => {
  if (e.target.classList.contains("task-check")) {
    toggleComplete(e.target.dataset.id);
    return;
  }
  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) { openEditModal(editBtn.dataset.id); return; }

  const deleteBtn = e.target.closest(".delete-btn");
  if (deleteBtn) { deleteTask(deleteBtn.dataset.id); return; }
});

// -------------------------------------------------------
// FILTER TABS
// -------------------------------------------------------

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

// -------------------------------------------------------
// UTILITIES
// -------------------------------------------------------

function showLoader(show) {
  if (show) {
    loader.classList.remove("hidden");
    taskList.innerHTML = "";
    emptyState.classList.add("hidden");
  } else {
    loader.classList.add("hidden");
  }
}

function setSubmitLoading(loading) {
  submitBtn.disabled = loading;
  submitBtnText.textContent = loading ? "Adding..." : "Add Task";
}

// quick fix for UI refresh — always escape before DOM insertion
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// -------------------------------------------------------
// INIT
// -------------------------------------------------------
initTheme();
initUserInfo();
fetchTasks();
