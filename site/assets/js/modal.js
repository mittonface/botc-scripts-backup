import { ROLES, getRole } from "./roles.js";
import { state } from "./state.js";
import { buildScriptToolUrl } from "./script-tool.js";
import { esc, formatId, makeFocusTrap } from "./utils.js";

const COPY_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const COPY_SVG_OK = `<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const COPY_DEFAULT_HTML = `${COPY_SVG}<span class="modal-btn-label">Copy JSON</span>`;
const COPY_OK_HTML = `${COPY_SVG_OK}<span class="modal-btn-label">Copied!</span>`;

let overlay;
let modalTitle;
let modalMeta;
let modalBody;
let modalDownload;
let modalCopy;
let modalScriptTool;
let removeFocusTrap = null;

export function initModal() {
  overlay = document.getElementById("modal-overlay");
  modalTitle = document.getElementById("modal-title");
  modalMeta = document.getElementById("modal-meta");
  modalBody = document.getElementById("modal-body");
  modalDownload = document.getElementById("modal-download");
  modalCopy = document.getElementById("modal-copy");
  modalScriptTool = document.getElementById("modal-scripttool");

  document.getElementById("modal-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("open"))
      closeModal();
  });

  modalCopy.addEventListener("click", copyCurrentScript);
  modalScriptTool.addEventListener("click", openCurrentScriptInTool);
}

export async function loadScript(card) {
  state.lastFocusedCard = card;
  const { filename, name, author, version, type } = card.dataset;

  modalTitle.textContent = name;
  modalDownload.href = `/scripts/${filename}`;
  modalDownload.setAttribute(
    "download",
    `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.json`,
  );

  const typeBadge =
    type === "Teensyville"
      ? `<span class="badge badge-teensyville">Teensyville</span>`
      : `<span class="badge badge-full">Full</span>`;
  modalMeta.innerHTML = `<span class="modal-author">${esc(author)}</span>${typeBadge}<span class="badge badge-version">v${esc(version)}</span>`;

  modalBody.innerHTML = '<div class="modal-loading">Loading…</div>';
  modalBody.setAttribute("aria-busy", "true");
  openModal();

  state.currentScriptData = null;
  try {
    const response = await fetch(`/scripts/${filename}`);
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    state.currentScriptData = data;
    modalBody.innerHTML = renderCharacters(data);
  } catch {
    modalBody.innerHTML = `<div class="modal-error">Could not load script data.</div>`;
  } finally {
    modalBody.setAttribute("aria-busy", "false");
  }
}

function openModal() {
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  overlay.removeAttribute("inert");
  document.body.style.overflow = "hidden";
  removeFocusTrap = makeFocusTrap(document.getElementById("modal"));
  requestAnimationFrame(() => document.getElementById("modal-close").focus());
}

function closeModal() {
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("inert", "");
  document.body.style.overflow = "";

  if (removeFocusTrap) {
    removeFocusTrap();
    removeFocusTrap = null;
  }

  if (state.lastFocusedCard) {
    state.lastFocusedCard.focus({ preventScroll: false });
    state.lastFocusedCard = null;
  }
}

function buildModalStats(groups) {
  const parts = ROLES.filter(
    (role) => groups[role.id] && groups[role.id].length > 0,
  ).map(
    (role) =>
      `<span class="modal-char-stat">` +
      `<span class="modal-char-stat-dot" style="background:${role.color}" aria-hidden="true"></span>` +
      `<span class="modal-char-stat-n">${groups[role.id].length}</span>` +
      `<span class="modal-char-stat-label">${role.label}</span>` +
      `</span>`,
  );
  return parts.length
    ? `<div class="modal-char-stats" aria-label="Character breakdown">${parts.join("")}</div>`
    : "";
}

function renderCharacters(entries) {
  const groups = {};
  for (const entry of entries) {
    if (entry.id === "_meta") continue;
    const info = state.characters[entry.id];
    const role = info ? info[1] : "unknown";
    const name = info ? info[0] : formatId(entry.id);
    if (!groups[role]) groups[role] = [];
    groups[role].push(name);
  }

  const parts = [buildModalStats(groups)];
  for (const role of ROLES) {
    if (!groups[role.id]) continue;
    const chips = groups[role.id]
      .map((name) => `<span class="char-chip ${role.id}">${esc(name)}</span>`)
      .join("");
    parts.push(
      `<div class="role-group"><h3 class="role-heading ${role.id}">${getRole(role.id).label}</h3><div class="char-grid">${chips}</div></div>`,
    );
  }
  return parts.join("");
}

async function copyCurrentScript() {
  if (!state.currentScriptData) return;
  try {
    await navigator.clipboard.writeText(
      JSON.stringify(state.currentScriptData, null, 2),
    );
    modalCopy.innerHTML = COPY_OK_HTML;
    modalCopy.classList.add("copied");
    modalCopy.setAttribute("aria-label", "Copied to clipboard");
    setTimeout(() => {
      modalCopy.innerHTML = COPY_DEFAULT_HTML;
      modalCopy.classList.remove("copied");
      modalCopy.setAttribute("aria-label", "Copy script JSON to clipboard");
    }, 1800);
  } catch {
    /* clipboard unavailable */
  }
}

async function openCurrentScriptInTool() {
  if (!state.currentScriptData) return;
  const popup = window.open("about:blank", "_blank");
  try {
    const url = await buildScriptToolUrl(state.currentScriptData);
    if (popup) {
      popup.opener = null;
      popup.location.replace(url);
    } else {
      window.location.href = url;
    }
  } catch {
    if (popup) popup.close();
  }
}
