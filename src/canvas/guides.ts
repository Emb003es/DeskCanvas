export type Box = { x: number; y: number; width: number; height: number };
export type Guide = { axis: "x" | "y"; at: number };

/**
 * Snaps a moving box to candidate lines (edges/centers of other boxes and the canvas),
 * falling back to the grid. Returns the offset to apply and the guide lines to draw.
 */
export function snapBox(box: Box, others: Box[], canvas: Box, threshold: number, gridSize = 0) {
  const lines = (b: Box, axis: "x" | "y") =>
    axis === "x" ? [b.x, b.x + b.width / 2, b.x + b.width] : [b.y, b.y + b.height / 2, b.y + b.height];

  const result = { dx: 0, dy: 0, guides: [] as Guide[] };
  for (const axis of ["x", "y"] as const) {
    const targets = [canvas, ...others].flatMap((b) => lines(b, axis));
    let best: { diff: number; at: number } | null = null;
    for (const edge of lines(box, axis))
      for (const t of targets) {
        const diff = t - edge;
        if (Math.abs(diff) <= threshold && (!best || Math.abs(diff) < Math.abs(best.diff))) best = { diff, at: t };
      }
    const key = axis === "x" ? "dx" : "dy";
    if (best) {
      result[key] = best.diff;
      result.guides.push({ axis, at: best.at });
    } else if (gridSize > 0) {
      const start = axis === "x" ? box.x : box.y;
      result[key] = Math.round(start / gridSize) * gridSize - start;
    }
  }
  return result;
}
