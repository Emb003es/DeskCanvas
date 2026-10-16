import { useState } from "react";
import { Obj, ShapeType } from "../doc";
import { stickerPacks } from "../stickers";
import { useDoc, useStore } from "../store";

type Item = { label: string; preview: React.ReactNode; obj: Partial<Obj> & Pick<Obj, "type"> };

const shape = (s: ShapeType, label: string, glyph: string, extra: Partial<Obj> = {}): Item => ({
  label,
  preview: <span className="glyph">{glyph}</span>,
  obj: { type: "shape", shape: s, width: 220, height: 220, fill: "#c9a7e8", stroke: "#4b3a4f", strokeWidth: 0, ...extra },
});

const basics: Item[] = [
  {
    label: "Texto",
    preview: <span className="glyph">Aa</span>,
    obj: { type: "text", text: "Escribe aquí", width: 420, height: 90, fontSize: 56, fontFamily: "Segoe Print", fill: "#ffffff" },
  },
  {
    label: "Caja con etiqueta",
    preview: <span className="glyph">▭</span>,
    obj: { type: "box", text: "Juegos", width: 340, height: 260, fontSize: 26, fontFamily: "Segoe UI", fill: "rgba(255,255,255,0.35)", accent: "#f6d186", stroke: "#ffffff", strokeWidth: 3 },
  },
  shape("rect", "Rectángulo", "■"),
  shape("ellipse", "Círculo", "●"),
  shape("triangle", "Triángulo", "▲"),
  shape("star", "Estrella", "★", { fill: "#f6d186" }),
  shape("heart", "Corazón", "♥", { fill: "#f19cb7" }),
  shape("arrow", "Flecha", "➜", { height: 60, width: 260, stroke: "#ffffff", strokeWidth: 10 }),
  shape("line", "Línea", "─", { height: 30, width: 300, stroke: "#ffffff", strokeWidth: 8 }),
];

const packItems = Object.fromEntries(
  Object.entries(stickerPacks).map(([pack, list]) => [
    pack,
    list.map<Item>((s) => ({
      label: s.name,
      preview: <img src={s.src} alt="" draggable={false} />,
      obj: { type: "image", src: s.src, width: s.width * 1.2, height: s.height * 1.2 },
    })),
  ]),
);

const tabs = [...Object.keys(packItems), "Básicos"];

/** Reads a user image as a data URL and its natural size, capped to 600 px. */
function readImage(file: File): Promise<Partial<Obj> & Pick<Obj, "type">> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const src = String(r.result);
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.onload = () => {
        const k = Math.min(1, 600 / Math.max(img.width, img.height));
        resolve({ type: "image", src, width: img.width * k, height: img.height * k });
      };
      img.src = src;
    };
    r.readAsDataURL(file);
  });
}

export default function Library() {
  const [tab, setTab] = useState(tabs[0]);
  const doc = useDoc();
  const addObject = useStore((s) => s.addObject);
  const notify = useStore((s) => s.notify);
  const captureGuide = useStore((s) => s.captureGuide);
  const items = tab === "Básicos" ? basics : packItems[tab];

  const addCentered = (o: Item["obj"]) => doc && addObject({ ...o, x: doc.width / 2, y: doc.height / 2 });

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    for (const f of Array.from(e.target.files ?? [])) {
      try {
        addCentered(await readImage(f));
      } catch (err) {
        notify(String(err), true);
      }
    }
    e.target.value = "";
  };

  return (
    <aside className="panel library">
      <h3>Biblioteca</h3>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="tiles">
        {items.map((it) => (
          <button
            key={it.label}
            className="tile"
            title={`${it.label} — clic o arrastra al lienzo`}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("application/x-deskcanvas", JSON.stringify(it.obj))}
            onClick={() => addCentered(it.obj)}
          >
            {it.preview}
            <span>{it.label}</span>
          </button>
        ))}
      </div>
      <label className="import">
        ＋ Importar mis imágenes
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" multiple hidden onChange={onImport} />
      </label>
      <button
        className="import capture"
        onClick={captureGuide}
        title="Minimiza antes las demás ventanas. La captura queda como guía bloqueada y no se exporta."
      >
        📷 Capturar escritorio como guía
      </button>
    </aside>
  );
}

export { readImage };
