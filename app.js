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
let path        = [];
let deleteTarget = null;
let commentResourceId = null;
let _user = null;
let _role = "visitor";

// ── BOOT: wait for auth ───────────────────────────────────
onUserChange((user, role) => {
  _user = user;
  _role = role;
  updateAuthUI();
  render();
});

// ── AUTH UI ───────────────────────────────────────────────
function updateAuthUI() {
  const btnLogin  = document.getElementById("btn-login");
  const userMenu  = document.getElementById("user-menu");
  const udName    = document.getElementById("ud-name");
  const udRole    = document.getElementById("ud-role");
  const udAdmin   = document.getElementById("ud-admin");

  if (_user) {
    btnLogin.style.display  = "none";
    userMenu.style.display  = "";
    udName.textContent      = _user.displayName || _user.email || "User";
    udRole.textContent      = _role.charAt(0).toUpperCase() + _role.slice(1);
    udAdmin.style.display   = (_role === "owner") ? "" : "none";
  } else {
    btnLogin.style.display  = "";
    userMenu.style.display  = "none";
  }
}

window.doLogout = async () => {
  await logOut();
  window.location.reload();
};

window.toggleUserDropdown = () => {
  const dd = document.getElementById("user-dropdown");
  dd.style.display = dd.style.display === "none" ? "" : "none";
};

// Close dropdown on outside click
document.addEventListener("click", (e) => {
  const menu = document.getElementById("user-menu");
  if (menu && !menu.contains(e.target)) {
    const dd = document.getElementById("user-dropdown");
    if (dd) dd.style.display = "none";
  }
});

// ── NAVIGATION ────────────────────────────────────────────
// Home: show medium selection page (visible to all)
window.goHome = () => { path = []; render(); };

// Quick navigate to a category (from hero section)
window.quickNavigate = (categoryId) => {
  // Navigate: Medium Selection first (user must pick medium)
  // For now, we show medium selection - user picks medium first
  // This will open the medium selection, then category
  alert("Please select a medium first (Tamil/English/Sinhala) to browse " + categoryId);
};

// Select a medium (from medium section) - shows grades
window.selectMedium = (mediumId) => {
  const labels = { tamil: "Tamil Medium", english: "English Medium", sinhala: "Sinhala Medium" };
  path = [{ type: "medium", id: mediumId, label: labels[mediumId] }];
  render();
  // Scroll to main content area
  document.getElementById("page-title-bar")?.scrollIntoView({ behavior: "smooth" });
};

// ICT quick access
window.selectICT = () => {
  // For ICT, we can default to English medium, Grade 11 as example
  // Or show a dialog to select grade
  // For now, navigate to English -> Grade 11 -> Past Papers (common for ICT)
  path = [
    { type: "medium", id: "english", label: "English Medium" },
    { type: "grade", id: "gradeAL", label: "A / L" }
  ];
  render();
  document.querySelector(".main-content")?.scrollIntoView({ behavior: "smooth" });
};

function navigateTo(step) { path.push(step); render(); }

function navigateToIndex(idx) { path = path.slice(0, idx + 1); render(); }

// ── RENDER MASTER ─────────────────────────────────────────
async function render() {
  const grid        = document.getElementById("card-grid");
  const fileSection = document.getElementById("file-section");
  const heroSection = document.getElementById("hero-section");
  const titleBar    = document.getElementById("page-title-bar");
  const actionBar   = document.getElementById("action-bar");

  fileSection.style.display = "none";
  grid.style.display        = "grid";
  actionBar.style.display   = "none";

  renderBreadcrumb();

  if (path.length === 0) {
    heroSection.style.display = "";
    titleBar.style.display    = "none";
    renderMediums(grid);
  } else {
    heroSection.style.display = "none";
    titleBar.style.display    = "";
    const last = path[path.length - 1];
    setPageTitle(last);

    if (last.type === "medium")   renderGrades(grid);
    else if (last.type === "grade")    renderCategories(grid);
    else if (last.type === "category") await renderCustomFolders(grid);
    else if (last.type === "folder")   await renderFiles();
  }
}

function setPageTitle(step) {
  const map = { medium: "Select Grade", grade: "Select Category", category: "Folders", folder: "Resources" };
  document.getElementById("page-title").textContent    = step.label;
  document.getElementById("page-subtitle").textContent = map[step.type] || "";
}

