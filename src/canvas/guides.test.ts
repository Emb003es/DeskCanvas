// Run with: npm test
import assert from "node:assert/strict";
import { snapBox } from "./guides.ts";

const canvas = { x: 0, y: 0, width: 1000, height: 500 };

// Center snaps to canvas center within threshold.
let r = snapBox({ x: 447, y: 100, width: 100, height: 50 }, [], canvas, 6);
assert.equal(r.dx, 3);
assert.deepEqual(r.guides, [{ axis: "x", at: 500 }]);
assert.equal(r.dy, 0);

// Left edge snaps to another box's right edge.
r = snapBox({ x: 304, y: 0, width: 50, height: 50 }, [{ x: 200, y: 300, width: 100, height: 100 }], canvas, 6);
assert.equal(r.dx, -4);

// Nothing near: falls back to grid.
r = snapBox({ x: 123, y: 237, width: 30, height: 30 }, [], { x: 0, y: 0, width: 5000, height: 5000 }, 2, 40);
assert.deepEqual([r.dx, r.dy, r.guides.length], [-3, 3, 0]);

console.log("guides ok");
