import { create } from "zustand";
import { produce, type Draft } from "immer";
import { api, DesktopState, Monitor } from "./api";
import { Background, Doc, Layer, LayerKind, Obj, Stroke, newDoc, newLayer, newObj, uid } from "./doc";

type Pos = { x: number; y: number };
export type Tool = "select" | "brush" | "eraser";
export type Brush = { color: string; size: number; opacity: number };

/** Everything undo/redo covers. */
type Snapshot = { docs: Record<string, Doc>; positions: Record<string, Pos> };

type State = Snapshot & {
  monitors: Monitor[];
  monitorIndex: number;
  desktop: DesktopState | null;
  hasSnapshot: boolean;
  busy: boolean;
  message: { text: string; error?: boolean } | null;
  past: Snapshot[];
  future: Snapshot[];
  selection: string[];
  activeLayerId: string | null;
  grid: boolean;
  snap: boolean;
  gridSize: number;
  tool: Tool;
  brush: Brush;

  load: () => Promise<void>;
  setMonitor: (i: number) => void;
  moveIcon: (id: string, pos: Pos) => void;
  apply: () => Promise<void>;
  restore: () => Promise<void>;
  disableArrange: () => Promise<void>;
  notify: (text: string, error?: boolean) => void;

  /** Records an undoable change. Calls with the same `key` within 600 ms merge into one step. */
  commit: (recipe: (s: Draft<Snapshot>, doc: Draft<Doc>) => void, key?: string) => void;
  undo: () => void;
  redo: () => void;

  select: (ids: string[]) => void;
  addObject: (o: Partial<Obj> & Pick<Obj, "type">) => void;
  updateObjects: (ids: string[], patch: Partial<Obj>, key?: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  nudge: (dx: number, dy: number) => void;
  flip: (axis: "x" | "y") => void;
  reorder: (dir: "up" | "down" | "top" | "bottom") => void;
  setBackground: (bg: Background, key?: string) => void;

  setActiveLayer: (id: string) => void;
  addLayer: (kind: Extract<LayerKind, "objects" | "drawing">) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, dir: 1 | -1) => void;
  toggleLayer: (id: string, prop: "visible" | "locked") => void;
  renameLayer: (id: string, name: string) => void;
  toggle: (prop: "grid" | "snap") => void;
  setTool: (tool: Tool) => void;
  setBrush: (patch: Partial<Brush>) => void;
  /** Layer that receives strokes: the active drawing layer, else the topmost unlocked one. */
  drawingLayerId: () => string | undefined;
  addStroke: (stroke: Stroke) => void;
};

export const monitorLabel = (m: Monitor, i: number) =>
  `Pantalla ${i + 1}${m.primary ? " (principal)" : ""} · ${m.width}×${m.height}`;

/** Finds which layer holds an object. */
const layerOf = (doc: Doc | Draft<Doc>, id: string) => doc.layers.find((l) => l.objects.some((o) => o.id === id));

