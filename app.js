// ============================================================
//  PaperBank – Main App (Firebase + Role-based)
// ============================================================
import {
  onUserChange, logOut, currentUser, currentRole,
  getFolders, addFolder, deleteFolder,
  getResources, addResource, deleteResource,
  getComments, addComment, deleteComment
} from "./firebase-helpers.js";



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
    if (btnLogin) btnLogin.style.display = "none";
    if (userMenu) userMenu.style.display = "";
    if (udName) udName.textContent = _user.displayName || _user.email || "User";
    if (udRole) udRole.textContent = _role.charAt(0).toUpperCase() + _role.slice(1);
    if (udAdmin) udAdmin.style.display = (_role === "owner") ? "" : "none";
    
    // Show action bar for owner and editor
    if (_role === "owner" || _role === "editor") {
      if (actionBar) actionBar.style.display = "flex";
      // Owner can create folders, editor can only upload resources
      if (btnAddFolder) btnAddFolder.style.display = (_role === "owner") ? "" : "none";
      if (btnUploadResource) btnUploadResource.style.display = "";
      // Show Add Resource button in file section
      if (btnAddFileTop) btnAddFileTop.style.display = "";
    } else {
      if (actionBar) actionBar.style.display = "none";
      if (btnAddFileTop) btnAddFileTop.style.display = "none";
    }
  } else {
    if (btnLogin) btnLogin.style.display = "";
    if (userMenu) userMenu.style.display = "none";
    if (actionBar) actionBar.style.display = "none";
    if (btnAddFileTop) btnAddFileTop.style.display = "none";
  }
}

window.doLogout = async () => {
  await logOut();
  location.reload();
};

