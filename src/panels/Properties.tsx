import { Background, Obj } from "../doc";
import { findObj } from "../canvas/Editor";
import { useDoc, useStore } from "../store";
import { readImage } from "./Library";

const FONTS = ["Segoe UI", "Segoe Print", "Segoe Script", "Georgia", "Bahnschrift", "Consolas", "Comic Sans MS", "Impact"];

/** Color inputs only accept #rrggbb; fall back for rgba() values. */
const hex = (c: string | undefined, fallback = "#ffffff") => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function BackgroundPanel() {
  const doc = useDoc();
  const setBackground = useStore((s) => s.setBackground);
  const notify = useStore((s) => s.notify);
  if (!doc) return null;
  const bg = doc.background;
  const base = bg.kind === "color" ? bg.color : bg.kind === "gradient" ? bg.from : bg.color;

  const setKind = (kind: Background["kind"]) => {
    if (kind === "color") setBackground({ kind, color: base });
    if (kind === "gradient") setBackground({ kind, from: base, to: "#9cc3ea", angle: 135 });
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const { src } = await readImage(f);
      setBackground({ kind: "image", src: src!, color: base });
    } catch (err) {
      notify(String(err), true);
    }
  };

  return (
    <section>
      <h3>Fondo</h3>
      <div className="segmented">
        <button className={bg.kind === "color" ? "active" : ""} onClick={() => setKind("color")}>
          Color
        </button>
        <button className={bg.kind === "gradient" ? "active" : ""} onClick={() => setKind("gradient")}>
          Degradado
        </button>
        <label className={`btn ${bg.kind === "image" ? "active" : ""}`}>
          Imagen
          <input type="file" accept="image/*" hidden onChange={onImage} />
        </label>
      </div>
      {bg.kind === "color" && (
        <Field label="Color">
          <input type="color" value={hex(bg.color)} onChange={(e) => setBackground({ ...bg, color: e.target.value }, "bg")} />
        </Field>
      )}
      {bg.kind === "gradient" && (
        <>
          <Field label="Desde">
            <input type="color" value={hex(bg.from)} onChange={(e) => setBackground({ ...bg, from: e.target.value }, "bg")} />
          </Field>
          <Field label="Hasta">
            <input type="color" value={hex(bg.to)} onChange={(e) => setBackground({ ...bg, to: e.target.value }, "bg")} />
          </Field>
          <Field label={`Ángulo ${bg.angle}°`}>
            <input type="range" min={0} max={360} value={bg.angle} onChange={(e) => setBackground({ ...bg, angle: +e.target.value }, "bg")} />
          </Field>
        </>
      )}
      {bg.kind === "image" && (
        <Field label="Color de relleno">
          <input type="color" value={hex(bg.color)} onChange={(e) => setBackground({ ...bg, color: e.target.value }, "bg")} />
        </Field>
      )}
    </section>
  );
}

