import { render, state } from "./state.js";
import { esc, formatId } from "./utils.js";

let charSearchEl;
let charDropdown;
let charTagsEl;
let dropdownItems = [];
let focusedIndex = -1;

export function initCharFilter() {
  charSearchEl = document.getElementById("char-search");
  charDropdown = document.getElementById("char-dropdown");
  charTagsEl = document.getElementById("char-tags");

  charTagsEl.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".char-tag-remove");
    const clearBtn = event.target.closest("#char-clear-all");

    if (removeBtn) {
      state.selectedChars = state.selectedChars.filter(
        (id) => id !== removeBtn.dataset.id,
      );
      renderCharTags();
      render();
    }

    if (clearBtn) {
      state.selectedChars = [];
      renderCharTags();
      render();
    }
  });

  charSearchEl.addEventListener("input", () => {
    const query = charSearchEl.value.toLowerCase().trim();
    if (!query) {
      closeDropdown();
      return;
    }

    const matches = state.characterList
      .filter(
        (character) =>
          !state.selectedChars.includes(character.id) &&
          character.name.toLowerCase().includes(query),
      )
      .slice(0, 12);
    openDropdown(matches);
  });

  charSearchEl.addEventListener("keydown", (event) => {
    if (!charDropdown.classList.contains("open")) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusedIndex =
        focusedIndex >= dropdownItems.length - 1 ? 0 : focusedIndex + 1;
      updateDropdownFocus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusedIndex =
        focusedIndex <= 0 ? dropdownItems.length - 1 : focusedIndex - 1;
      updateDropdownFocus();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const index = focusedIndex >= 0 ? focusedIndex : 0;
      if (dropdownItems[index]) addChar(dropdownItems[index].id);
    } else if (event.key === "Escape") {
      closeDropdown();
    }
  });

  charDropdown.addEventListener("mousedown", (event) => {
    const option = event.target.closest(".char-option");
    if (!option) return;
    event.preventDefault();
    addChar(option.dataset.id);
  });

  document.addEventListener("click", (event) => {
    if (
      !charSearchEl.contains(event.target) &&
      !charDropdown.contains(event.target)
    ) {
      closeDropdown();
    }
  });
}

function renderCharTags() {
  if (state.selectedChars.length === 0) {
    charTagsEl.innerHTML = "";
    return;
  }

  charTagsEl.innerHTML =
    state.selectedChars
      .map((id) => {
        const info = state.characters[id];
        const name = info ? info[0] : formatId(id);
        const role = info ? info[1] : "unknown";
        return `<span class="char-tag ${role}">${esc(name)}<button type="button" class="char-tag-remove" data-id="${esc(id)}" aria-label="Remove ${esc(name)} filter">✕</button></span>`;
      })
      .join("") +
    `<button type="button" class="char-clear-btn" id="char-clear-all">Clear all</button>`;
}

function setDropdownExpanded(open) {
  charSearchEl.setAttribute("aria-expanded", open ? "true" : "false");
  charDropdown.classList.toggle("open", open);
}

function openDropdown(items) {
  dropdownItems = items;
  focusedIndex = -1;
  charDropdown.innerHTML = items
    .map(
      (character, index) =>
        `<div class="char-option" role="option" id="char-opt-${index}" data-id="${esc(character.id)}" aria-selected="false">` +
        `<span class="char-option-dot ${character.role}" aria-hidden="true"></span>` +
        `<span class="char-option-name">${esc(character.name)}</span>` +
        `<span class="char-option-role">${character.role}</span></div>`,
    )
    .join("");
  setDropdownExpanded(items.length > 0);
}

function closeDropdown() {
  setDropdownExpanded(false);
  charDropdown.innerHTML = "";
  dropdownItems = [];
  focusedIndex = -1;
  charSearchEl.removeAttribute("aria-activedescendant");
}

function addChar(id) {
  if (!state.selectedChars.includes(id)) {
    state.selectedChars.push(id);
    renderCharTags();
    render();
  }
  charSearchEl.value = "";
  closeDropdown();
  charSearchEl.focus();
}

function updateDropdownFocus() {
  charDropdown.querySelectorAll(".char-option").forEach((el, index) => {
    const active = index === focusedIndex;
    el.setAttribute("aria-selected", active ? "true" : "false");
    if (active) {
      charSearchEl.setAttribute("aria-activedescendant", `char-opt-${index}`);
      el.scrollIntoView({ block: "nearest" });
    }
  });
  if (focusedIndex < 0) charSearchEl.removeAttribute("aria-activedescendant");
}
