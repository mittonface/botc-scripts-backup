import { initCards, setCountText } from "./cards.js";
import { initCharFilter } from "./char-filter.js";
import { loadData } from "./data.js";
import { initFilters } from "./filters.js";
import { initModal, loadScript } from "./modal.js";
import { render } from "./state.js";

async function init() {
  initModal();
  initCards({ onOpenScript: loadScript });
  initFilters();
  initCharFilter();

  setCountText("Loading…");
  try {
    const scriptEl = document.querySelector("script[data-characters-url]");
    await loadData({ charactersUrl: scriptEl.dataset.charactersUrl });
    render();
  } catch {
    setCountText("Failed to load scripts.");
  }
}

init();