window.toggleUserDropdown = () => {
  const dd = document.getElementById("user-dropdown");
  if (dd) dd.style.display = dd.style.display === "none" ? "" : "none";
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
  
  // DEBUG: Log path for debugging
  // console.log("selectMedium called, path:", path);
  // console.log("path.length:", path.length);

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

  let grid = document.getElementById("card-grid");
  if (!grid) {
    // Fallback: try using querySelector
    grid = document.querySelector(".card-grid");
  }
  
  const hero = document.getElementById("hero-section");
  const titleBar = document.getElementById("page-title-bar");
  const fileSection = document.getElementById("file-section");

  // DEBUG: Log render state
  // console.log("render called, path.length:", path.length, "path:", path);
  // console.log("grid element:", grid, "hero element:", hero);

  if (fileSection) fileSection.style.display = "none";
  if (grid) grid.style.display = "grid";

  renderBreadcrumb();

  if (path.length === 0) {

    if (hero) hero.style.display = "";
    if (titleBar) titleBar.style.display = "none";

    renderMediums(grid);

  } else {

    if (hero) hero.style.display = "none";
    if (titleBar) titleBar.style.display = "";

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

  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");
  if (pageTitle) pageTitle.textContent = step.label;
  if (pageSubtitle) pageSubtitle.textContent = map[step.type] || "";
}

// ── BREADCRUMB ────────────────────────────────────────────
function renderBreadcrumb() {

  const bc = document.getElementById("breadcrumb");
  if (!bc) return;
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

  if (!grid) return;
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
  if (!grid) {
    console.log("ERROR: grid is null! Using querySelector as fallback");
    grid = document.querySelector(".card-grid");
  }
  if (!grid) {
    console.log("ERROR: Still no grid! Trying again with setTimeout");
    setTimeout(() => renderGrades(document.getElementById("card-grid")), 100);
    return;
  }
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

  if (!grid) return;
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

// ── MODAL HELPERS ─────────────────────────────────────────
window.openAddFolderModal = () => {
  const modalFolder = document.getElementById("modal-folder");
  const inputFolderName = document.getElementById("input-folder-name");
  if (modalFolder) modalFolder.style.display = "flex";
  if (inputFolderName) inputFolderName.value = "";
};

window.openAddFileModal = () => {
  const modalFile = document.getElementById("modal-file");
  const inputFileTitle = document.getElementById("input-file-title");
  const inputFileUrl = document.getElementById("input-file-url");
  const inputFileDesc = document.getElementById("input-file-desc");
  const inputFileType = document.getElementById("input-file-type");
  if (modalFile) modalFile.style.display = "flex";
  if (inputFileTitle) inputFileTitle.value = "";
  if (inputFileUrl) inputFileUrl.value = "";
  if (inputFileDesc) inputFileDesc.value = "";
  if (inputFileType) inputFileType.value = "file";
  toggleLinkField();
};

window.closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
};

window.toggleLinkField = () => {
  const typeEl = document.getElementById("input-file-type");
  const label = document.getElementById("link-label");
  if (!typeEl || !label) return;
  if (typeEl.value === "folder") {
    label.textContent = "Google Drive Folder Link";
  } else {
    label.textContent = "Google Drive Link";
  }
};

// ── TOAST NOTIFICATION ─────────────────────────────────────
function showToast(msg, type = "default") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = "toast " + type + " show";
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ── CREATE FOLDER ───────────────────────────────────────────
window.createFolder = async () => {
  const name = document.getElementById("input-folder-name").value.trim();
  if (!name) {
    showToast("Please enter a folder name", "error");
    return;
  }
  
  const selectedIcon = document.querySelector(".ip-opt.selected");
  const icon = selectedIcon ? selectedIcon.dataset.icon : "fa-folder";
  
  const pathKey = path.map(p => p.id).join("/");
  
  try {
    await addFolder(pathKey, { name, icon });
    closeModal("modal-folder");
    showToast("Folder created successfully!");
    render();
  } catch (e) {
    showToast("Error creating folder: " + e.message, "error");
  }
};

// ── ADD RESOURCE ────────────────────────────────────────────
window.addFileLink = async () => {
  const type = document.getElementById("input-file-type").value;
  const title = document.getElementById("input-file-title").value.trim();
  const url = document.getElementById("input-file-url").value.trim();
  const desc = document.getElementById("input-file-desc").value.trim();
  
  if (!title || !url) {
    showToast("Please enter title and link", "error");
    return;
  }
  
  const pathKey = path.map(p => p.id).join("/");
  
  try {
    await addResource(pathKey, {
      title,
      url,
      type,
      description: desc
    });
    closeModal("modal-file");
    showToast("Resource added successfully!");
    render();
  } catch (e) {
    showToast("Error adding resource: " + e.message, "error");
  }
};

// ── RENDER CUSTOM FOLDERS ──────────────────────────────────
async function renderCustomFolders(grid) {
  if (!grid) return;
  const pathKey = path.map(p => p.id).join("/");
  
  try {
    const folders = await getFolders(pathKey);
    
    if (folders.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-folder-open" style="font-size:48px;margin-bottom:16px;opacity:0.5;"></i><p>No folders yet. Create one to organize resources!</p></div>`;
      return;
    }
    
    grid.innerHTML = "";
    
    folders.forEach(folder => {
      const card = document.createElement("div");
      card.className = "card-folder";
      
      const canDelete = _role === "owner";
      
      card.innerHTML = `
        <div class="cf-icon"><i class="fas ${folder.icon || 'fa-folder'}"></i></div>
        <div class="cf-name">${escHtml(folder.name)}</div>
        ${canDelete ? `<button class="cf-delete" onclick="event.stopPropagation();deleteFolderConfirm('${folder.id}', '${escHtml(folder.name)}')"><i class="fas fa-trash"></i></button>` : ''}
      `;
      
      card.onclick = () => navigateTo({ 
        type: "folder", 
        id: folder.id, 
        label: folder.name 
      });
      
      grid.appendChild(card);
    });
  } catch (e) {
    showToast("Error loading folders: " + e.message, "error");
  }
}

// ── RENDER FILES/RESOURCES ─────────────────────────────────
async function renderFiles() {
  const fileSection = document.getElementById("file-section");
  const fileList = document.getElementById("file-list");
  const fileEmpty = document.getElementById("file-empty");
  const grid = document.getElementById("card-grid");
  
  // Return early if essential elements are missing
  if (!fileSection || !fileList || !grid) return;
  
  const pathKey = path.map(p => p.id).join("/");
  
  try {
    const resources = await getResources(pathKey);
    
    if (grid) grid.style.display = "none";
    fileSection.style.display = "block";
    
    if (resources.length === 0) {
      if (fileList) fileList.innerHTML = "";
      if (fileEmpty) fileEmpty.style.display = "block";
      return;
    }
    
    if (fileEmpty) fileEmpty.style.display = "none";
    if (fileList) fileList.innerHTML = "";
    
    const canDelete = _role === "owner" || _role === "editor";
    
    resources.forEach(res => {
      const item = document.createElement("div");
      item.className = "file-item";
      
      const iconClass = res.type === "folder" ? "fa-folder" : "fa-file-pdf";
      const typeLabel = res.type === "folder" ? "Folder" : "File";
      
      item.innerHTML = `
        <div class="fi-icon"><i class="fas ${iconClass}"></i></div>
        <div class="fi-details">
          <div class="fi-title">${escHtml(res.title)}</div>
          <div class="fi-meta">
            <span class="fi-type">${typeLabel}</span>
            ${res.description ? `<span class="fi-desc">${escHtml(res.description)}</span>` : ''}
          </div>
        </div>
        <div class="fi-actions">
          <a href="${res.url}" target="_blank" class="fi-btn fi-btn-open"><i class="fas fa-external-link-alt"></i> Open</a>
          ${canDelete ? `<button class="fi-btn fi-btn-delete" onclick="deleteResourceConfirm('${res.id}', '${escHtml(res.title)}')"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      `;
      
      if (fileList) fileList.appendChild(item);
    });
    
    // Show/hide add file button based on role
    const btnAddFileTop = document.getElementById("btn-add-file-top");
    if (_role === "owner" || _role === "editor") {
      if (btnAddFileTop) btnAddFileTop.style.display = "";
    } else {
      if (btnAddFileTop) btnAddFileTop.style.display = "none";
    }
    
  } catch (e) {
    showToast("Error loading resources: " + e.message, "error");
  }
}

// ── DELETE CONFIRMATION ─────────────────────────────────────
window.deleteFolderConfirm = (id, name) => {
  deleteTarget = { type: "folder", id, name };
  const deleteMsg = document.getElementById("delete-msg");
  const modalDelete = document.getElementById("modal-delete");
  if (deleteMsg) deleteMsg.textContent = `Are you sure you want to delete folder "${name}"?`;
  if (modalDelete) modalDelete.style.display = "flex";
};

window.deleteResourceConfirm = (id, title) => {
  deleteTarget = { type: "resource", id, title };
  const deleteMsg = document.getElementById("delete-msg");
  const modalDelete = document.getElementById("modal-delete");
  if (deleteMsg) deleteMsg.textContent = `Are you sure you want to delete "${title}"?`;
  if (modalDelete) modalDelete.style.display = "flex";
};

window.confirmDelete = async () => {
  if (!deleteTarget) return;
  
  try {
    if (deleteTarget.type === "folder") {
      await deleteFolder(deleteTarget.id);
      showToast("Folder deleted!");
    } else {
      await deleteResource(deleteTarget.id);
      showToast("Resource deleted!");
    }
    deleteTarget = null;
    closeModal("modal-delete");
    render();
  } catch (e) {
    showToast("Error deleting: " + e.message, "error");
  }

};
