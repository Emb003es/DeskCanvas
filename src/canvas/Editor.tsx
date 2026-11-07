import { memo, useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Circle, Group, Image, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import useImageLoader from "./useImage";
import ObjectNode from "./ObjectNode";
import { readImage } from "../panels/Library";
import { Box, Guide, snapBox } from "./guides";
import { gridFromIcons, IconGrid, snapToFreeCell } from "./iconGrid";
import { slotPoints, snapToSlot } from "./slots";
import { DesktopIcon, Monitor } from "../api";
import { Background, Doc, Obj, Stroke } from "../doc";
import { currentDoc, furnitureOf, iconCell, useDoc, useStore } from "../store";

/** Fits the monitor (physical px) into the available area, keeping aspect ratio. */
function useFit(monitor: Monitor | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const scale = monitor ? Math.min(box.w / monitor.width, box.h / monitor.height) : 1;
  return { ref, scale: scale > 0 ? scale : 1 };
}

function BackgroundFill({ bg, w, h }: { bg: Background; w: number; h: number }) {
  const img = useImageLoader(bg.kind === "image" ? bg.src : "");
  if (bg.kind === "color") return <Rect width={w} height={h} fill={bg.color} />;
  if (bg.kind === "gradient") {
    const a = (bg.angle * Math.PI) / 180;
    // CSS convention: 0° points up, 90° right.
    const [cx, cy] = [Math.sin(a), -Math.cos(a)];
    const len = (Math.abs(w * cx) + Math.abs(h * cy)) / 2;
    return (
      <Rect
        width={w}
        height={h}
        fillLinearGradientStartPoint={{ x: w / 2 - cx * len, y: h / 2 - cy * len }}
        fillLinearGradientEndPoint={{ x: w / 2 + cx * len, y: h / 2 + cy * len }}
        fillLinearGradientColorStops={[0, bg.from, 1, bg.to]}
      />
    );
  }
  // Image: cover the whole monitor, centered.
  const k = img ? Math.max(w / img.width, h / img.height) : 1;
  return (
    <>
      <Rect width={w} height={h} fill={bg.color} />
      {img && <Image image={img} width={img.width * k} height={img.height * k} x={(w - img.width * k) / 2} y={(h - img.height * k) / 2} />}
    </>
  );
}

function IconNode({ icon, monitor, draggable, grid }: { icon: DesktopIcon; monitor: Monitor; draggable: boolean; grid: IconGrid | null }) {
  const desktop = useStore((s) => s.desktop)!;
  const pos = useStore((s) => s.positions[icon.id]);
  const moveIcon = useStore((s) => s.moveIcon);
  const img = useImageLoader(icon.image);
  const [hover, setHover] = useState(false);
  const { cellWidth: w, cellHeight: h, iconSize } = desktop;
  const k = monitor.dpi / 96;
  const font = 12 * k;
  const iconTop = 4 * k;

  return (
    <Group
      x={pos.x - monitor.x}
      y={pos.y - monitor.y}
      draggable={draggable}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragMove={(e) => {
        const n = e.target;
        n.x(Math.max(0, Math.min(monitor.width - w, n.x())));
        n.y(Math.max(0, Math.min(monitor.height - h, n.y())));
      }}
      onDragEnd={(e) => {
        const n = e.target;
        let p = { x: Math.round(n.x()), y: Math.round(n.y()) };
        const st = useStore.getState();
        const others = Object.entries(st.positions)
          .filter(([id, q]) => id !== icon.id && onMonitor(q, monitor))
          .map(([, q]) => ({ x: q.x - monitor.x, y: q.y - monitor.y }));
        const doc = currentDoc(st);
        const slot = doc && snapToSlot(p, slotPoints(furnitureOf(doc), iconCell(desktop, monitor)), others, w * 1.2);
        if (grid) {
          // Same as Explorer with "Align icons to grid": land on the nearest free cell.
          p = snapToFreeCell(p, others, grid, monitor.width, monitor.height);
          if (slot) st.notify('Para dejar iconos sobre los muebles desactiva "Alinear iconos a la cuadrícula" (o usa 🪄 Organizar)');
        } else if (slot) p = slot;
        if (p.x !== Math.round(n.x()) || p.y !== Math.round(n.y())) n.to({ x: p.x, y: p.y, duration: 0.12 });
        moveIcon(icon.id, { x: p.x + monitor.x, y: p.y + monitor.y });
      }}
    >
      <Rect
        width={w}
        height={h}
        cornerRadius={3 * k}
        fill={hover ? "rgba(255,255,255,0.18)" : "transparent"}
        stroke={hover ? "rgba(255,255,255,0.35)" : undefined}
        strokeWidth={1}
      />
      <Image image={img} x={(w - iconSize) / 2} y={iconTop} width={iconSize} height={iconSize} />
      <Text
        text={icon.name}
        x={2 * k}
        y={iconTop + iconSize + 4 * k}
        width={w - 4 * k}
        height={font * 2.6}
        align="center"
        fontSize={font}
        fontFamily="Segoe UI"
        fill="#fff"
        shadowColor="#000"
        shadowBlur={3 * k}
        shadowOpacity={0.9}
        ellipsis
        wrap="word"
      />
    </Group>
  );
}

function Grid({ w, h, size }: { w: number; h: number; size: number }) {
  const lines = [];
  for (let x = size; x < w; x += size) lines.push(<Line key={`x${x}`} points={[x, 0, x, h]} stroke="#fff" opacity={0.25} strokeWidth={1} strokeScaleEnabled={false} />);
  for (let y = size; y < h; y += size) lines.push(<Line key={`y${y}`} points={[0, y, w, y]} stroke="#fff" opacity={0.25} strokeWidth={1} strokeScaleEnabled={false} />);
  return <>{lines}</>;
}

const strokeProps = (st: Omit<Stroke, "points">) => ({
  stroke: st.erase ? "#000" : st.color,
  strokeWidth: st.size,
  opacity: st.opacity,
  lineCap: "round" as const,
  lineJoin: "round" as const,
  tension: 0.4,
  // Erasing only clears pixels of its own layer canvas.
  globalCompositeOperation: st.erase ? ("destination-out" as const) : ("source-over" as const),
  listening: false,
  perfectDrawEnabled: false,
});

const Strokes = memo(({ strokes }: { strokes: Stroke[] }) => (
  <>
    {strokes.map((st, i) => (
      <Line key={i} points={st.points} {...strokeProps(st)} />
    ))}
  </>
));

export default function Editor({ stageRef }: { stageRef: React.RefObject<Konva.Stage | null> }) {
  const doc = useDoc();
  const s = useStore();
  const monitor = s.monitors[s.monitorIndex];
  const { ref, scale } = useFit(monitor);
  const trRef = useRef<Konva.Transformer>(null);
  const others = useRef<Box[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  // In-progress stroke: points live in a ref and the Line is updated imperatively.
  const [drawing, setDrawing] = useState<(Omit<Stroke, "points"> & { layerId: string }) | null>(null);
  const points = useRef<number[]>([]);
  const liveLine = useRef<Konva.Line>(null);
  const cursor = useRef<Konva.Circle>(null);

  // Attach the transformer to the selected nodes.
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    tr.nodes(s.selection.map((id) => stage.findOne("#" + id)).filter((n): n is Konva.Node => !!n));
    tr.getLayer()?.batchDraw();
  }, [s.selection, doc]);

  const onPointerDown = useCallback((id: string, shift: boolean) => {
    const { selection, select } = useStore.getState();
    if (shift) select(selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]);
    else if (!selection.includes(id)) select([id]);
  }, []);

  const onChange = useCallback((id: string, patch: Partial<Obj>) => {
    useStore.getState().updateObjects([id], patch, "transform");
  }, []);

  if (!monitor || !doc || !s.desktop) return <div className="stage-wrap" ref={ref} />;

  const canvas: Box = { x: 0, y: 0, width: doc.width, height: doc.height };
  const isObject = (n: Konva.Node) => n.name() === "object";

  const onDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = stageRef.current!;
    if (!isObject(e.target)) return;
    const moving = new Set(useStore.getState().selection);
    others.current = stage
      .find(".object")
      .filter((n) => !moving.has(n.id()) && n.isVisible())
      .map((n) => n.getClientRect({ relativeTo: stage, skipShadow: true }));
  };

  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const n = e.target;
    if (!isObject(n) || !s.snap) return;
    const stage = stageRef.current!;
    const r = snapBox(n.getClientRect({ relativeTo: stage, skipShadow: true }), others.current, canvas, 8 / scale, s.grid ? s.gridSize : 0);
    n.position({ x: n.x() + r.dx, y: n.y() + r.dy });
    setGuides(r.guides);
  };

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!isObject(e.target)) return;
    setGuides([]);
    const stage = stageRef.current!;
    // Dragging one node of a multi-selection moves all of them.
    const { selection } = useStore.getState();
    const ids = selection.includes(e.target.id()) ? selection : [e.target.id()];
    s.commit((_, d) => {
      for (const l of d.layers)
        for (const o of l.objects)
          if (ids.includes(o.id)) {
            const n = stage.findOne("#" + o.id);
            if (n) (o.x = n.x()), (o.y = n.y());
          }
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-deskcanvas");
    const files = Array.from(e.dataTransfer.files);
    const stage = stageRef.current;
    if ((!raw && !files.length) || !stage) return;
    stage.setPointersPositions(e);
    const p = stage.getRelativePointerPosition();
    if (!p) return;
    if (raw) return s.addObject({ ...JSON.parse(raw), x: p.x, y: p.y });
    // Files dropped from the Explorer: images and videos land where they are dropped.
    files.forEach((f, i) =>
      readImage(f).then(
        (o) => s.addObject({ ...o, x: p.x + i * 30, y: p.y + i * 30 }),
        (err) => s.notify(String(err.message ?? err), true),
      ),
    );
  };

  const drawTool = s.tool !== "select";

  const startStroke = () => {
    const p = stageRef.current?.getRelativePointerPosition();
    if (!p) return;
    const erase = s.tool === "eraser";
    const layerId = s.drawingLayerId();
    if (erase && !layerId) return s.notify("No hay ninguna capa de dibujo visible y desbloqueada que borrar");
    points.current = [p.x, p.y, p.x + 0.01, p.y];
    setDrawing({ layerId: layerId ?? "ui", erase, ...s.brush });
  };

  const onPointerMove = () => {
    const p = stageRef.current?.getRelativePointerPosition();
    if (!p) return;
    cursor.current?.position(p);
    cursor.current?.getLayer()?.batchDraw();
    if (!drawing) return;
    const pts = points.current;
    const [lx, ly] = pts.slice(-2);
    if (Math.hypot(p.x - lx, p.y - ly) < 1.5) return;
    pts.push(p.x, p.y);
    liveLine.current?.points(pts);
    liveLine.current?.getLayer()?.batchDraw();
  };

  const endStroke = () => {
    if (!drawing) return;
    const { layerId: _, ...rest } = drawing;
    s.addStroke({ ...rest, points: [...points.current] });
    setDrawing(null);
  };

  const live = (layerId: string) =>
    drawing?.layerId === layerId && <Line ref={liveLine} points={points.current} {...strokeProps(drawing)} />;

  // Follow the user's Windows setting: snap icons only when "Align icons to grid" is on.
  const iconGrid = (() => {
    const d = s.desktop!;
    if (!d.snapToGrid || d.autoArrange) return null;
    const rel = (list: DesktopIcon[]) =>
      list.flatMap((i) => {
        const m = s.monitors.find((m) => onMonitor(i, m));
        return m ? [{ x: i.x - m.x, y: i.y - m.y }] : [];
      });
    const here = d.icons.filter((i) => onMonitor(i, monitor));
    return gridFromIcons(rel(here.length ? here : d.icons), d.cellWidth, d.cellHeight);
  })();

  const singleImage = s.selection.length === 1 && findObj(doc, s.selection[0])?.type === "image";

  return (
    <div className="stage-wrap" ref={ref} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <Stage
        ref={stageRef}
        width={monitor.width * scale}
        height={monitor.height * scale}
        scaleX={scale}
        scaleY={scale}
        className="stage"
        style={{ cursor: drawTool ? "none" : "default" }}
        onMouseDown={(e) => {
          if (drawTool) return startStroke();
          if (e.target === e.target.getStage() || e.target.getLayer()?.name() === "background") s.select([]);
        }}
        onMouseMove={onPointerMove}
        onMouseUp={endStroke}
        onMouseLeave={() => {
          endStroke();
          cursor.current?.position({ x: -999, y: -999 });
          cursor.current?.getLayer()?.batchDraw();
        }}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
      >
        {doc.layers.map((l) => {
          if (l.kind === "background")
            return (
              <Layer key={l.id} name="background" visible={l.visible} listening={!l.locked}>
                <BackgroundFill bg={doc.background} w={doc.width} h={doc.height} />
              </Layer>
            );
          if (l.kind === "icons")
            return (
              <Layer key={l.id} name="icons" visible={l.visible} listening={!l.locked && !drawTool}>
                {s.desktop!.icons.filter((i) => onMonitor(s.positions[i.id], monitor)).map((i) => (
                  <IconNode key={i.id} icon={i} monitor={monitor} draggable={!l.locked} grid={iconGrid} />
                ))}
              </Layer>
            );
          return (
            <Layer key={l.id} name={l.guide ? "guide" : l.kind} visible={l.visible} listening={!l.locked && !drawTool}>
              {l.objects.map((o) => (
                <ObjectNode key={o.id} o={o} draggable={!l.locked} onPointerDown={onPointerDown} onChange={onChange} />
              ))}
              <Strokes strokes={l.strokes} />
              {live(l.id)}
            </Layer>
          );
        })}
        <Layer name="ui" listening={!drawTool}>
          {s.grid && <Grid w={doc.width} h={doc.height} size={s.gridSize} />}
          {live("ui")}
          {drawTool && (
            <Circle
              ref={cursor}
              x={-999}
              y={-999}
              radius={s.brush.size / 2}
              stroke={s.tool === "eraser" ? "#ff3d9a" : "#fff"}
              strokeWidth={1.5}
              strokeScaleEnabled={false}
              shadowColor="#000"
              shadowBlur={2}
              dash={s.tool === "eraser" ? [4, 3] : undefined}
            />
          )}
          {guides.map((g, i) => (
            <Line
              key={i}
              points={g.axis === "x" ? [g.at, 0, g.at, doc.height] : [0, g.at, doc.width, g.at]}
              stroke="#ff3d9a"
              strokeWidth={1.5}
              strokeScaleEnabled={false}
              dash={[6, 4]}
              listening={false}
            />
          ))}
          <Transformer
            ref={trRef}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            keepRatio={singleImage}
            flipEnabled={false}
            anchorCornerRadius={4}
            anchorStroke="#8b5cf6"
            borderStroke="#8b5cf6"
            boundBoxFunc={(oldBox, box) => (Math.abs(box.width) < 8 || Math.abs(box.height) < 8 ? oldBox : box)}
          />
        </Layer>
      </Stage>
    </div>
  );
}

const onMonitor = (p: { x: number; y: number } | undefined, m: Monitor) =>
  !!p && p.x >= m.x && p.x < m.x + m.width && p.y >= m.y && p.y < m.y + m.height;

export const findObj = (doc: Doc, id: string) => doc.layers.flatMap((l) => l.objects).find((o) => o.id === id);
