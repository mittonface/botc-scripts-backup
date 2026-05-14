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
    const tag = document.activeElement.tagName;
    if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
      event.preventDefault();
      searchEl.focus();
      searchEl.select();
    }
  });
}
