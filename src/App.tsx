import { useEffect, useState } from "react";
import Editor from "./canvas/Editor";
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

export default function App() {
  const s = useStore();
  const dirty = useDirty();
  const [theme, toggleTheme] = useTheme();

  useEffect(() => {
    s.load();
  }, []);

  const arrangeOn = s.desktop && (s.desktop.autoArrange || s.desktop.snapToGrid);
  const which = s.desktop
    ? [s.desktop.autoArrange && "Organizar automáticamente", s.desktop.snapToGrid && "Alinear iconos a la cuadrícula"]
        .filter(Boolean)
        .join(" y ")
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

      <main className="workspace">
        <Editor />
      </main>

      {s.message && <div className={`toast ${s.message.error ? "error" : ""}`}>{s.message.text}</div>}
    </div>
  );
}
