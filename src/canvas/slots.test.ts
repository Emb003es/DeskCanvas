// Run with: npm test
import assert from "node:assert/strict";
import { organize, slotPoints, snapToSlot } from "./slots.ts";
import { newObj } from "../doc.ts";

const cell = { w: 96, h: 124, iconTop: 4, iconSize: 48 };
// 400 px wide table centered at (500, 600), surface at its top edge (y = 500).
const table = newObj({ type: "image", x: 500, y: 600, width: 400, height: 200, slots: [[0, 1, 0]] });
const pts = slotPoints([table], cell);
assert.equal(pts.length, 4); // floor(400 / 96)
assert.deepEqual(pts[0], { x: 300 + 50 - 48, y: 500 - 52 });
// Flipped furniture mirrors partial surfaces.
const shelf = newObj({ type: "image", x: 500, y: 600, width: 400, height: 200, slots: [[0, 0.5, 0]], flipX: true });
assert.ok(slotPoints([shelf], cell).every((p) => p.x + 48 > 500));

// Snaps to the nearest free slot, skipping occupied ones.
assert.deepEqual(snapToSlot({ x: 310, y: 440 }, pts, [], 150), pts[0]);
assert.deepEqual(snapToSlot({ x: 310, y: 440 }, pts, [pts[0]], 150), pts[1]);
assert.equal(snapToSlot({ x: 0, y: 0 }, pts, [], 150), null);

// Organize fills slots in order; extra icons stay.
const icons = [0, 1, 2, 3, 4].map((i) => ({ id: "i" + i, x: 24, y: 2 + i * 124 }));
const m = organize(icons, pts);
assert.equal(m.size, 4);
assert.deepEqual(m.get("i0"), pts[0]);
assert.equal(m.has("i4"), false);
console.log("slots ok");
