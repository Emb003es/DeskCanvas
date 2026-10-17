/** Design document model. Coordinates are physical monitor px; objects are positioned by their center. */

export type Background =
  | { kind: "color"; color: string }
  | { kind: "gradient"; from: string; to: string; angle: number }
  | { kind: "image"; src: string; color: string };

export type ShapeType = "rect" | "ellipse" | "triangle" | "star" | "heart" | "arrow" | "line";

export type Obj = {
  id: string;
  type: "image" | "text" | "shape" | "box";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  src?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  shape?: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Box label tab color. */
  accent?: string;
  /** Color tweaks for images: hue in degrees, saturation and brightness in -1..1. */
  hue?: number;
  saturation?: number;
  brightness?: number;
  /** Furniture surfaces where icons can sit: [x0, x1, y] as fractions of width/height. */
  slots?: number[][];
};

export type Stroke = { points: number[]; color: string; size: number; opacity: number; erase: boolean };

export type LayerKind = "background" | "objects" | "drawing" | "icons";

export type Layer = {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  locked: boolean;
  objects: Obj[];
  strokes: Stroke[];
  /** Screen-capture guide: visible while designing, never exported. */
  guide?: boolean;
};

/** `layers` go bottom to top; the background layer is always first. */
export type Doc = { width: number; height: number; background: Background; layers: Layer[] };

export const uid = () => Math.random().toString(36).slice(2, 10);

export const newLayer = (kind: LayerKind, name: string): Layer => ({
  id: uid(),
  name,
  kind,
  visible: true,
  locked: false,
  objects: [],
  strokes: [],
});

export const newDoc = (width: number, height: number): Doc => ({
  width,
  height,
  background: { kind: "gradient", from: "#f6c8a8", to: "#9cc3ea", angle: 135 },
  layers: [
    newLayer("background", "Fondo"),
    newLayer("objects", "Objetos"),
    newLayer("drawing", "Dibujo"),
    newLayer("icons", "Iconos del escritorio"),
  ],
});

export const newObj = (o: Partial<Obj> & Pick<Obj, "type">): Obj => ({
  id: uid(),
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  rotation: 0,
  flipX: false,
  flipY: false,
  opacity: 1,
  ...o,
});
