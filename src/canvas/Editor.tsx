import { useEffect, useRef, useState } from "react";
import { Group, Image, Layer, Rect, Stage, Text } from "react-konva";
import useImageLoader from "./useImage";
import { DesktopIcon, Monitor } from "../api";
import { useStore } from "../store";

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

function IconNode({ icon, monitor }: { icon: DesktopIcon; monitor: Monitor }) {
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
      draggable
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragMove={(e) => {
        const n = e.target;
        n.x(Math.max(0, Math.min(monitor.width - w, n.x())));
        n.y(Math.max(0, Math.min(monitor.height - h, n.y())));
      }}
      onDragEnd={(e) =>
        moveIcon(icon.id, { x: Math.round(e.target.x()) + monitor.x, y: Math.round(e.target.y()) + monitor.y })
      }
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

export default function Editor() {
  const { monitors, monitorIndex, desktop } = useStore();
  const monitor = monitors[monitorIndex];
  const { ref, scale } = useFit(monitor);
  const positions = useStore((s) => s.positions);

  const onMonitor = (id: string) => {
    const p = positions[id];
    return p && monitor && p.x >= monitor.x && p.x < monitor.x + monitor.width && p.y >= monitor.y && p.y < monitor.y + monitor.height;
  };

  return (
    <div className="stage-wrap" ref={ref}>
      {monitor && desktop && (
        <Stage width={monitor.width * scale} height={monitor.height * scale} scaleX={scale} scaleY={scale} className="stage">
          <Layer listening={false}>
            <Rect
              width={monitor.width}
              height={monitor.height}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: monitor.width, y: monitor.height }}
              fillLinearGradientColorStops={[0, "#f6c8a8", 0.5, "#c9a7e8", 1, "#7fb3e6"]}
            />
          </Layer>
          <Layer>
            {desktop.icons.filter((i) => onMonitor(i.id)).map((i) => (
              <IconNode key={i.id} icon={i} monitor={monitor} />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
