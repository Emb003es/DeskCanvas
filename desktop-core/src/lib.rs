//! Read and move the real desktop icons through the shell COM APIs
//! (IShellWindows -> IShellBrowser -> IFolderView2). No process injection.

use serde::Serialize;
pub use windows::core::Error;
use windows::core::{Interface, Result, BOOL, PWSTR};
use windows::Win32::Foundation::{LPARAM, POINT, RECT, SIZE};
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::System::Com::*;
use windows::Win32::System::Variant::VARIANT;
use windows::Win32::UI::HiDpi::*;
use windows::Win32::UI::Shell::Common::ITEMIDLIST;
use windows::Win32::UI::Shell::*;
use windows::Win32::UI::WindowsAndMessaging::*;

#[derive(Serialize, Clone, Debug)]
pub struct Icon {
    /// Absolute parsing name: stable id used to move/restore.
    pub id: String,
    pub name: String,
    /// Position in physical pixels, virtual-screen coordinates.
    pub x: i32,
    pub y: i32,
}

#[derive(Serialize, Clone, Debug)]
pub struct Monitor {
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub dpi: u32,
    pub primary: bool,
}

/// Call once per thread before using `Desktop` (STA, required by the shell).
pub fn com_init() {
    unsafe {
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
    }
}

pub struct Desktop {
    view: IShellView,
    fv: IFolderView2,
    /// ListView client origin in virtual-screen coordinates.
    origin: POINT,
}

fn take_pwstr(p: PWSTR) -> String {
    unsafe {
        let s = p.to_string().unwrap_or_default();
        CoTaskMemFree(Some(p.0 as _));
        s
    }
}

impl Desktop {
    pub fn open() -> Result<Self> {
        unsafe {
            let windows: IShellWindows = CoCreateInstance(&ShellWindows, None, CLSCTX_ALL)?;
            let loc = VARIANT::from(CSIDL_DESKTOP as i32);
            let empty = VARIANT::default();
            let mut hwnd = 0i32;
            let disp = windows.FindWindowSW(&loc, &empty, SWC_DESKTOP, &mut hwnd, SWFO_NEEDDISPATCH)?;
            let sp: IServiceProvider = disp.cast()?;
            let browser: IShellBrowser = sp.QueryService(&SID_STopLevelBrowser)?;
            let view = browser.QueryActiveShellView()?;
            let fv: IFolderView2 = view.cast()?;
            // Item positions are ListView client coords; map them via its client origin on screen.
            let defview = view.GetWindow()?;
            let lv = FindWindowExW(Some(defview), None, windows::core::w!("SysListView32"), None)
                .unwrap_or(defview);
            let mut origin = POINT::default();
            if !ClientToScreen(lv, &mut origin).as_bool() {
                origin = POINT { x: GetSystemMetrics(SM_XVIRTUALSCREEN), y: GetSystemMetrics(SM_YVIRTUALSCREEN) };
            }
            Ok(Self { view, fv, origin })
        }
    }

    /// ListView client origin (x, y) in virtual-screen coordinates.
    pub fn origin(&self) -> (i32, i32) {
        (self.origin.x, self.origin.y)
    }

    fn count(&self) -> Result<i32> {
        unsafe { self.fv.ItemCount(SVGIO_ALLVIEW) }
    }

    fn id_at(&self, i: i32) -> Result<String> {
        unsafe {
            let item: IShellItem = self.fv.GetItem(i)?;
            Ok(take_pwstr(item.GetDisplayName(SIGDN_DESKTOPABSOLUTEPARSING)?))
        }
    }

    fn index_of(&self, id: &str) -> Result<Option<i32>> {
        for i in 0..self.count()? {
            if self.id_at(i)? == id {
                return Ok(Some(i));
            }
        }
        Ok(None)
    }

    pub fn icons(&self) -> Result<Vec<Icon>> {
        let mut out = Vec::new();
        unsafe {
            for i in 0..self.count()? {
                let item: IShellItem = self.fv.GetItem(i)?;
                let pidl = self.fv.Item(i)?;
                let pt = self.fv.GetItemPosition(pidl);
                CoTaskMemFree(Some(pidl as _));
                let pt = pt?;
                out.push(Icon {
                    id: take_pwstr(item.GetDisplayName(SIGDN_DESKTOPABSOLUTEPARSING)?),
                    name: take_pwstr(item.GetDisplayName(SIGDN_NORMALDISPLAY)?),
                    x: pt.x + self.origin.x,
                    y: pt.y + self.origin.y,
                });
            }
        }
        Ok(out)
    }

    /// Moves icons to virtual-screen coordinates. Unknown ids are skipped.
    pub fn move_icons(&self, moves: &[(String, i32, i32)]) -> Result<()> {
        unsafe {
            let mut index = std::collections::HashMap::new();
            for i in 0..self.count()? {
                index.insert(self.id_at(i)?, i);
            }
            for (id, x, y) in moves {
                let Some(&i) = index.get(id) else { continue };
                let pidl = self.fv.Item(i)?;
                let pt = POINT { x: x - self.origin.x, y: y - self.origin.y };
                let apidl = [pidl as *const ITEMIDLIST];
                let r = self.fv.SelectAndPositionItems(1, apidl.as_ptr(), Some(&pt), SVSI_POSITIONITEM.0 as u32);
                CoTaskMemFree(Some(pidl as _));
                r?;
            }
            // Persist the layout now; otherwise Explorer only saves it on clean shutdown.
            self.view.SaveViewState()?;
        }
        Ok(())
    }