export const useStore = create<State>((set, get) => {
  const run = async (fn: () => Promise<void>, ok?: string) => {
    set({ busy: true });
    try {
      await fn();
      if (ok) get().notify(ok);
    } catch (e) {
      get().notify(String(e), true);
    } finally {
      set({ busy: false });
    }
  };

  const reloadDesktop = async () => {
    const [desktop, hasSnapshot] = await Promise.all([api.getDesktop(), api.hasSnapshot()]);
    const positions = Object.fromEntries(desktop.icons.map((i) => [i.id, { x: i.x, y: i.y }]));
    set({ desktop, positions, hasSnapshot });
  };

  /** Makes sure the selected monitor has a document (not an undo step). */
  const ensureDoc = () => {
    const m = get().monitors[get().monitorIndex];
    if (m && !get().docs[m.name]) set({ docs: { ...get().docs, [m.name]: newDoc(m.width, m.height) } });
  };

  let lastKey: string | undefined;
  let lastTime = 0;

  const selectedIds = () => new Set(get().selection);

  return {
    monitors: [],
    monitorIndex: 0,
    desktop: null,
    positions: {},
    docs: {},
    hasSnapshot: false,
    busy: false,
    message: null,
    past: [],
    future: [],
    selection: [],
    activeLayerId: null,
    grid: false,
    snap: true,
    gridSize: 40,
    tool: "select",
    brush: { color: "#ffffff", size: 12, opacity: 1 },

    load: () =>
      run(async () => {
        const monitors = await api.getMonitors();
        const primary = Math.max(0, monitors.findIndex((m) => m.primary));
        set({ monitors, monitorIndex: get().monitors.length ? get().monitorIndex : primary });
        ensureDoc();
        await reloadDesktop();
      }),

    setMonitor: (monitorIndex) => {
      set({ monitorIndex, selection: [], activeLayerId: null });
      ensureDoc();
    },

    moveIcon: (id, pos) => get().commit((s) => void (s.positions[id] = pos)),

    apply: () =>
      run(async () => {
        const { desktop, positions } = get();
        const moves = (desktop?.icons ?? [])
          .filter((i) => positions[i.id].x !== i.x || positions[i.id].y !== i.y)
          .map((i) => ({ id: i.id, ...positions[i.id] }));
        await api.applyLayout(moves);
        // Re-read: Windows may snap icons to its grid.
        await reloadDesktop();
      }, "Iconos colocados en el escritorio"),

    restore: () =>
      run(async () => {
        await api.restoreLayout();
        await reloadDesktop();
      }, "Disposición original restaurada"),

    disableArrange: () =>
      run(async () => {
        await api.setFlags(false, false);
        await reloadDesktop();
      }, "Organizar automáticamente y alinear a la cuadrícula desactivados"),

    notify: (text, error) => {
      set({ message: { text, error } });
      setTimeout(() => get().message?.text === text && set({ message: null }), 4000);
    },

    commit: (recipe, key) => {
      const { docs, positions, past, monitors, monitorIndex } = get();
      const name = monitors[monitorIndex]?.name;
      if (!name || !docs[name]) return;
      const prev = { docs, positions };
      const next = produce(prev, (d) => recipe(d, d.docs[name]));
      if (next === prev) return;
      const now = Date.now();
      const merge = key !== undefined && key === lastKey && now - lastTime < 600;
      lastKey = key;
      lastTime = now;
      set({ ...next, past: merge ? past : [...past.slice(-99), prev], future: [] });
    },

    undo: () => {
      const { past, future, docs, positions } = get();
      if (!past.length) return;
      lastKey = undefined;
      set({ ...past[past.length - 1], past: past.slice(0, -1), future: [{ docs, positions }, ...future], selection: [] });
    },

    redo: () => {
      const { past, future, docs, positions } = get();
      if (!future.length) return;
      lastKey = undefined;
      set({ ...future[0], future: future.slice(1), past: [...past, { docs, positions }], selection: [] });
    },

    select: (selection) => {
      const doc = currentDoc(get());
      const layer = doc && selection.length ? layerOf(doc, selection[0]) : undefined;
      set({ selection, ...(layer ? { activeLayerId: layer.id } : {}) });
    },

    addObject: (o) => {
      const obj = newObj(o);
      let layerId = "";
      get().commit((_, doc) => {
        const active = doc.layers.find((l) => l.id === get().activeLayerId);
        let target: Draft<Layer> | undefined =
          active?.kind === "objects" && !active.locked ? active : [...doc.layers].reverse().find((l) => l.kind === "objects" && !l.locked);
        if (!target) {
          const iconsAt = doc.layers.findIndex((l) => l.kind === "icons");
          doc.layers.splice(iconsAt < 0 ? doc.layers.length : iconsAt, 0, newLayer("objects", "Objetos"));
          target = doc.layers[iconsAt < 0 ? doc.layers.length - 1 : iconsAt];
        }
        target.objects.push(obj);
        layerId = target.id;
      });
      set({ selection: [obj.id], activeLayerId: layerId });
    },

    updateObjects: (ids, patch, key) => {
      const set_ = new Set(ids);
      get().commit((_, doc) => {
        for (const l of doc.layers) for (const o of l.objects) if (set_.has(o.id)) Object.assign(o, patch);
      }, key);
    },

    deleteSelected: () => {
      const sel = selectedIds();
      get().commit((_, doc) => {
        for (const l of doc.layers) if (!l.locked) l.objects = l.objects.filter((o) => !sel.has(o.id));
      });
      set({ selection: [] });
    },

    duplicateSelected: () => {
      const sel = selectedIds();
      const ids: string[] = [];
      get().commit((_, doc) => {
        for (const l of doc.layers) {
          if (l.locked) continue;
          const copies = l.objects.filter((o) => sel.has(o.id)).map((o) => ({ ...o, id: uid(), x: o.x + 30, y: o.y + 30 }));
          l.objects.push(...copies);
          ids.push(...copies.map((c) => c.id));
        }
      });
      set({ selection: ids });
    },

    nudge: (dx, dy) => {
      const sel = selectedIds();
      get().commit((_, doc) => {
        for (const l of doc.layers)
          if (!l.locked) for (const o of l.objects) if (sel.has(o.id)) (o.x += dx), (o.y += dy);
      }, "nudge");
    },

    flip: (axis) => {
      const sel = selectedIds();
      get().commit((_, doc) => {
        for (const l of doc.layers)
          if (!l.locked) for (const o of l.objects) if (sel.has(o.id)) axis === "x" ? (o.flipX = !o.flipX) : (o.flipY = !o.flipY);
      });
    },

    reorder: (dir) => {
      const sel = selectedIds();
      get().commit((_, doc) => {
        for (const l of doc.layers) {
          if (l.locked || !l.objects.some((o) => sel.has(o.id))) continue;
          const picked = l.objects.filter((o) => sel.has(o.id));
          const rest = l.objects.filter((o) => !sel.has(o.id));
          if (dir === "top") l.objects = [...rest, ...picked];
          else if (dir === "bottom") l.objects = [...picked, ...rest];
          else {
            const objs = [...l.objects];
            const order = dir === "up" ? [...objs.keys()].reverse() : [...objs.keys()];
            for (const i of order) {
              const j = dir === "up" ? i + 1 : i - 1;
              if (sel.has(objs[i].id) && j >= 0 && j < objs.length && !sel.has(objs[j].id)) [objs[i], objs[j]] = [objs[j], objs[i]];
            }
            l.objects = objs;
          }
        }
      });
    },

    setBackground: (bg, key) => get().commit((_, doc) => void (doc.background = bg), key),

    setActiveLayer: (activeLayerId) => set({ activeLayerId }),

    addLayer: (kind) => {
      const layer = newLayer(kind, kind === "objects" ? "Objetos" : "Dibujo");
      get().commit((_, doc) => {
        const at = doc.layers.findIndex((l) => l.id === get().activeLayerId);
        doc.layers.splice(at < 0 ? doc.layers.length : at + 1, 0, layer);
      });
      set({ activeLayerId: layer.id });
    },

    removeLayer: (id) => {
      get().commit((_, doc) => {
        doc.layers = doc.layers.filter((l) => l.id !== id || l.kind === "background" || l.kind === "icons");
      });
      set({ selection: [] });
    },

    moveLayer: (id, dir) =>
      get().commit((_, doc) => {
        const i = doc.layers.findIndex((l) => l.id === id);
        const j = i + dir;
        // The background always stays at the bottom.
        if (i < 1 || j < 1 || j >= doc.layers.length) return;
        [doc.layers[i], doc.layers[j]] = [doc.layers[j], doc.layers[i]];
      }),

    toggleLayer: (id, prop) => {
      get().commit((_, doc) => {
        const l = doc.layers.find((l) => l.id === id);
        if (l) l[prop] = !l[prop];
      });
      const doc = currentDoc(get());
      const l = doc?.layers.find((l) => l.id === id);
      if (l) set({ selection: get().selection.filter((s) => !l.objects.some((o) => o.id === s)) });
    },

    renameLayer: (id, name) =>
      get().commit((_, doc) => {
        const l = doc.layers.find((l) => l.id === id);
        if (l && name.trim()) l.name = name.trim();
      }),

    toggle: (prop) => set({ [prop]: !get()[prop] } as Pick<State, typeof prop>),

    setTool: (tool) => set({ tool, selection: tool === "select" ? get().selection : [] }),

    setBrush: (patch) => set({ brush: { ...get().brush, ...patch } }),

    drawingLayerId: () => {
      const doc = currentDoc(get());
      const active = doc?.layers.find((l) => l.id === get().activeLayerId);
      if (active?.kind === "drawing" && !active.locked && active.visible) return active.id;
      return [...(doc?.layers ?? [])].reverse().find((l) => l.kind === "drawing" && !l.locked && l.visible)?.id;
    },

    addStroke: (stroke) => {
      let id = get().drawingLayerId();
      get().commit((_, doc) => {
        if (!id) {
          const layer = newLayer("drawing", "Dibujo");
          const iconsAt = doc.layers.findIndex((l) => l.kind === "icons");
          doc.layers.splice(iconsAt < 0 ? doc.layers.length : iconsAt, 0, layer);
          id = layer.id;
        }
        doc.layers.find((l) => l.id === id)?.strokes.push(stroke);
      });
      set({ activeLayerId: id });
    },
  };
});

export const currentDoc = (s: Pick<State, "docs" | "monitors" | "monitorIndex">): Doc | undefined =>
  s.docs[s.monitors[s.monitorIndex]?.name ?? ""];

export const useDoc = () => useStore(currentDoc);

export const useDirty = () =>
  useStore((s) =>
    (s.desktop?.icons ?? []).some((i) => {
      const p = s.positions[i.id];
      return p && (p.x !== i.x || p.y !== i.y);
    }),
  );
