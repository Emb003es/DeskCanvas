/** Explorer's "Align icons to grid" model: cells of (sx, sy) starting at (ox, oy) inside a monitor. */
export type IconGrid = { ox: number; oy: number; sx: number; sy: number };
type Pt = { x: number; y: number };

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Most common grid offset among icons (monitor-relative), so it matches what Windows uses. */
export function gridFromIcons(icons: Pt[], sx: number, sy: number): IconGrid {
  const mode = (vals: number[]) => {
    const count = new Map<number, number>();
    for (const v of vals) count.set(v, (count.get(v) ?? 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  };
  return { ox: mode(icons.map((p) => mod(p.x, sx))), oy: mode(icons.map((p) => mod(p.y, sy))), sx, sy };
}

/**
 * Snaps a dropped icon (monitor-relative top-left) to the nearest grid cell that no other
 * icon uses and that fits inside the monitor, like Explorer does.
 */
export function snapToFreeCell(p: Pt, others: Pt[], g: IconGrid, width: number, height: number): Pt {
  const cols = Math.max(1, Math.floor((width - g.ox) / g.sx));
  const rows = Math.max(1, Math.floor((height - g.oy) / g.sy));
  const cellOf = (q: Pt) => [Math.round((q.x - g.ox) / g.sx), Math.round((q.y - g.oy) / g.sy)];
  const taken = new Set(others.map((q) => cellOf(q).join(",")));
  const fx = (p.x - g.ox) / g.sx;
  const fy = (p.y - g.oy) / g.sy;
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      if (taken.has(`${c},${r}`)) continue;
      const d = ((c - fx) * g.sx) ** 2 + ((r - fy) * g.sy) ** 2;
      if (d < bestD) (bestD = d), (best = [c, r]);
    }
  // Every cell taken: leave it where it was dropped.
  if (!best) return p;
  return { x: g.ox + best[0] * g.sx, y: g.oy + best[1] * g.sy };
}
