import { memo, useEffect, useRef, useState } from "react";
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

/** Plays a muted looping video into a Konva image; exports keep the current frame. */
function VideoBody({ o }: { o: Obj }) {
  const ref = useRef<Konva.Image>(null);
  const [video, setVideo] = useState<HTMLVideoElement>();
  useEffect(() => {
    const v = document.createElement("video");
    Object.assign(v, { src: o.src ?? "", muted: true, loop: true, playsInline: true, autoplay: true });
    v.onloadeddata = () => {
      setVideo(v);
      v.play().catch(() => {});
    };
    return () => {
      v.onloadeddata = null;
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
  }, [o.src]);
  useEffect(() => {
    const layer = ref.current?.getLayer();
    if (!video || !layer) return;
    const anim = new Konva.Animation(() => {}, layer);
    anim.start();
    return () => void anim.stop();
  }, [video]);
  return <Image ref={ref} image={video} width={o.width} height={o.height} />;
}

/** Sticky note: paper with soft shadow, curled corner and a strip of washi tape. */
function NoteBody({ o }: { o: Obj }) {
  const { width: w, height: h } = o;
  const paper = o.fill ?? "#fff3a8";
  const fold = Math.min(w, h) * 0.14;
  const pad = Math.max(16, Math.min(w, h) * 0.1);
  const tapeW = Math.min(w * 0.45, 180);
  const tapeH = Math.max(22, Math.min(h * 0.12, 44));
  return (
    <>
      <Line
        points={[0, 0, w, 0, w, h - fold, w - fold, h, 0, h]}
        closed
        fill={paper}
        shadowColor="#2b1d33"
        shadowBlur={Math.min(w, h) * 0.08}
        shadowOffsetY={Math.min(w, h) * 0.04}
        shadowOpacity={0.3}
      />
      {/* Light from above, as on real paper. */}
      <Line
        points={[0, 0, w, 0, w, h - fold, w - fold, h, 0, h]}
        closed
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: h }}
        fillLinearGradientColorStops={[0, "rgba(255,255,255,0.45)", 0.4, "rgba(255,255,255,0)", 1, "rgba(60,30,40,0.08)"]}
      />
      <Line points={[w, h - fold, w - fold * 0.85, h - fold * 0.85, w - fold, h]} closed fill="rgba(60,30,40,0.18)" />
      <Text
        text={o.text}
        x={pad}
        y={pad + tapeH * 0.4}
        width={w - pad * 2}
        height={h - pad * 2 - tapeH * 0.4}
        fontSize={o.fontSize}
        fontFamily={o.fontFamily}
        fill={o.stroke ?? "#3b2f40"}
        lineHeight={1.25}
        wrap="word"
        ellipsis
      />
      <Rect
        x={w / 2}
        y={0}
        width={tapeW}
        height={tapeH}
        offsetX={tapeW / 2}
        offsetY={tapeH / 2}
        rotation={-3}
        fill={o.accent ?? "#f19cb7"}
        opacity={0.75}
        cornerRadius={2}
        shadowColor="#2b1d33"
        shadowBlur={4}
        shadowOpacity={0.15}
      />
    </>
  );
}

function Body({ o }: { o: Obj }) {
  const { width: w, height: h, fill, stroke, strokeWidth = 0 } = o;
  const paint = { fill, stroke, strokeWidth, strokeScaleEnabled: false };
  switch (o.type) {
    case "image":
      return <ImageBody o={o} />;
    case "video":
      return <VideoBody o={o} />;
    case "note":
      return <NoteBody o={o} />;
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
      // Double-click a text, note or box to type in its field on the right.
      onDblClick={() => document.querySelector<HTMLTextAreaElement>(".props textarea")?.select()}
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
          ...(o.type === "text" || o.type === "box" || o.type === "note" ? { fontSize: Math.max(6, (o.fontSize ?? 24) * (o.type === "text" ? sy : 1)) } : {}),
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
