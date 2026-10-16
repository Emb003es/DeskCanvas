import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "./api";
import { renderDesign } from "./export";
import Editor from "./canvas/Editor";
import Library from "./panels/Library";
import Properties from "./panels/Properties";
import Layers from "./panels/Layers";
import { hasUnsaved, monitorLabel, useDirty, useStore } from "./store";
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
      const fileKey = (e.ctrlKey || e.metaKey) && ["s", "o", "n"].includes(e.key.toLowerCase());
      if (t.closest("input, textarea, select") && !fileKey) return;
      const s = useStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const step = e.shiftKey ? 10 : 1;
      const handled = (() => {
        if (ctrl && k === "s") return s.saveProject(e.shiftKey), true;
        if (ctrl && k === "o") return s.openProject(), true;
        if (ctrl && k === "n") return s.newProject(), true;
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

  const monitor = s.monitors[s.monitorIndex];

  const exportImage = async () => {
    const stage = stageRef.current;
    if (!stage || !monitor) return;
    const path = await save({
      title: "Exportar fondo",
      defaultPath: `DeskCanvas ${monitor.width}x${monitor.height}.png`,
      filters: [
        { name: "PNG", extensions: ["png"] },
        { name: "JPG", extensions: ["jpg", "jpeg"] },
      ],
    });
    if (!path) return;
    const jpg = /\.jpe?g$/i.test(path);
    try {
      await api.saveImage(path, renderDesign(stage, monitor.width, monitor.height, jpg ? "image/jpeg" : "image/png"));
      s.notify(`Guardado: ${path}`);
    } catch (e) {
      s.notify(String(e), true);
    }
  };

  const applyWallpaper = async () => {
    const stage = stageRef.current;
    if (!stage || !monitor) return;
    try {
      await api.applyWallpaper(monitor.x, monitor.y, renderDesign(stage, monitor.width, monitor.height));
      s.notify(`Fondo aplicado en la ${monitorLabel(monitor, s.monitorIndex).split(" ·")[0]}`);
    } catch (e) {
      s.notify(String(e), true);
    }
  };

  useEffect(() => {
    s.load();
  }, []);

  const unsaved = useStore(hasUnsaved);
  const projectName = s.projectPath?.split(/[\\/]/).pop()?.replace(/\.deskcanvas$/i, "") ?? "Sin título";
  useEffect(() => {
    getCurrentWindow().setTitle(`${unsaved ? "• " : ""}${projectName} — DeskCanvas`);
  }, [unsaved, projectName]);

  // Ask before closing with unsaved changes.
  useEffect(() => {
    const off = getCurrentWindow().onCloseRequested((e) => {
      if (hasUnsaved(useStore.getState()) && !confirm("Hay cambios sin guardar. ¿Cerrar DeskCanvas igualmente?")) e.preventDefault();
    });
    return () => void off.then((f) => f());
  }, []);

  const arrangeOn = s.desktop && (s.desktop.autoArrange || s.desktop.snapToGrid);
  const which = s.desktop
    ? [s.desktop.autoArrange && "Organizar automáticamente", s.desktop.snapToGrid && "Alinear iconos a la cuadrícula"].filter(Boolean).join(" y ")
    : "";

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <span className="logo">◆</span> <span className="name">DeskCanvas</span>
        </div>
        <div className="group file">
          <button className="icon" onClick={s.newProject} title="Nuevo diseño (Ctrl+N)">
            📄
          </button>
          <button className="icon" onClick={s.openProject} title="Abrir proyecto (Ctrl+O)">
            📂
          </button>
          <button className="icon" onClick={() => s.saveProject()} title={`Guardar proyecto (Ctrl+S)${s.projectPath ? " · " + s.projectPath : ""}`}>
            💾
          </button>
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
          <button className={s.grid ? "toggle icon on" : "toggle icon"} onClick={() => s.toggle("grid")} title="Cuadrícula (G)">
            ▦
          </button>
          <button className={s.snap ? "toggle icon on" : "toggle icon"} onClick={() => s.toggle("snap")} title="Imán y guías al mover">
            🧲
          </button>
        </div>
        <div className="spacer" />
        <button onClick={exportImage} title="Guardar el fondo como PNG o JPG, sin los iconos">
          ⬇ Exportar
        </button>
        <button className="accent-soft" onClick={applyWallpaper} title="Establece el diseño como fondo de este monitor">
          🖼 Aplicar como fondo
        </button>
        <span className="divider" />
        <button className="icon" onClick={s.load} disabled={s.busy} title="Volver a leer los iconos del escritorio">
          ⟳
        </button>
        <button className="icon" onClick={s.restore} disabled={s.busy || !s.hasSnapshot} title="Restaurar iconos: vuelven a como estaban antes del primer cambio">
          ↺
        </button>
        <button className="primary" onClick={s.apply} disabled={s.busy || !dirty}>
          Aplicar iconos
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