    /// Icon size in px as Explorer draws it (e.g. 48).
    pub fn icon_size(&self) -> Result<i32> {
        unsafe {
            let mut mode = FOLDERVIEWMODE::default();
            let mut size = 0i32;
            self.fv.GetViewModeAndIconSize(&mut mode, &mut size)?;
            Ok(size)
        }
    }

    /// (auto_arrange, snap_to_grid)
    pub fn flags(&self) -> Result<(bool, bool)> {
        unsafe {
            let f = self.fv.GetCurrentFolderFlags()?;
            Ok((f & FWF_AUTOARRANGE.0 as u32 != 0, f & FWF_SNAPTOGRID.0 as u32 != 0))
        }
    }

    pub fn set_flags(&self, auto_arrange: bool, snap_to_grid: bool) -> Result<()> {
        let (a, s) = (FWF_AUTOARRANGE.0 as u32, FWF_SNAPTOGRID.0 as u32);
        let value = if auto_arrange { a } else { 0 } | if snap_to_grid { s } else { 0 };
        unsafe { self.fv.SetCurrentFolderFlags(a | s, value) }
    }

    /// PNG bytes of the icon image at `size` px, with alpha.
    pub fn icon_png(&self, id: &str, size: i32) -> Result<Vec<u8>> {
        let i = self.index_of(id)?.ok_or_else(|| windows::core::Error::from(windows::Win32::Foundation::E_INVALIDARG))?;
        self.image_at(i, size)
    }

    /// PNGs for every icon, in the same order as `icons()`.
    pub fn icon_pngs(&self, size: i32) -> Result<Vec<Vec<u8>>> {
        (0..self.count()?).map(|i| self.image_at(i, size)).collect()
    }

    /// Grid cell size (width, height) Explorer uses for desktop items.
    pub fn spacing(&self) -> Result<(i32, i32)> {
        let mut pt = POINT::default();
        unsafe { self.fv.GetSpacing(&mut pt)? };
        Ok((pt.x, pt.y))
    }

    fn image_at(&self, i: i32, size: i32) -> Result<Vec<u8>> {
        unsafe {
            let item: IShellItem = self.fv.GetItem(i)?;
            let factory: IShellItemImageFactory = item.cast()?;
            let hbmp = factory.GetImage(SIZE { cx: size, cy: size }, SIIGBF_ICONONLY)?;
            let png = hbitmap_to_png(hbmp);
            let _ = DeleteObject(hbmp.into());
            Ok(png)
        }
    }
}

unsafe fn hbitmap_to_png(hbmp: HBITMAP) -> Vec<u8> {
    let mut bm = BITMAP::default();
    GetObjectW(hbmp.into(), std::mem::size_of::<BITMAP>() as i32, Some(&mut bm as *mut _ as _));
    let (w, h) = (bm.bmWidth, bm.bmHeight);
    let mut info = BITMAPINFO::default();
    info.bmiHeader = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: w,
        biHeight: -h, // top-down
        biPlanes: 1,
        biBitCount: 32,
        ..Default::default()
    };
    let mut px = vec![0u8; (w * h * 4) as usize];
    let dc = GetDC(None);
    GetDIBits(dc, hbmp, 0, h as u32, Some(px.as_mut_ptr() as _), &mut info, DIB_RGB_COLORS);
    ReleaseDC(None, dc);
    // BGRA (premultiplied) -> RGBA straight
    for p in px.chunks_exact_mut(4) {
        let a = p[3] as u32;
        let (b, g, r) = (p[0] as u32, p[1] as u32, p[2] as u32);
        let un = |c: u32| if a == 0 { 0 } else { (c * 255 / a).min(255) as u8 };
        p[0] = un(r);
        p[1] = un(g);
        p[2] = un(b);
    }
    let mut out = Vec::new();
    {
        let mut enc = png::Encoder::new(&mut out, w as u32, h as u32);
        enc.set_color(png::ColorType::Rgba);
        enc.set_depth(png::BitDepth::Eight);
        let mut wr = enc.write_header().unwrap();
        wr.write_image_data(&px).unwrap();
    }
    out
}

pub fn monitors() -> Vec<Monitor> {
    unsafe extern "system" fn cb(hm: HMONITOR, _: HDC, _: *mut RECT, data: LPARAM) -> BOOL {
        let list = &mut *(data.0 as *mut Vec<Monitor>);
        let mut mi = MONITORINFOEXW::default();
        mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
        if GetMonitorInfoW(hm, &mut mi as *mut _ as *mut MONITORINFO).as_bool() {
            let (mut dx, mut dy) = (96u32, 96u32);
            let _ = GetDpiForMonitor(hm, MDT_EFFECTIVE_DPI, &mut dx, &mut dy);
            let r = mi.monitorInfo.rcMonitor;
            let len = mi.szDevice.iter().position(|&c| c == 0).unwrap_or(mi.szDevice.len());
            list.push(Monitor {
                name: String::from_utf16_lossy(&mi.szDevice[..len]),
                x: r.left,
                y: r.top,
                width: r.right - r.left,
                height: r.bottom - r.top,
                dpi: dx,
                primary: mi.monitorInfo.dwFlags & MONITORINFOF_PRIMARY != 0,
            });
        }
        true.into()
    }
    let mut list: Vec<Monitor> = Vec::new();
    unsafe {
        let _ = EnumDisplayMonitors(None, None, Some(cb), LPARAM(&mut list as *mut _ as isize));
    }
    list
}
