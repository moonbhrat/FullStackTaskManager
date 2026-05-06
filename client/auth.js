// auth.js — handles login and signup pages
// keeps it simple: JWT in localStorage, redirect after success

// figure out which page we're on
const isLoginPage = document.getElementById("loginForm") !== null;
const isSignupPage = document.getElementById("signupForm") !== null;

// if user is already logged in, kick them to the dashboard
const existingToken = localStorage.getItem("taskyfy_token");
if (existingToken) {
  window.location.href = "index.html";
}

// -------------------------------------------------------
// THEME — same logic as main app
// -------------------------------------------------------
const htmlEl = document.documentElement;
const themeBtn = document.getElementById("themeToggleBtn");

function initTheme() {
  const saved = localStorage.getItem("taskyfy_theme") || "light";
  htmlEl.setAttribute("data-theme", saved);
  themeBtn.textContent = saved === "dark" ? "☀️" : "🌙";
}

themeBtn.addEventListener("click", () => {
  const curr = htmlEl.getAttribute("data-theme");
  const next = curr === "dark" ? "light" : "dark";
  htmlEl.setAttribute("data-theme", next);
  localStorage.setItem("taskyfy_theme", next);
  themeBtn.textContent = next === "dark" ? "☀️" : "🌙";
});

initTheme();

// -------------------------------------------------------
// SHOW/HIDE PASSWORD toggle
// -------------------------------------------------------
document.querySelectorAll(".toggle-pw").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;

    input.type = input.type === "password" ? "text" : "password";
    btn.textContent = input.type === "password" ? "👁" : "🙈";
  });
});

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

function showAlert(alertId, msg, isError = true) {
  const el = document.getElementById(alertId);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert ${isError ? "alert-error" : "alert-success"}`;
  el.classList.remove("hidden");
}

function hideAlert(alertId) {
  const el = document.getElementById(alertId);
  if (el) el.classList.add("hidden");
}

function setLoading(btnId, textId, loading, defaultText, loadingText) {
  const btn = document.getElementById(btnId);
  const txt = document.getElementById(textId);
  if (!btn || !txt) return;
  btn.disabled = loading;
  txt.textContent = loading ? loadingText : defaultText;
}

// save auth data and head to dashboard
function saveAndRedirect(token, user) {
  localStorage.setItem("taskyfy_token", token);
  localStorage.setItem("taskyfy_user", JSON.stringify(user));
  window.location.href = "index.html";
}

// -------------------------------------------------------
// CLIENT-SIDE VALIDATION
// -------------------------------------------------------

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function clearErrors(...ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// -------------------------------------------------------
// PASSWORD STRENGTH (signup only)
// -------------------------------------------------------

if (isSignupPage) {
  const pwInput = document.getElementById("signupPassword");

  // inject strength bar after the input wrapper
  const strengthBar = document.createElement("div");
  strengthBar.className = "pw-strength";
  strengthBar.innerHTML = '<div class="pw-strength-bar" id="strengthBar"></div>';

  const strengthLabel = document.createElement("div");
  strengthLabel.className = "pw-strength-label";
  strengthLabel.id = "strengthLabel";

  pwInput.closest(".form-group").appendChild(strengthBar);
  pwInput.closest(".form-group").appendChild(strengthLabel);

  pwInput.addEventListener("input", () => {
    const val = pwInput.value;
    const bar = document.getElementById("strengthBar");
    const label = document.getElementById("strengthLabel");
    if (!val) {
      bar.className = "pw-strength-bar";
      label.textContent = "";
      return;
    }

    // very basic strength check — good enough for this project
    let strength = "weak";
    if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) {
      strength = "strong";
    } else if (val.length >= 6) {
      strength = "medium";
    }

    bar.className = `pw-strength-bar ${strength}`;
    label.textContent = strength.charAt(0).toUpperCase() + strength.slice(1) + " password";
  });
}

// -------------------------------------------------------
// LOGIN FORM
// -------------------------------------------------------

if (isLoginPage) {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("loginAlert");
    clearErrors("emailErr", "pwErr");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    // client-side checks before hitting the server
    let hasError = false;
    if (!email) { setError("emailErr", "Email is required"); hasError = true; }
    else if (!validateEmail(email)) { setError("emailErr", "Enter a valid email"); hasError = true; }
    if (!password) { setError("pwErr", "Password is required"); hasError = true; }
    if (hasError) return;

    setLoading("loginBtn", "loginBtnText", true, "Log In", "Logging in...");

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        showAlert("loginAlert", json.message || "Login failed");
        return;
      }

      saveAndRedirect(json.token, json.user);
    } catch (err) {
      console.error("Login fetch error:", err.message);
      showAlert("loginAlert", "Network error — is the server running?");
    } finally {
      setLoading("loginBtn", "loginBtnText", false, "Log In", "Logging in...");
    }
  });
}

// -------------------------------------------------------
// SIGNUP FORM
// -------------------------------------------------------

if (isSignupPage) {
  const signupForm = document.getElementById("signupForm");

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("signupAlert");
    clearErrors("nameErr", "emailErr", "pwErr", "confirmPwErr");

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPw = document.getElementById("confirmPassword").value;

    // validate before sending
    let hasError = false;
    if (!name || name.length < 2) { setError("nameErr", "Name must be at least 2 characters"); hasError = true; }
    if (!email) { setError("emailErr", "Email is required"); hasError = true; }
    else if (!validateEmail(email)) { setError("emailErr", "Enter a valid email address"); hasError = true; }
    if (!password || password.length < 6) { setError("pwErr", "Password must be at least 6 characters"); hasError = true; }
    if (password !== confirmPw) { setError("confirmPwErr", "Passwords don't match"); hasError = true; }
    if (hasError) return;

    setLoading("signupBtn", "signupBtnText", true, "Create Account", "Creating account...");

    try {
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        showAlert("signupAlert", json.message || "Registration failed");
        return;
      }

      // account created — auto login, go to dashboard
      saveAndRedirect(json.token, json.user);
    } catch (err) {
      console.error("Signup fetch error:", err.message);
      showAlert("signupAlert", "Network error — is the server running?");
    } finally {
      setLoading("signupBtn", "signupBtnText", false, "Create Account", "Creating account...");
    }
  });
}
