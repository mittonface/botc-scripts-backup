export async function buildScriptToolUrl(scriptJson) {
  const json = JSON.stringify(scriptJson);
  const stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const byte of compressed) binary += String.fromCharCode(byte);
  return `https://script.bloodontheclocktower.com?script=${encodeURIComponent(btoa(binary))}`;
}
