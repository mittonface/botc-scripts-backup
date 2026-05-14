export const PAGE_SIZE = 50;

export const state = {
  allScripts: [],
  filtered: [],
  renderedCount: 0,
  activeType: "all",
  searchQuery: "",
  selectedChars: [],
  lastFocusedCard: null,
  characters: {},
  characterList: [],
  currentScriptData: null,
};

const subscribers = new Set();

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function render() {
  subscribers.forEach((fn) => fn());
}

export function setScripts(scripts) {
  state.allScripts = scripts.map((script) => ({
    ...script,
    charSet: new Set(script.characters || []),
  }));
}

export function setCharacters(characters) {
  state.characters = characters;
  state.characterList = Object.entries(characters)
    .map(([id, [name, role]]) => ({ id, name, role }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
