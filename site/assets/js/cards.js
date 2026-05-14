import { PAGE_SIZE, state, subscribe } from "./state.js";
import { esc } from "./utils.js";

let grid;
let emptyEl;
let countEl;
let sentinel;
let onOpenScript;

export function initCards(options) {
  grid = document.getElementById("grid");
  emptyEl = document.getElementById("empty");
  countEl = document.getElementById("result-count");
  sentinel = document.getElementById("sentinel");
  onOpenScript = options.onOpenScript;

  subscribe(redraw);

  new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        state.renderedCount < state.filtered.length
      ) {
        renderMore();
      }
    },
    { rootMargin: "300px" },
  ).observe(sentinel);

  grid.addEventListener("click", (event) => {
    const card = event.target.closest(".card");
    if (card) onOpenScript(card);
  });
}

export function setCountText(text) {
  countEl.textContent = text;
}

function buildCard(script) {
  const charCount = script.characters ? script.characters.length : 0;
  const typeBadge =
    script.script_type === "Teensyville"
      ? `<span class="badge badge-teensyville">Teensyville</span>`
      : `<span class="badge badge-full">Full</span>`;

  return `<button
    type="button"
    class="card"
    data-filename="${esc(script.filename)}"
    data-name="${esc(script.name)}"
    data-author="${esc(script.author)}"
    data-version="${esc(script.version)}"
    data-type="${esc(script.script_type)}"
    aria-label="${esc(script.name)} by ${esc(script.author)}"
  >
    <span class="card-name">${esc(script.name)}</span>
    <span class="card-author" title="${esc(script.author)}">${esc(script.author)}</span>
    <span class="card-footer">
      ${typeBadge}
      <span class="badge badge-version">v${esc(script.version)}</span>
      ${charCount > 0 ? `<span class="card-char-count" aria-label="${charCount} characters">${charCount} chars</span>` : ""}
    </span>
  </button>`;
}

function updateCount() {
  const total = state.filtered.length;
  const shown = Math.min(state.renderedCount, total);
  const next =
    total === 0
      ? "No scripts match"
      : `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} script${total !== 1 ? "s" : ""}`;
  if (next !== countEl.textContent) countEl.textContent = next;
}

function renderMore() {
  const batch = state.filtered.slice(
    state.renderedCount,
    state.renderedCount + PAGE_SIZE,
  );
  if (batch.length === 0) return;

  emptyEl.insertAdjacentHTML("beforebegin", batch.map(buildCard).join(""));
  state.renderedCount += batch.length;
  updateCount();
}

function redraw() {
  const query = state.searchQuery.toLowerCase().trim();
  state.filtered = state.allScripts.filter((script) => {
    const matchType =
      state.activeType === "all" || script.script_type === state.activeType;
    const matchName =
      !query ||
      script.name.toLowerCase().includes(query) ||
      (script.author && script.author.toLowerCase().includes(query));
    const matchChars =
      state.selectedChars.length === 0 ||
      (script.charSet &&
        state.selectedChars.every((id) => script.charSet.has(id)));
    return matchType && matchName && matchChars;
  });

  Array.from(grid.children).forEach((child) => {
    if (child !== emptyEl) child.remove();
  });
  state.renderedCount = 0;

  if (state.filtered.length === 0) {
    emptyEl.style.display = "block";
    updateCount();
  } else {
    emptyEl.style.display = "none";
    renderMore();
  }
}