// ── BREADCRUMB ────────────────────────────────────────────
function renderBreadcrumb() {
  const bc = document.getElementById("breadcrumb");
  bc.innerHTML = "";

  const homeEl = document.createElement("span");
  homeEl.className = "bc-item" + (path.length === 0 ? " active" : "");
  homeEl.innerHTML = '<i class="fas fa-home"></i> Home';
  if (path.length > 0) homeEl.onclick = () => goHome();
  bc.appendChild(homeEl);

  path.forEach((step, i) => {
    const sep = document.createElement("span");
    sep.className = "bc-sep";
    sep.innerHTML = '<i class="fas fa-chevron-right"></i>';
    bc.appendChild(sep);

    const el = document.createElement("span");
    const isLast = i === path.length - 1;
    el.className = "bc-item" + (isLast ? " active" : "");
    el.textContent = step.label;
    if (!isLast) el.onclick = () => navigateToIndex(i);
    bc.appendChild(el);
  });
}

// ── LEVEL 0: MEDIUMS ──────────────────────────────────────
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
    card.onclick = () => navigateTo({ type: "medium", id: m.id, label: m.label + " Medium" });
    grid.appendChild(card);
  });
}

// ── LEVEL 1: GRADES ───────────────────────────────────────
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
    card.onclick = () => navigateTo({ type: "grade", id: g.id, label: g.label });
    grid.appendChild(card);
  });
}

// ── LEVEL 2: CATEGORIES ───────────────────────────────────
function renderCategories(grid) {
  grid.innerHTML = "";
  CATEGORIES.forEach(c => {
    const card = document.createElement("div");
    card.className = "card-category";
    card.innerHTML = `
      <div class="cat-icon ${c.cls}"><i class="fas ${c.icon}"></i></div>
      <div class="cat-name">${c.label}</div>
      <div class="cat-desc">${c.desc}</div>
    `;
    card.onclick = () => navigateTo({ type: "category", id: c.id, label: c.label });
    grid.appendChild(card);
  });
}

// ── LEVEL 3: CUSTOM FOLDERS ───────────────────────────────
async function renderCustomFolders(grid) {
  const pathKey = buildPathKey();
  grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  const folders = await getFolders(pathKey);
  grid.innerHTML = "";

  folders.forEach(f => {
    const card = document.createElement("div");
    card.className = "card-folder";
    card.innerHTML = `
      <div class="cf-icon"><i class="fas ${f.icon || "fa-folder"}"></i></div>
      <div class="cf-info">
        <div class="cf-name">${escHtml(f.name)}</div>
        <div class="cf-meta">Tap to open</div>
      </div>
      ${_role === "owner" ? `<button class="cf-del" title="Delete folder"><i class="fas fa-trash"></i></button>` : ""}
    `;
    if (_role === "owner") {
      card.querySelector(".cf-del").onclick = (e) => {
        e.stopPropagation();
        openDeleteModal("folder", f.id, `Delete folder "<b>${escHtml(f.name)}</b>"? All resources inside will also be removed.`);
      };
    }
    card.onclick = () => navigateTo({ type: "folder", id: f.id, label: f.name });
    grid.appendChild(card);
  });

  // Owner: show "New Folder" button
  const actionBar = document.getElementById("action-bar");
  const btnAddFolder = document.getElementById("btn-add-folder");
  if (_role === "owner") {
    actionBar.style.display   = "";
    btnAddFolder.style.display = "";
  }
}

