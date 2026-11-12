const CATEGORIES = ["electrician", "plumber", "carpenter", "painter", "mason", "mechanic", "cleaner", "gardener", "cook", "other"];
const state = { token: localStorage.getItem("token"), user: null };

const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch("/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: "Bearer " + state.token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 3200);
}

const guard = (fn) => async (...args) => {
  try { await fn(...args); } catch (e) { toast(e.message, true); }
};

/* ---------- navigation ---------- */
function show(view) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "view-" + view));
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  const loaders = { board: loadBoard, mine: loadMine, pool: loadPool };
  if (loaders[view]) guard(loaders[view])();
}

function refreshNav() {
  const role = state.user?.role;
  document.querySelectorAll("#nav button").forEach((b) => {
    const needsRole = b.dataset.role;
    const needsAuth = b.hasAttribute("data-auth");
    b.hidden = (needsRole && needsRole !== role) || (needsAuth && !state.user);
  });
  $("#who").textContent = state.user ? `${state.user.name} (${state.user.role})` : "Not logged in";
  $("#account-out").hidden = !!state.user;
  $("#account-in").hidden = !state.user;
  if (state.user) {
    const u = state.user;
    $("#profile").innerHTML = `<div class="info"><h3>${esc(u.name)}</h3>
      <p>${esc(u.email)}${u.phone ? " · " + esc(u.phone) : ""}</p>
      <p>${esc(cap(u.role))}${u.city ? " in " + esc(cap(u.city)) : ""}</p>
      ${u.role === "worker" ? `<div class="tags"><span class="tag">${esc(cap(u.category))}</span>
        ${(u.skills || []).map((s) => `<span class="tag">${esc(s)}</span>`).join("")}
        <span class="tag">₹${esc(u.ratePerHour)}/hr</span></div>` : ""}</div>`;
  }
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  if (token) localStorage.setItem("token", token); else localStorage.removeItem("token");
  refreshNav();
}

/* ---------- rendering ---------- */
function jobCard(job, actions = "", extra = "") {
  return `<div class="card">
    <div class="info">
      <h3>${esc(job.title)}</h3>
      <p>${esc(job.description)}</p>
      <div class="tags">
        <span class="tag">${esc(cap(job.category))}</span>
        <span class="tag">${esc(cap(job.city))}</span>
        <span class="tag">Up to ₹${esc(job.budget)}/hr</span>
        <span class="tag ${esc(job.status)}">${esc(cap(job.status))}</span>
      </div>
      ${job.assignedTo ? `<p>Assigned to ${esc(job.assignedTo.name)}</p>` : ""}
    </div>
    <div>${actions}</div>${extra}
  </div>`;
}

const empty = (msg) => `<p class="empty">${esc(msg)}</p>`;

async function jobAction(id, action, workerId) {
  await api(`/jobs/${id}/${action}`, { method: "POST", body: workerId ? { workerId } : undefined });
  toast("Done");
  show(document.querySelector(".view:not([hidden])").id.replace("view-", ""));
}
window.jobAction = guard(jobAction);

/* ---------- data views ---------- */
async function loadBoard() {
  const f = new FormData($("#board-form"));
  const q = new URLSearchParams({ category: f.get("category") || "", city: f.get("city") || "" });
  const jobs = await api("/jobs?" + q);
  $("#board-list").innerHTML = jobs.length
    ? jobs.map((j) => {
        const applied = j.applicants.some((a) => a._id === state.user._id);
        return jobCard(j, applied
          ? `<span class="tag">Applied</span>`
          : `<button class="small" onclick="jobAction('${j._id}','apply')">Apply</button>`);
      }).join("")
    : empty("No open jobs match right now.");
}

