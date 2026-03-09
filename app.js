// ============================================================
//  PaperBank – Main App (Firebase + Role-based)
// ============================================================
import {
  onUserChange, logOut, currentUser, currentRole,
  getFolders, addFolder, deleteFolder,
  getResources, addResource, deleteResource,
  getComments, addComment, deleteComment
} from "./firebase-helpers.js";

// ── STATIC STRUCTURE ──────────────────────────────────────
const MEDIUMS = [
  { id: "tamil",   label: "Tamil",   icon: "fa-om",           desc: "Tamil medium resources for all grades",   cls: "tamil"   },
  { id: "english", label: "English", icon: "fa-globe",         desc: "English medium resources for all grades", cls: "english" },
  { id: "sinhala", label: "Sinhala", icon: "fa-dharmachakra",  desc: "Sinhala medium resources for all grades", cls: "sinhala" },
];

const GRADES = [
  { id: "grade6",  label: "Grade 6",  num: "6",   icon: "📚" },
  { id: "grade7",  label: "Grade 7",  num: "7",   icon: "📚" },
  { id: "grade8",  label: "Grade 8",  num: "8",   icon: "📚" },
  { id: "grade9",  label: "Grade 9",  num: "9",   icon: "📚" },
  { id: "grade10", label: "Grade 10", num: "10",  icon: "📚" },
  { id: "grade11", label: "Grade 11", num: "11",  icon: "📚" },
  { id: "gradeAL", label: "A / L",    num: "A/L", icon: "🎓" },
];

const CATEGORIES = [
  { id: "notes",  label: "Notes",         icon: "fa-sticky-note",        cls: "notes", desc: "Lesson notes & summaries" },
  { id: "books",  label: "Text Books",    icon: "fa-book-open",          cls: "books", desc: "Official textbooks" },
  { id: "model",  label: "Model Papers",  icon: "fa-file-alt",           cls: "model", desc: "Model exam papers" },
  { id: "past",   label: "Past Papers",   icon: "fa-file-signature",     cls: "past",  desc: "Previous year papers" },
  { id: "pres",   label: "Presentations", icon: "fa-chalkboard-teacher", cls: "pres",  desc: "Slide presentations" },
];

const FILE_ICONS = {
  pdf:   { icon: "fa-file-pdf",        label: "PDF" },
  doc:   { icon: "fa-file-word",       label: "DOC" },
  ppt:   { icon: "fa-file-powerpoint", label: "PPT" },
  video: { icon: "fa-play-circle",     label: "Video" },
  link:  { icon: "fa-link",            label: "Link" },
};

// ── STATE ─────────────────────────────────────────────────
let path = [];
let deleteTarget = null;
let commentResourceId = null;
let _user = null;
let _role = "visitor";

// ── BOOT ─────────────────────────────────────────────────
onUserChange((user, role) => {
  _user = user;
  _role = role;
  updateAuthUI();
  render();
});

window.addEventListener("DOMContentLoaded", () => {

  // icon picker
  document.querySelectorAll(".ip-opt").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".ip-opt").forEach(o => o.classList.remove("selected"));
      el.classList.add("selected");
    });
  });

  // modal background click
  document.querySelectorAll(".modal-overlay").forEach(el => {
    el.addEventListener("click", function(e) {
      if (e.target === this) closeModal(this.id);
    });
  });

});

// ── AUTH UI ───────────────────────────────────────────────
function updateAuthUI() {
  const btnLogin = document.getElementById("btn-login");
  const userMenu = document.getElementById("user-menu");
  const udName   = document.getElementById("ud-name");
  const udRole   = document.getElementById("ud-role");
  const udAdmin  = document.getElementById("ud-admin");
  const actionBar = document.getElementById("action-bar");
  const btnAddFolder = document.getElementById("btn-add-folder");
  const btnUploadResource = document.getElementById("btn-upload-resource");
  const btnAddFileTop = document.getElementById("btn-add-file-top");

  if (_user) {
    btnLogin.style.display = "none";
    userMenu.style.display = "";
    udName.textContent = _user.displayName || _user.email || "User";
    udRole.textContent = _role.charAt(0).toUpperCase() + _role.slice(1);
    udAdmin.style.display = (_role === "owner") ? "" : "none";
    
    // Show action bar for owner and editor
    if (_role === "owner" || _role === "editor") {
      actionBar.style.display = "flex";
      // Owner can create folders, editor can only upload resources
      btnAddFolder.style.display = (_role === "owner") ? "" : "none";
      btnUploadResource.style.display = "";
      // Show Add Resource button in file section
      btnAddFileTop.style.display = "";
    } else {
      actionBar.style.display = "none";
      btnAddFileTop.style.display = "none";
    }
  } else {
    btnLogin.style.display = "";
    userMenu.style.display = "none";
    actionBar.style.display = "none";
    btnAddFileTop.style.display = "none";
  }
}

