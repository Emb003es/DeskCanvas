import { memo, useEffect, useRef } from "react";
import Konva from "konva";
import { Arrow, Ellipse, Group, Image, Line, Path, Rect, Star, Text } from "react-konva";
import { Obj } from "../doc";
import useImageLoader from "./useImage";

const HEART = "M50 88 C20 66 4 50 4 30 C4 15 16 5 29 5 C38 5 46 10 50 18 C54 10 62 5 71 5 C84 5 96 15 96 30 C96 50 80 66 50 88 Z";

function ImageBody({ o }: { o: Obj }) {
  const img = useImageLoader(o.src ?? "");
  const ref = useRef<Konva.Image>(null);
  const tweak = !!(o.hue || o.saturation || o.brightness);
  // Konva filters only apply to cached nodes; re-cache when size or values change.
  useEffect(() => {
    const n = ref.current;
    if (!n || !img) return;
    if (tweak) n.cache({ pixelRatio: 2 });
    else n.clearCache();
    n.getLayer()?.batchDraw();
  }, [img, tweak, o.hue, o.saturation, o.brightness, o.width, o.height]);
  return (
    <Image
      ref={ref}
      image={img}
      width={o.width}
      height={o.height}
      filters={tweak ? [Konva.Filters.HSL, Konva.Filters.Brighten] : []}
      hue={o.hue ?? 0}
      saturation={o.saturation ?? 0}
      brightness={o.brightness ?? 0}
    />
  );
}

function Body({ o }: { o: Obj }) {
  const { width: w, height: h, fill, stroke, strokeWidth = 0 } = o;
  const paint = { fill, stroke, strokeWidth, strokeScaleEnabled: false };
  switch (o.type) {
    case "image":
      return <ImageBody o={o} />;
    case "text":
      return (
        <Text
          text={o.text}
          width={w}
          height={h}
          fontSize={o.fontSize}
          fontFamily={o.fontFamily}
          fill={fill}
          align="center"
          verticalAlign="middle"
          wrap="word"
        />
      );
    case "box": {
      const tabW = Math.min(w * 0.6, 260);
      const tabH = Math.min(h * 0.28, (o.fontSize ?? 24) * 1.7);
      return (
        <>
          <Rect width={w} height={h} cornerRadius={Math.min(w, h) * 0.08} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <Rect x={(w - tabW) / 2} y={-tabH / 2} width={tabW} height={tabH} cornerRadius={tabH / 2} fill={o.accent} />
          <Text
            text={o.text}
            x={(w - tabW) / 2}
            y={-tabH / 2}
            width={tabW}
            height={tabH}
            fontSize={o.fontSize}
            fontFamily={o.fontFamily}
            fontStyle="bold"
            fill="#3b2f40"
            align="center"
            verticalAlign="middle"
            ellipsis
            wrap="none"
          />
        </>
      );
    }
    case "shape":
      switch (o.shape) {
        case "ellipse":
          return <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} {...paint} />;
        case "triangle":
          return <Line points={[w / 2, 0, w, h, 0, h]} closed {...paint} />;
        case "star":
          return <Star x={w / 2} y={h / 2} numPoints={5} outerRadius={h / 2} innerRadius={h / 4.6} scaleX={w / h} {...paint} />;
        case "heart":
          return <Path data={HEART} scaleX={w / 100} scaleY={h / 100} {...paint} />;
        case "arrow":
          return (
            <Arrow
              points={[0, h / 2, w, h / 2]}
              pointerLength={Math.min(h, 40)}
              pointerWidth={Math.min(h, 40)}
              stroke={stroke ?? fill}
              fill={stroke ?? fill}
              strokeWidth={strokeWidth || 6}
              lineCap="round"
              hitStrokeWidth={Math.max(h, 20)}
            />
          );
        case "line":
          return <Line points={[0, h / 2, w, h / 2]} stroke={stroke ?? fill} strokeWidth={strokeWidth || 6} lineCap="round" hitStrokeWidth={Math.max(h, 20)} />;
        default:
          return <Rect width={w} height={h} cornerRadius={Math.min(w, h) * 0.12} {...paint} />;
      }
  }
}

type Props = {
  o: Obj;
  draggable: boolean;
  onPointerDown: (id: string, shift: boolean) => void;
  onChange: (id: string, patch: Partial<Obj>) => void;
};

/** One design object, positioned by its center so rotation pivots naturally. */
function ObjectNode({ o, draggable, onPointerDown, onChange }: Props) {
  return (
    <Group
      id={o.id}
      name="object"
      x={o.x}
      y={o.y}
      width={o.width}
      height={o.height}
      offsetX={o.width / 2}
      offsetY={o.height / 2}
      rotation={o.rotation}
      opacity={o.opacity}
      draggable={draggable}
      onMouseDown={(e) => onPointerDown(o.id, e.evt.shiftKey)}
      onTransformEnd={(e) => {
        const n = e.currentTarget;
        const sx = Math.abs(n.scaleX());
        const sy = Math.abs(n.scaleY());
        n.scale({ x: 1, y: 1 });
        onChange(o.id, {
          x: n.x(),
          y: n.y(),
          rotation: n.rotation(),
          width: Math.max(4, o.width * sx),
          height: Math.max(4, o.height * sy),
          ...(o.type === "text" || o.type === "box" ? { fontSize: Math.max(6, (o.fontSize ?? 24) * (o.type === "text" ? sy : 1)) } : {}),
        });
      }}
    >
      {/* Flip inside so the transformer frame stays upright. */}
      <Group x={o.flipX ? o.width : 0} y={o.flipY ? o.height : 0} scaleX={o.flipX ? -1 : 1} scaleY={o.flipY ? -1 : 1}>
        <Body o={o} />
      </Group>
    </Group>
  );
}

export default memo(ObjectNode);
