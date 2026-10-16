import { useState } from "react";
import { Layer } from "../doc";
import { useDoc, useStore } from "../store";

const KIND_ICON: Record<Layer["kind"], string> = { background: "🖼", objects: "🧸", drawing: "✏️", icons: "🗂" };

function Row({ l, index, count }: { l: Layer; index: number; count: number }) {
  const s = useStore();
  const [editing, setEditing] = useState(false);
  const fixed = l.kind === "background";
  return (
    <li className={`layer ${s.activeLayerId === l.id ? "active" : ""}`} onClick={() => s.setActiveLayer(l.id)}>
      <span className="kind">{l.guide ? "📷" : KIND_ICON[l.kind]}</span>
      {editing ? (
        <input
          autoFocus
          defaultValue={l.name}
          onBlur={(e) => (s.renameLayer(l.id, e.target.value), setEditing(false))}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      ) : (
        <span className="name" onDoubleClick={() => setEditing(true)} title="Doble clic para renombrar">
          {l.name}
        </span>
      )}
      <button className="mini" title={l.visible ? "Ocultar" : "Mostrar"} onClick={(e) => (e.stopPropagation(), s.toggleLayer(l.id, "visible"))}>
        {l.visible ? "👁" : "◌"}
      </button>
      <button className="mini" title={l.locked ? "Desbloquear" : "Bloquear"} onClick={(e) => (e.stopPropagation(), s.toggleLayer(l.id, "locked"))}>
        {l.locked ? "🔒" : "🔓"}
      </button>
      <button className="mini" title="Subir capa" disabled={fixed || index === count - 1} onClick={(e) => (e.stopPropagation(), s.moveLayer(l.id, 1))}>
        ▲
      </button>
      <button className="mini" title="Bajar capa" disabled={fixed || index <= 1} onClick={(e) => (e.stopPropagation(), s.moveLayer(l.id, -1))}>
        ▼
      </button>
      <button
        className="mini"
        title="Borrar capa"
        disabled={l.kind === "background" || l.kind === "icons"}
        onClick={(e) => (e.stopPropagation(), confirm(`¿Borrar la capa "${l.name}" y su contenido?`) && s.removeLayer(l.id))}
      >
        ✕
      </button>
    </li>
  );
}

export default function Layers() {
  const doc = useDoc();
  const addLayer = useStore((s) => s.addLayer);
  if (!doc) return null;
  const n = doc.layers.length;
  return (
    <section>
      <h3>Capas</h3>
      <ul className="layers">
        {[...doc.layers].reverse().map((l, i) => (
          <Row key={l.id} l={l} index={n - 1 - i} count={n} />
        ))}
      </ul>
      <div className="row">
        <button onClick={() => addLayer("objects")}>＋ Objetos</button>
        <button onClick={() => addLayer("drawing")}>＋ Dibujo</button>
      </div>
    </section>
  );
}
