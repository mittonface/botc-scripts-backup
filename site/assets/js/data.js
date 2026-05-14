import { setCharacters, setScripts } from "./state.js";

export async function loadData({ charactersUrl }) {
  const [manifestResponse, charactersResponse] = await Promise.all([
    fetch("/scripts/manifest.json"),
    fetch(charactersUrl),
  ]);

  if (!manifestResponse.ok) throw new Error(manifestResponse.statusText);
  if (!charactersResponse.ok) throw new Error(charactersResponse.statusText);

  setScripts(await manifestResponse.json());
  setCharacters(await charactersResponse.json());
}
