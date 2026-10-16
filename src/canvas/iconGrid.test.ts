// Run with: npm test
import assert from "node:assert/strict";
import { gridFromIcons, snapToFreeCell } from "./iconGrid.ts";

// Real layout from a real desktop: 96x124 cells starting at (24, 2).
const icons = [
  { x: 24, y: 2 },
  { x: 24, y: 126 },
  { x: 120, y: 2 },
  { x: 120, y: 250 },
];
const g = gridFromIcons(icons, 96, 124);
assert.deepEqual(g, { ox: 24, oy: 2, sx: 96, sy: 124 });

// Dropped near a free cell: lands exactly on it.
assert.deepEqual(snapToFreeCell({ x: 870, y: 520 }, icons, g, 1920, 1080), { x: 888, y: 498 });
// Dropped on an occupied cell: nearest free one instead.
assert.deepEqual(snapToFreeCell({ x: 30, y: 10 }, icons, g, 1920, 1080), { x: 120, y: 126 });
// Never outside the monitor (last full column/row).
assert.deepEqual(snapToFreeCell({ x: 5000, y: 5000 }, [], g, 1920, 1080), { x: 1752, y: 870 });

console.log("iconGrid ok");
