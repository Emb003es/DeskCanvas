import type { Doc } from "./doc";

/** On-disk project: `<name>.deskcanvas/project.json` + `assets/`. */
export type ProjectFile = {
  app: "DeskCanvas";
  version: 1;
  /** One design per monitor, keyed by device name (e.g. \\.\DISPLAY1). */
  docs: Record<string, Doc>;
  /** Desktop icon positions (virtual-screen px) when saved. */
  icons: { id: string; x: number; y: number }[];
};

export type Asset = { name: string; data: string };

/** FNV-1a: short stable names so identical images are stored once. */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  "image/bmp": "bmp", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico", "image/avif": "avif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/x-matroska": "mkv", "video/ogg": "ogv" };

/** Walks every image source in the docs (objects and background images). */
function mapSources(docs: Record<string, Doc>, fn: (src: string) => string): Record<string, Doc> {
  const out: Record<string, Doc> = {};
  for (const [k, d] of Object.entries(docs)) {
    out[k] = {
      ...d,
      background: d.background.kind === "image" ? { ...d.background, src: fn(d.background.src) } : d.background,
      layers: d.layers.map((l) => ({ ...l, objects: l.objects.map((o) => (o.src ? { ...o, src: fn(o.src) } : o)) })),
    };
  }
  return out;
}

/** Moves embedded data: URLs out into asset files and references them as `assets/<name>`. */
export function extractAssets(docs: Record<string, Doc>) {
  const assets = new Map<string, Asset>();
  const out = mapSources(docs, (src) => {
    const m = /^data:([^;,]+)[^,]*,/.exec(src);
    if (!m) return src;
    const name = `${hash(src)}.${EXT[m[1]] ?? "bin"}`;
    assets.set(name, { name, data: src });
    return `assets/${name}`;
  });
  return { docs: out, assets: [...assets.values()] };
}

/** Inverse of extractAssets: `assets/<name>` back to data URLs. Missing assets become empty. */
export function inlineAssets(docs: Record<string, Doc>, assets: Record<string, string>) {
  return mapSources(docs, (src) => (src.startsWith("assets/") ? assets[src.slice(7)] ?? "" : src));
}

/** Validates the parsed JSON enough to not crash the editor on a foreign file. */
export function parseProject(json: string): ProjectFile {
  const p = JSON.parse(json);
  if (p?.app !== "DeskCanvas" || typeof p.docs !== "object") throw new Error("No es un proyecto de DeskCanvas");
  if (p.version > 1) throw new Error("Proyecto creado con una versión más nueva de DeskCanvas");
  for (const d of Object.values(p.docs) as Doc[])
    if (!Array.isArray(d?.layers) || !d.background || !(d.width > 0 && d.height > 0)) throw new Error("Proyecto dañado");
  return { ...p, icons: Array.isArray(p.icons) ? p.icons : [] };
}
