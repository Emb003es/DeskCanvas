import Konva from "konva";

/**
 * Renders the design at the monitor's exact physical size, without desktop icons,
 * selection handles, guides or capture guides. Layers the user hid stay hidden.
 */
export function renderDesign(stage: Konva.Stage, width: number, height: number, mimeType = "image/png") {
  const skip = stage.getLayers().filter((l) => ["icons", "ui", "guide"].includes(l.name()));
  const shown = skip.map((l) => l.visible());
  const old = { size: stage.size(), scale: stage.scale() };
  skip.forEach((l) => l.visible(false));
  // Render at 1:1 instead of using pixelRatio on the scaled stage, which can round to ±1 px.
  stage.size({ width, height });
  stage.scale({ x: 1, y: 1 });
  try {
    return stage.toDataURL({ mimeType, quality: 0.92, pixelRatio: 1 });
  } finally {
    stage.size(old.size);
    stage.scale(old.scale ?? { x: 1, y: 1 });
    skip.forEach((l, i) => l.visible(shown[i]));
    stage.batchDraw();
  }
}