function ObjectPanel({ o, ids }: { o: Obj; ids: string[] }) {
  const s = useStore();
  const upd = (patch: Partial<Obj>, key?: string) => s.updateObjects(ids, patch, key);
  const paintable = o.type === "shape" || o.type === "box";

  return (
    <section>
      <h3>{ids.length > 1 ? `${ids.length} objetos` : "Objeto"}</h3>
      <div className="row">
        <button onClick={() => s.flip("x")} title="Voltear horizontal">⇋ Voltear</button>
        <button onClick={() => s.flip("y")} title="Voltear vertical">⇵</button>
        <button onClick={s.duplicateSelected} title="Duplicar (Ctrl+D)">⧉</button>
        <button onClick={s.deleteSelected} title="Borrar (Supr)">🗑</button>
      </div>
      <div className="row">
        <button onClick={() => s.reorder("top")} title="Traer al frente">⤒</button>
        <button onClick={() => s.reorder("up")} title="Subir">↑</button>
        <button onClick={() => s.reorder("down")} title="Bajar">↓</button>
        <button onClick={() => s.reorder("bottom")} title="Enviar al fondo">⤓</button>
      </div>
      {(o.type === "text" || o.type === "box") && (
        <>
          <Field label={o.type === "box" ? "Etiqueta" : "Texto"}>
            <textarea rows={2} value={o.text} onChange={(e) => upd({ text: e.target.value }, "text")} />
          </Field>
          <Field label="Fuente">
            <select value={o.fontFamily} onChange={(e) => upd({ fontFamily: e.target.value })}>
              {FONTS.map((f) => (
                <option key={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Tamaño ${Math.round(o.fontSize ?? 24)}`}>
            <input type="range" min={8} max={200} value={o.fontSize} onChange={(e) => upd({ fontSize: +e.target.value }, "font")} />
          </Field>
        </>
      )}
      {(paintable || o.type === "text") && (
        <Field label={o.type === "text" ? "Color" : "Relleno"}>
          <input type="color" value={hex(o.fill)} onChange={(e) => upd({ fill: e.target.value }, "fill")} />
        </Field>
      )}
      {o.type === "box" && (
        <Field label="Color etiqueta">
          <input type="color" value={hex(o.accent)} onChange={(e) => upd({ accent: e.target.value }, "accent")} />
        </Field>
      )}
      {paintable && (
        <>
          <Field label="Borde">
            <input type="color" value={hex(o.stroke, "#4b3a4f")} onChange={(e) => upd({ stroke: e.target.value }, "stroke")} />
          </Field>
          <Field label={`Grosor borde ${o.strokeWidth ?? 0}`}>
            <input type="range" min={0} max={40} value={o.strokeWidth ?? 0} onChange={(e) => upd({ strokeWidth: +e.target.value }, "sw")} />
          </Field>
        </>
      )}
      <Field label={`Opacidad ${Math.round(o.opacity * 100)}%`}>
        <input type="range" min={5} max={100} value={Math.round(o.opacity * 100)} onChange={(e) => upd({ opacity: +e.target.value / 100 }, "opacity")} />
      </Field>
      <Field label={`Rotación ${Math.round(o.rotation)}°`}>
        <input type="range" min={-180} max={180} value={Math.round(o.rotation)} onChange={(e) => upd({ rotation: +e.target.value }, "rot")} />
      </Field>
    </section>
  );
}

const SWATCHES = ["#ffffff", "#2b2730", "#f6d186", "#e27d60", "#f19cb7", "#c9a7e8", "#85cdca", "#7fb685"];

function BrushPanel() {
  const { tool, brush, setBrush } = useStore();
  const eraser = tool === "eraser";
  return (
    <section>
      <h3>{eraser ? "Goma" : "Pincel"}</h3>
      {!eraser && (
        <>
          <div className="swatches">
            {SWATCHES.map((c) => (
              <button
                key={c}
                className={`swatch ${brush.color === c ? "on" : ""}`}
                style={{ background: c }}
                onClick={() => setBrush({ color: c })}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <Field label="Color">
            <input type="color" value={hex(brush.color)} onChange={(e) => setBrush({ color: e.target.value })} />
          </Field>
        </>
      )}
      <Field label={`Grosor ${brush.size}px  ·  teclas + y −`}>
        <input type="range" min={1} max={200} value={brush.size} onChange={(e) => setBrush({ size: +e.target.value })} />
      </Field>
      <Field label={`Opacidad ${Math.round(brush.opacity * 100)}%`}>
        <input type="range" min={5} max={100} value={Math.round(brush.opacity * 100)} onChange={(e) => setBrush({ opacity: +e.target.value / 100 })} />
      </Field>
      <p className="hint">{eraser ? "Borra solo en la capa de dibujo activa." : "Dibuja en la capa de dibujo activa (se crea una si no hay)."}</p>
    </section>
  );
}

export default function Properties() {
  const doc = useDoc();
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const first = doc && selection.length ? findObj(doc, selection[0]) : undefined;
  return (
    <div className="props">
      {tool !== "select" ? <BrushPanel /> : first ? <ObjectPanel o={first} ids={selection} /> : <BackgroundPanel />}
    </div>
  );
}
