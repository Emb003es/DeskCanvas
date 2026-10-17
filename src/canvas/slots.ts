import type { Obj } from "../doc";

type Pt = { x: number; y: number };
/** Desktop icon cell geometry in monitor px: cell size and where the icon image sits inside it. */
export type Cell = { w: number; h: number; iconTop: number; iconSize: number };

/**
 * Cell top-left positions where an icon "sits" on furniture surfaces, sorted top-to-bottom,
 * left-to-right. Icons are spread evenly along each surface, as many as fit.
 * shortcut: ignores object rotation, upgrade if rotated furniture with icons is needed.
 */
export function slotPoints(objs: Obj[], cell: Cell): Pt[] {
  const out: Pt[] = [];
  for (const o of objs) {
    for (const [a, b, fy] of o.slots ?? []) {
      const [f0, f1] = o.flipX ? [1 - b, 1 - a] : [a, b];
      const left = o.x - o.width / 2 + f0 * o.width;
      const len = (f1 - f0) * o.width;
      const surface = o.y - o.height / 2 + (o.flipY ? 1 - fy : fy) * o.height;
      const n = Math.max(1, Math.floor(len / cell.w));
      for (let i = 0; i < n; i++) {
        const cx = left + (len / n) * (i + 0.5);
        out.push({ x: Math.round(cx - cell.w / 2), y: Math.round(surface - cell.iconTop - cell.iconSize) });
      }
    }
  }
  return out.sort((p, q) => p.y - q.y || p.x - q.x);
}

const near = (p: Pt, q: Pt, d: number) => Math.abs(p.x - q.x) < d && Math.abs(p.y - q.y) < d;

/** Nearest free slot within `maxDist` of the dropped cell, or null. */
export function snapToSlot(p: Pt, slots: Pt[], others: Pt[], maxDist: number): Pt | null {
  let best: Pt | null = null;
  let bestD = maxDist;
  for (const s of slots) {
    if (others.some((o) => near(o, s, 20))) continue;
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d <= bestD) (bestD = d), (best = s);
  }
  return best;
}

/** Fills slots in reading order with icons in reading order; extra icons keep their place. */
export function organize<T extends Pt & { id: string }>(icons: T[], slots: Pt[]): Map<string, Pt> {
  const ordered = [...icons].sort((p, q) => p.x - q.x || p.y - q.y);
  return new Map(ordered.slice(0, slots.length).map((ic, i) => [ic.id, slots[i]]));
}
