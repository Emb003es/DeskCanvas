import { create } from "zustand";
import { api, DesktopState, Monitor } from "./api";

type Pos = { x: number; y: number };

type State = {
  monitors: Monitor[];
  monitorIndex: number;
  desktop: DesktopState | null;
  /** Edited icon positions (virtual-screen px) keyed by icon id. */
  positions: Record<string, Pos>;
  hasSnapshot: boolean;
  busy: boolean;
  message: { text: string; error?: boolean } | null;

  load: () => Promise<void>;
  setMonitor: (i: number) => void;
  moveIcon: (id: string, pos: Pos) => void;
  apply: () => Promise<void>;
  restore: () => Promise<void>;
  disableArrange: () => Promise<void>;
  notify: (text: string, error?: boolean) => void;
};

export const monitorLabel = (m: Monitor, i: number) =>
  `Pantalla ${i + 1}${m.primary ? " (principal)" : ""} · ${m.width}×${m.height}`;

export const useStore = create<State>((set, get) => {
  /** Runs a backend action with busy state and a success/error message. */
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

  return {
    monitors: [],
    monitorIndex: 0,
    desktop: null,
    positions: {},
    hasSnapshot: false,
    busy: false,
    message: null,

    load: () =>
      run(async () => {
        const monitors = await api.getMonitors();
        const primary = Math.max(0, monitors.findIndex((m) => m.primary));
        set({ monitors, monitorIndex: get().monitors.length ? get().monitorIndex : primary });
        await reloadDesktop();
      }),

    setMonitor: (monitorIndex) => set({ monitorIndex }),

    moveIcon: (id, pos) => set((s) => ({ positions: { ...s.positions, [id]: pos } })),

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
  };
});

export const useDirty = () =>
  useStore((s) => (s.desktop?.icons ?? []).some((i) => {
    const p = s.positions[i.id];
    return p && (p.x !== i.x || p.y !== i.y);
  }));
