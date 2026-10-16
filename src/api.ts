import { invoke } from "@tauri-apps/api/core";

export type Monitor = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dpi: number;
  primary: boolean;
};

/** Desktop icon; x/y are physical px in virtual-screen coordinates (top-left of its cell). */
export type DesktopIcon = { id: string; name: string; x: number; y: number; image: string };

export type DesktopState = {
  icons: DesktopIcon[];
  iconSize: number;
  cellWidth: number;
  cellHeight: number;
  autoArrange: boolean;
  snapToGrid: boolean;
};

export type Move = { id: string; x: number; y: number };

export const api = {
  getMonitors: () => invoke<Monitor[]>("get_monitors"),
  getDesktop: () => invoke<DesktopState>("get_desktop"),
  applyLayout: (moves: Move[]) => invoke<void>("apply_layout", { moves }),
  restoreLayout: () => invoke<void>("restore_layout"),
  hasSnapshot: () => invoke<boolean>("has_snapshot"),
  setFlags: (autoArrange: boolean, snapToGrid: boolean) =>
    invoke<void>("set_flags", { autoArrange, snapToGrid }),
  saveImage: (path: string, data: string) => invoke<void>("save_image", { path, data }),
  /** Returns the wallpaper path Windows reports after applying. */
  applyWallpaper: (x: number, y: number, data: string) => invoke<string>("apply_wallpaper", { x, y, data }),
};
