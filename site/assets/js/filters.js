import { render, state } from "./state.js";

export function initFilters() {
  const searchEl = document.getElementById("search");
  const filterBtns = document.querySelectorAll(".filter-btn");
  let searchTimer = null;

  searchEl.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = searchEl.value;
      render();
    }, 200);
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((button) =>
        button.setAttribute("aria-pressed", "false"),
      );
      btn.setAttribute("aria-pressed", "true");
      state.activeType = btn.dataset.type;
      render();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "/") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable)
      return;
    event.preventDefault();
    searchEl.focus();
    searchEl.select();
  });
}