// ── LEVEL 4: FILES ────────────────────────────────────────
async function renderFiles() {
  const grid        = document.getElementById("card-grid");
  const fileSection = document.getElementById("file-section");
  const fileList    = document.getElementById("file-list");
  const fileEmpty   = document.getElementById("file-empty");
  const actionBar   = document.getElementById("action-bar");
  const btnUpload   = document.getElementById("btn-upload-resource");
  const btnAddTop   = document.getElementById("btn-add-file-top");

  grid.style.display        = "none";
  fileSection.style.display = "";

  // Show upload button for editor/owner
  if (_role === "editor" || _role === "owner") {
    actionBar.style.display = "";
    btnUpload.style.display = "";
    btnAddTop.style.display = "";
  }

  const pathKey = buildPathKey();
  fileList.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  const files = await getResources(pathKey);
  fileList.innerHTML = "";

  if (files.length === 0) {
    fileEmpty.style.display = "";
    fileList.style.display  = "none";
  } else {
    fileEmpty.style.display = "none";
    fileList.style.display  = "";

    files.forEach(f => {
      const meta = FILE_ICONS[f.type] || FILE_ICONS.link;
      const item = document.createElement("div");
      item.className = "file-item";
      item.innerHTML = `
        <div class="fi-icon ${f.type}"><i class="fas ${meta.icon}"></i></div>
        <div class="fi-info">
          <div class="fi-title">${escHtml(f.title)}</div>
          <div class="fi-desc">${f.desc ? escHtml(f.desc) : meta.label + " · Google Drive"}</div>
        </div>
        <div class="fi-actions">
          ${_user
            ? `<a class="btn-open" href="${escHtml(f.url)}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Download</a>`
            : `<button class="btn-open" onclick="showLoginPrompt()"><i class="fas fa-lock"></i> Sign in to Download</button>`
          }
          <button class="btn-comment" onclick="openComments('${f.id}')"><i class="fas fa-comment"></i></button>
          ${_role === "owner" ? `<button class="btn-del-file" onclick="openDeleteFileModal('${f.id}', '${escHtml(f.title)}')"><i class="fas fa-trash"></i></button>` : ""}
        </div>
      `;
      fileList.appendChild(item);
    });
  }
}

// ── PATH KEY ──────────────────────────────────────────────
function buildPathKey() {
  return path.map(s => s.id).join("_");
}

// ── ADD FOLDER ────────────────────────────────────────────
window.openAddFolderModal = () => {
  document.getElementById("input-folder-name").value = "";
  document.querySelectorAll(".ip-opt").forEach(el => el.classList.remove("selected"));
  document.querySelector('.ip-opt[data-icon="fa-folder"]').classList.add("selected");
  showModal("modal-folder");
};

document.querySelectorAll(".ip-opt").forEach(el => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".ip-opt").forEach(o => o.classList.remove("selected"));
    el.classList.add("selected");
  });
});

window.createFolder = async () => {
  if (_role !== "owner") { showToast("Only the owner can create folders.", "error"); return; }
  const name = document.getElementById("input-folder-name").value.trim();
  if (!name) { showToast("Please enter a folder name", "error"); return; }
  const iconEl = document.querySelector(".ip-opt.selected");
  const icon   = iconEl ? iconEl.dataset.icon : "fa-folder";
  const pathKey = buildPathKey();
  try {
    await addFolder(pathKey, { name, icon });
    closeModal("modal-folder");
    showToast("Folder created!", "success");
    await render();
  } catch(e) { showToast("Error: " + e.message, "error"); }
};

// ── ADD RESOURCE ──────────────────────────────────────────
window.openAddFileModal = () => {
  document.getElementById("input-file-title").value = "";
  document.getElementById("input-file-url").value   = "";
  document.getElementById("input-file-desc").value  = "";
  document.getElementById("input-file-type").value  = "file";
  showModal("modal-file");
};

window.toggleLinkField = () => {
  const type = document.getElementById("input-file-type").value;
  const label = document.getElementById("link-label");
  if (type === "folder") {
    label.textContent = "Google Drive Folder Link";
  } else {
    label.textContent = "Google Drive Link";
  }
};

window.addFileLink = async () => {
  if (_role !== "editor" && _role !== "owner") { showToast("Not authorised.", "error"); return; }
  const title = document.getElementById("input-file-title").value.trim();
  const url   = document.getElementById("input-file-url").value.trim();
  const type  = document.getElementById("input-file-type").value;
  const desc  = document.getElementById("input-file-desc").value.trim();
  if (!title) { showToast("Please enter a title", "error"); return; }
  if (!url)   { showToast("Please enter a Google Drive link", "error"); return; }
  const resourceType = type === "folder" ? "folder" : "file";
  const pathKey = buildPathKey();
  try {
    await addResource(pathKey, { title, url, type: resourceType, desc });
    closeModal("modal-file");
    showToast("Resource added!", "success");
    await renderFiles();
  } catch(e) { showToast("Error: " + e.message, "error"); }
};

// ── DELETE ────────────────────────────────────────────────
function openDeleteModal(type, id, msg) {
  deleteTarget = { type, id };
  document.getElementById("delete-msg").innerHTML = msg;
  showModal("modal-delete");
}

window.openDeleteFileModal = (id, title) => {
  openDeleteModal("file", id, `Delete "<b>${escHtml(title)}</b>"?`);
};

window.confirmDelete = async () => {
  if (!deleteTarget) return;
  const { type, id } = deleteTarget;
  try {
    if (type === "folder") {
      await deleteFolder(id);
      closeModal("modal-delete");
      showToast("Folder deleted", "success");
      await render();
    } else {
      await deleteResource(id);
      closeModal("modal-delete");
      showToast("Resource removed", "success");
      await renderFiles();
    }
  } catch(e) { showToast("Error: " + e.message, "error"); }
  deleteTarget = null;
};

// ── COMMENTS ──────────────────────────────────────────────
window.openComments = async (resourceId) => {
  commentResourceId = resourceId;
  const list    = document.getElementById("comment-list");
  const empty   = document.getElementById("comment-empty");
  const inputArea = document.getElementById("comment-input-area");
  const loginPrompt = document.getElementById("comment-login-prompt");
  const footer  = document.getElementById("comment-footer");

  list.innerHTML = '<div style="text-align:center;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i></div>';
  showModal("modal-comment");

  const comments = await getComments(resourceId);
  list.innerHTML = "";

  if (comments.length === 0) {
    empty.style.display = "";
  } else {
    empty.style.display = "none";
    comments.forEach(c => {
      const el = document.createElement("div");
      el.className = "comment-item";
      el.innerHTML = `
        <div class="ci-header">
          <span class="ci-author"><i class="fas fa-user-circle"></i> ${escHtml(c.authorName)}</span>
          ${_role === "owner" ? `<button class="ci-del" onclick="deleteCommentById('${c.id}')"><i class="fas fa-trash"></i></button>` : ""}
        </div>
        <div class="ci-text">${escHtml(c.text)}</div>
      `;
      list.appendChild(el);
    });
  }

  if (_user) {
    inputArea.style.display   = "";
    loginPrompt.style.display = "none";
    footer.style.display      = "";
  } else {
    inputArea.style.display   = "none";
    loginPrompt.style.display = "";
    footer.style.display      = "none";
  }
};

window.submitComment = async () => {
  if (!_user) { showToast("Sign in to comment.", "error"); return; }
  const text = document.getElementById("input-comment").value.trim();
  if (!text) { showToast("Write something first.", "error"); return; }
  try {
    await addComment(commentResourceId, text, _user);
    document.getElementById("input-comment").value = "";
    showToast("Comment posted!", "success");
    await openComments(commentResourceId);
  } catch(e) { showToast("Error: " + e.message, "error"); }
};

window.deleteCommentById = async (id) => {
  if (_role !== "owner") return;
  try {
    await deleteComment(id);
    showToast("Comment deleted", "success");
    await openComments(commentResourceId);
  } catch(e) { showToast("Error: " + e.message, "error"); }
};

// ── LOGIN PROMPT ──────────────────────────────────────────
window.showLoginPrompt = () => showModal("modal-login-prompt");

// ── MODAL HELPERS ─────────────────────────────────────────
window.showModal = (id) => {
  document.getElementById(id).style.display = "flex";
  document.body.style.overflow = "hidden";
};
window.closeModal = (id) => {
  document.getElementById(id).style.display = "none";
  document.body.style.overflow = "";
};

document.querySelectorAll(".modal-overlay").forEach(el => {
  el.addEventListener("click", function(e) {
    if (e.target === this) closeModal(this.id);
  });
});

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, type = "default") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className   = "toast " + type + " show";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ── UTILS ─────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, String.raw`&`)
    .replace(/</g, String.raw`<`)
    .replace(/>/g, String.raw`>`)
    .replace(/"/g, String.raw`"`);
}

// Enter key support
document.getElementById("input-folder-name")?.addEventListener("keydown", e => { if(e.key==="Enter") window.createFolder(); });
document.getElementById("input-file-title")?.addEventListener("keydown",  e => { if(e.key==="Enter") window.addFileLink(); });
document.getElementById("input-comment")?.addEventListener("keydown",     e => { if(e.key==="Enter") window.submitComment(); });