async function loadMine() {
  const jobs = await api("/jobs/mine");
  const isCustomer = state.user.role === "customer";
  $("#mine-list").innerHTML = jobs.length
    ? jobs.map((j) => {
        let actions = "", extra = "";
        if (isCustomer && j.status === "assigned") {
          actions = `<button class="small" onclick="jobAction('${j._id}','complete')">Mark complete</button>`;
        }
        if (isCustomer && j.status === "open" && j.applicants.length) {
          extra = `<div class="applicants">${j.applicants.map((a) => `<div>
            <span>${esc(a.name)} · ${esc(cap(a.category))} · ₹${esc(a.ratePerHour)}/hr</span>
            <button class="small" onclick="jobAction('${j._id}','assign','${a._id}')">Assign</button></div>`).join("")}</div>`;
        }
        if (!isCustomer && j.status === "assigned" && j.assignedTo?._id === state.user._id) {
          actions = j.sharedToPool
            ? `<span class="tag">Shared with co-op</span>`
            : `<button class="small" onclick="jobAction('${j._id}','share')">Share with co-op</button>`;
        }
        return jobCard(j, actions, extra);
      }).join("")
    : empty(isCustomer ? "You have not posted any jobs yet." : "No applications or assignments yet.");
}

async function loadPool() {
  const jobs = await api("/jobs/shared");
  $("#pool-list").innerHTML = jobs.length
    ? jobs.map((j) => jobCard(j, `<button class="small" onclick="jobAction('${j._id}','claim')">Claim job</button>`)).join("")
    : empty("Nothing in the pool right now.");
}

/* ---------- forms ---------- */
$("#find-form").addEventListener("submit", guard(async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const q = new URLSearchParams(Object.fromEntries(f));
  const ranked = await api("/workers/match?" + q);
  $("#find-results").innerHTML = ranked.length
    ? ranked.map(({ worker: w, score }) => `<div class="card">
        <div class="info"><h3>${esc(w.name)}</h3>
          <p>${esc(w.bio)}</p>
          <div class="tags"><span class="tag">${esc(cap(w.category))}</span>
            <span class="tag">${esc(cap(w.city))}</span><span class="tag">₹${esc(w.ratePerHour)}/hr</span>
            ${(w.skills || []).map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>
          ${state.user ? `<p>${esc(w.phone || "")}</p>` : `<p>Log in to see contact details.</p>`}
        </div>
        <div class="score"><b>${score}</b><span>/100 match</span><div class="bar"><i style="width:${score}%"></i></div></div>
      </div>`).join("")
    : empty("No workers found. Try a different trade or city.");
}));

$("#board-form").addEventListener("submit", guard((e) => { e.preventDefault(); return loadBoard(); }));

$("#post-form").addEventListener("submit", guard(async (e) => {
  e.preventDefault();
  await api("/jobs", { method: "POST", body: Object.fromEntries(new FormData(e.target)) });
  e.target.reset();
  toast("Job posted");
  show("mine");
}));

$("#login-form").addEventListener("submit", guard(async (e) => {
  e.preventDefault();
  const { token, user } = await api("/auth/login", { method: "POST", body: Object.fromEntries(new FormData(e.target)) });
  setSession(token, user);
  toast("Welcome back, " + user.name);
  show("find");
}));

$("#register-form").addEventListener("submit", guard(async (e) => {
  e.preventDefault();
  const { token, user } = await api("/auth/register", { method: "POST", body: Object.fromEntries(new FormData(e.target)) });
  setSession(token, user);
  toast("Account created");
  show(user.role === "worker" ? "board" : "post");
}));

$("#reg-role").addEventListener("change", (e) => ($("#worker-fields").hidden = e.target.value !== "worker"));
$("#logout").addEventListener("click", () => { setSession(null, null); toast("Logged out"); show("find"); });
$("#nav").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.view); });

/* ---------- init ---------- */
document.querySelectorAll(".cat-select").forEach((sel) => {
  const any = sel.classList.contains("cat-any") ? `<option value="">Any trade</option>` : "";
  sel.innerHTML = any + CATEGORIES.map((c) => `<option value="${c}">${cap(c)}</option>`).join("");
});

(async function init() {
  if (state.token) {
    try { state.user = (await api("/auth/me")).user; } catch { setSession(null, null); }
  }
  refreshNav();
  show("find");
})();
