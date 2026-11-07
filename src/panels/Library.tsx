import { useState } from "react";
import { Obj, ShapeType } from "../doc";
import { stickerPacks, templates } from "../stickers";
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

const note = (label: string, fill: string, accent: string, text: string, fontFamily = "Segoe Print"): Item => ({
  label,
  preview: <span className="note-chip" style={{ background: fill, ["--tape" as string]: accent }} />,
  obj: { type: "note", text, width: 320, height: 300, rotation: -2, fontSize: 30, fontFamily, fill, accent, stroke: "#3b2f40" },
});

const notes: Item[] = [
  note("Amarilla", "#fff3a8", "#f19cb7", "No olvidar:\n• "),
  note("Rosa", "#ffd1dc", "#85cdca", "Ideas ✨"),
  note("Menta", "#c9f2dc", "#f6d186", "Tareas\n☐ \n☐ "),
  note("Cielo", "#cfe6ff", "#f3a256", "Hoy"),
  note("Lila", "#e6d7ff", "#7fb685", "Notas"),
  note("Melocotón", "#ffdcc2", "#c9a7e8", "Recordatorio"),
  note("Papel", "#fffdf6", "#b8b8c8", "Querido yo del futuro…", "Segoe Script"),
  note("Noche", "#2f2a3f", "#ff3d9a", "Modo concentración", "Bahnschrift"),
];
notes[notes.length - 1].obj.stroke = "#f4ecff";

const packItems = Object.fromEntries(
  Object.entries(stickerPacks).map(([pack, list]) => [
    pack,
    list.map<Item>((s) => ({
      label: s.name,
      preview: <img src={s.src} alt="" draggable={false} />,
      obj: { type: "image", src: s.src, width: s.width, height: s.height, slots: s.slots },
    })),
  ]),
);

const tabs = ["Plantillas", "Notas", ...Object.keys(packItems), "Básicos"];

/** Videos are embedded in the project as data URLs, so keep them reasonable. */
const MAX_VIDEO = 200 * 1024 * 1024;

/** Reads a user image or video as a data URL and its natural size, capped to 600 px. */
function readImage(file: File): Promise<Partial<Obj> & Pick<Obj, "type">> {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith("video/");
    if (isVideo && file.size > MAX_VIDEO) return reject(new Error(`${file.name}: el vídeo pasa de 200 MB`));
    if (!isVideo && !file.type.startsWith("image/")) return reject(new Error(`${file.name}: no es una imagen ni un vídeo`));
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const src = String(r.result);
      if (isVideo) {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onerror = () => reject(new Error(`${file.name}: formato de vídeo no compatible (prueba MP4 o WebM)`));
        v.onloadedmetadata = () => {
          const k = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
          resolve({ type: "video", src, width: v.videoWidth * k, height: v.videoHeight * k });
        };
        v.src = src;
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error(`${file.name}: formato de imagen no compatible`));
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
  const applyTemplate = useStore((s) => s.applyTemplate);
  const items = tab === "Básicos" ? basics : tab === "Notas" ? notes : packItems[tab] ?? [];

  const addCentered = (o: Item["obj"]) => doc && addObject({ ...o, x: doc.width / 2, y: doc.height / 2 });

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    for (const f of Array.from(e.target.files ?? [])) {
      try {
        addCentered(await readImage(f));
      } catch (err) {
        notify(String((err as Error).message ?? err), true);
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
      {tab === "Plantillas" && (
        <div className="templates">
          <p className="hint">Una habitación ya amueblada. Luego pulsa 🪄 Organizar y los iconos se colocan solos en los muebles.</p>
          {templates.map((t) => (
            <button key={t.name} className="bg-thumb" onClick={() => applyTemplate(t)} title={`Usar plantilla ${t.name}`}>
              <span className="tpl-preview">
                <img src={t.background} alt="" draggable={false} />
                {t.items.map((it, i) => (
                  <img
                    key={i}
                    src={it.src}
                    alt=""
                    draggable={false}
                    style={{
                      left: `${((it.x - it.width / 2) / 1920) * 100}%`,
                      top: `${((it.y - it.height / 2) / 1080) * 100}%`,
                      width: `${(it.width / 1920) * 100}%`,
                    }}
                  />
                ))}
              </span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      )}
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
        ＋ Importar imágenes o vídeos
        <input type="file" accept="image/*,video/*" multiple hidden onChange={onImport} />
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
