// Run with: npm test
import assert from "node:assert/strict";
import { extractAssets, inlineAssets, parseProject } from "./project.ts";
import { newDoc, newObj } from "./doc.ts";

const png = "data:image/png;base64,iVBORw0KGgo=";
const doc = newDoc(1920, 1080);
doc.background = { kind: "image", src: png, color: "#000000" };
doc.layers[1].objects.push(newObj({ type: "image", src: png }), newObj({ type: "image", src: "/stickers/cozy/mesa.svg" }));

const { docs, assets } = extractAssets({ D1: doc });
// Same image used twice is stored once; built-in stickers stay as paths.
assert.equal(assets.length, 1);
assert.match(docs.D1.layers[1].objects[0].src!, /^assets\/[0-9a-f]{8}\.png$/);
assert.equal(docs.D1.layers[1].objects[1].src, "/stickers/cozy/mesa.svg");
assert.equal(docs.D1.background.kind === "image" && docs.D1.background.src, docs.D1.layers[1].objects[0].src);
// Original docs untouched.
assert.equal(doc.layers[1].objects[0].src, png);

// Round trip through JSON.
const json = JSON.stringify({ app: "DeskCanvas", version: 1, docs, icons: [] });
const back = inlineAssets(parseProject(json).docs, Object.fromEntries(assets.map((a) => [a.name, a.data])));
assert.deepEqual(back, { D1: doc });

assert.throws(() => parseProject('{"hello":1}'), /No es un proyecto/);
console.log("project ok");
