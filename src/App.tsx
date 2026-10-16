import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import Editor from "./canvas/Editor";
import Library from "./panels/Library";
import Properties from "./panels/Properties";
import Layers from "./panels/Layers";
import { monitorLabel, useDirty, useStore } from "./store";
import "./styles.css";

type Theme = "light" | "dark";

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);
  return [theme, () => setTheme(theme === "dark" ? "light" : "dark")] as const;
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const s = useStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const step = e.shiftKey ? 10 : 1;
      const handled = (() => {
        if (ctrl && k === "z" && !e.shiftKey) return s.undo(), true;
        if (ctrl && (k === "y" || (k === "z" && e.shiftKey))) return s.redo(), true;
        if (ctrl && k === "d") return s.duplicateSelected(), true;
        if (k === "delete" || k === "backspace") return s.deleteSelected(), true;
        if (k === "escape") return s.select([]), true;
        if (k === "g" && !ctrl) return s.toggle("grid"), true;
        if (!ctrl && (k === "v" || k === "b" || k === "e")) return s.setTool(k === "v" ? "select" : k === "b" ? "brush" : "eraser"), true;
        if (!ctrl && ["[", "]", "+", "-"].includes(k)) {
          const grow = k === "]" || k === "+";
          return s.setBrush({ size: Math.max(1, Math.min(200, s.brush.size + (grow ? 4 : -4))) }), true;
        }
        const arrows: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
        if (arrows[k] && s.selection.length) return s.nudge(...arrows[k]), true;
        return false;
      })();
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function App() {
  const s = useStore();
  const dirty = useDirty();
  const [theme, toggleTheme] = useTheme();
  const stageRef = useRef<Konva.Stage>(null);
  useShortcuts();

  useEffect(() => {
    s.load();
  }, []);

  const arrangeOn = s.desktop && (s.desktop.autoArrange || s.desktop.snapToGrid);
  const which = s.desktop
    ? [s.desktop.autoArrange && "Organizar automáticamente", s.desktop.snapToGrid && "Alinear iconos a la cuadrícula"].filter(Boolean).join(" y ")
    : "";

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <span className="logo">◆</span> DeskCanvas
        </div>
        <select value={s.monitorIndex} onChange={(e) => s.setMonitor(+e.target.value)} aria-label="Monitor">
          {s.monitors.map((m, i) => (
            <option key={m.name} value={i}>
              {monitorLabel(m, i)}
            </option>
          ))}
        </select>
        <div className="group">
          <button className="icon" onClick={s.undo} disabled={!s.past.length} title="Deshacer (Ctrl+Z)">
            ↶
          </button>
          <button className="icon" onClick={s.redo} disabled={!s.future.length} title="Rehacer (Ctrl+Y)">
            ↷
          </button>
        </div>
        <div className="group tools">
          <button className={s.tool === "select" ? "toggle on" : "toggle"} onClick={() => s.setTool("select")} title="Seleccionar (V)">
            ➤
          </button>
          <button className={s.tool === "brush" ? "toggle on" : "toggle"} onClick={() => s.setTool("brush")} title="Pincel (B)">
            🖌
          </button>
          <button className={s.tool === "eraser" ? "toggle on" : "toggle"} onClick={() => s.setTool("eraser")} title="Goma (E)">
            ⌫
          </button>
        </div>
        <div className="group">
          <button className={s.grid ? "toggle on" : "toggle"} onClick={() => s.toggle("grid")} title="Cuadrícula (G)">
            ▦ Cuadrícula
          </button>
          <button className={s.snap ? "toggle on" : "toggle"} onClick={() => s.toggle("snap")} title="Imán y guías al mover">
            🧲 Imán
          </button>
        </div>
        <div className="spacer" />
        <button onClick={s.load} disabled={s.busy} title="Volver a leer los iconos del escritorio">
          ⟳ Recargar
        </button>
        <button onClick={s.restore} disabled={s.busy || !s.hasSnapshot} title="Devuelve los iconos a como estaban antes del primer cambio">
          ↺ Restaurar original
        </button>
        <button className="primary" onClick={s.apply} disabled={s.busy || !dirty}>
          Aplicar al escritorio
        </button>
        <button className="icon" onClick={toggleTheme} title="Cambiar tema" aria-label="Cambiar tema">
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>

      {arrangeOn && (
        <div className="banner">
          Windows tiene activado <b>{which}</b>: recolocará los iconos por su cuenta.
          <button onClick={s.disableArrange} disabled={s.busy}>
            Desactivar
          </button>
        </div>
      )}

      <div className="body">
        <Library />
        <main className="workspace">
          <Editor stageRef={stageRef} />
        </main>
        <aside className="panel side">
          <Properties />
          <Layers />
        </aside>
      </div>

      {s.message && <div className={`toast ${s.message.error ? "error" : ""}`}>{s.message.text}</div>}
    </div>
  );
}