window.doLogout = async () => {
  await logOut();
  location.reload();
};

window.toggleUserDropdown = () => {
  const dd = document.getElementById("user-dropdown");
  dd.style.display = dd.style.display === "none" ? "" : "none";
};

// ── NAVIGATION ────────────────────────────────────────────
window.goHome = () => {
  path = [];
  render();
};

window.selectMedium = (mediumId) => {
  const labels = {
    tamil: "Tamil Medium",
    english: "English Medium",
    sinhala: "Sinhala Medium"
  };

  path = [{ type: "medium", id: mediumId, label: labels[mediumId] }];

  render();

  document.getElementById("page-title-bar")?.scrollIntoView({
    behavior: "smooth"
  });
};

function navigateTo(step) {
  path.push(step);
  render();
}

function navigateToIndex(idx) {
  path = path.slice(0, idx + 1);
  render();
}

// ── RENDER MASTER ─────────────────────────────────────────
async function render() {

  const grid = document.getElementById("card-grid");
  const hero = document.getElementById("hero-section");
  const titleBar = document.getElementById("page-title-bar");
  const fileSection = document.getElementById("file-section");

  fileSection.style.display = "none";
  grid.style.display = "grid";

  renderBreadcrumb();

  if (path.length === 0) {

    hero.style.display = "";
    titleBar.style.display = "none";

    renderMediums(grid);

  } else {

    hero.style.display = "none";
    titleBar.style.display = "";

    const last = path[path.length - 1];
    setPageTitle(last);

    if (last.type === "medium") renderGrades(grid);
    else if (last.type === "grade") renderCategories(grid);
    else if (last.type === "category") await renderCustomFolders(grid);
    else if (last.type === "folder") await renderFiles();
  }
}

function setPageTitle(step) {

  const map = {
    medium: "Select Grade",
    grade: "Select Category",
    category: "Folders",
    folder: "Resources"
  };

  document.getElementById("page-title").textContent = step.label;
  document.getElementById("page-subtitle").textContent = map[step.type] || "";
}

// ── BREADCRUMB ────────────────────────────────────────────
function renderBreadcrumb() {

  const bc = document.getElementById("breadcrumb");
  bc.innerHTML = "";

  const home = document.createElement("span");
  home.className = "bc-item";
  home.innerHTML = '<i class="fas fa-home"></i> Home';
  home.onclick = goHome;

  bc.appendChild(home);

  path.forEach((step, i) => {

    const sep = document.createElement("span");
    sep.className = "bc-sep";
    sep.innerHTML = '<i class="fas fa-chevron-right"></i>';

    bc.appendChild(sep);

    const el = document.createElement("span");
    el.className = "bc-item";
    el.textContent = step.label;

    el.onclick = () => navigateToIndex(i);

    bc.appendChild(el);

  });
}

// ── MEDIUMS ───────────────────────────────────────────────
function renderMediums(grid) {

  grid.innerHTML = "";

  MEDIUMS.forEach(m => {

    const card = document.createElement("div");

    card.className = `card-medium ${m.cls}`;

    card.innerHTML = `
      <div class="cm-icon"><i class="fas ${m.icon}"></i></div>
      <div class="cm-title">${m.label} Medium</div>
      <div class="cm-desc">${m.desc}</div>
      <span class="cm-badge">7 Grades Available</span>
    `;

    card.onclick = () =>
      navigateTo({ type: "medium", id: m.id, label: m.label + " Medium" });

    grid.appendChild(card);

  });

}

// ── GRADES ────────────────────────────────────────────────
function renderGrades(grid) {

  grid.innerHTML = "";

  GRADES.forEach(g => {

    const card = document.createElement("div");

    card.className = "card-grade";

    card.innerHTML = `
      <div class="cg-icon">${g.icon}</div>
      <div class="cg-num">${g.num}</div>
      <div class="cg-label">${g.label}</div>
    `;

    card.onclick = () =>
      navigateTo({ type: "grade", id: g.id, label: g.label });

    grid.appendChild(card);

  });

}

// ── CATEGORIES ────────────────────────────────────────────
function renderCategories(grid) {

  grid.innerHTML = "";

  CATEGORIES.forEach(c => {

    const card = document.createElement("div");

    card.className = "card-category";

    card.innerHTML = `
      <div class="cat-icon ${c.cls}">
        <i class="fas ${c.icon}"></i>
      </div>
      <div class="cat-name">${c.label}</div>
      <div class="cat-desc">${c.desc}</div>
    `;

    card.onclick = () =>
      navigateTo({ type: "category", id: c.id, label: c.label });

    grid.appendChild(card);

  });

}

// ── ESCAPE HTML FIX ───────────────────────────────────────
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}
