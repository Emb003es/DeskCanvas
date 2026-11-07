"""Generates the built-in sticker packs (original artwork) into public/stickers/.
Run: python scripts/make_stickers.py"""
import os
import re
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "public", "stickers")
O = "#4b3a4f"  # cozy outline
S = f'stroke="{O}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"'
WOOD, WOOD2 = "#c98f5f", "#a8703f"
LEAF, LEAF2 = "#7fb685", "#5a9367"
POT = "#e27d60"

cozy = {
"estante": (320, 170, f'''
<rect x="10" y="118" width="300" height="20" rx="6" fill="{WOOD}" {S}/>
<path d="M40 138 v20 h30" fill="none" {S}/><path d="M280 138 v20 h-30" fill="none" {S}/>
<rect x="40" y="48" width="26" height="70" rx="4" fill="#85cdca" {S}/>
<rect x="66" y="38" width="22" height="80" rx="4" fill="#f6d186" {S}/>
<rect x="88" y="58" width="28" height="60" rx="4" fill="#c38d9e" {S}/>
<rect x="118" y="62" width="24" height="56" rx="4" fill="#e8a87c" {S} transform="rotate(12 130 90)"/>
<path d="M210 118 l6 -36 h44 l6 36 z" fill="{POT}" {S}/>
<path d="M238 82 c-6 -26 -30 -30 -40 -22 c12 4 26 10 40 22 z" fill="{LEAF}" {S}/>
<path d="M238 82 c4 -30 26 -40 40 -34 c-14 8 -28 18 -40 34 z" fill="{LEAF2}" {S}/>
<path d="M238 82 c-2 -30 6 -48 2 -66 c-10 14 -12 40 -2 66 z" fill="{LEAF}" {S}/>'''),
"mesa": (300, 200, f'''
<path d="M44 60 l-12 128 M256 60 l12 128" fill="none" stroke="{O}" stroke-width="14" stroke-linecap="round"/>
<path d="M44 60 l-12 128 M256 60 l12 128" fill="none" stroke="{WOOD2}" stroke-width="6" stroke-linecap="round"/>
<path d="M60 64 h180 v26 h-180 z" fill="{WOOD2}" {S}/>
<rect x="10" y="40" width="280" height="26" rx="8" fill="{WOOD}" {S}/>'''),
"planta": (180, 260, f'''
<path d="M50 170 h80 l-10 80 h-60 z" fill="{POT}" {S}/>
<path d="M90 158 C70 120 30 110 14 120 C34 130 60 140 90 158 Z" fill="{LEAF}" {S}/>
<path d="M90 158 C110 120 150 108 168 118 C148 128 120 140 90 158 Z" fill="{LEAF2}" {S}/>
<path d="M90 158 C66 110 64 60 84 20 C100 60 104 110 90 158 Z" fill="{LEAF}" {S}/>
<path d="M90 158 C100 120 124 80 150 66 C144 100 120 130 90 158 Z" fill="{LEAF}" {S}/>
<path d="M90 158 C78 124 50 84 24 74 C32 108 60 134 90 158 Z" fill="{LEAF2}" {S}/>
<rect x="42" y="158" width="96" height="20" rx="6" fill="#ef9a7c" {S}/>'''),
"cactus": (140, 220, f'''
<path d="M50 110 h-14 a12 12 0 0 1 -12 -12 v-26 a10 10 0 0 1 20 0 v18 h6" fill="{LEAF}" {S}/>
<path d="M90 96 h14 a12 12 0 0 0 12 -12 v-20 a10 10 0 0 0 -20 0 v12 h-6" fill="{LEAF}" {S}/>
<rect x="50" y="40" width="40" height="124" rx="20" fill="{LEAF}" {S}/>
<circle cx="70" cy="36" r="9" fill="#f19cb7" {S}/>
<path d="M62 70 l4 4 M76 92 l4 4 M62 120 l4 4 M78 136 l4 4" {S}/>
<path d="M30 160 h80 l-8 52 h-64 z" fill="#f2b880" {S}/>'''),
"marco": (220, 180, f'''
<rect x="8" y="8" width="204" height="164" rx="10" fill="{WOOD}" {S}/>
<rect x="28" y="28" width="164" height="124" rx="4" fill="#cfe8f3" {S}/>
<circle cx="150" cy="62" r="14" fill="#f6d186" {S}/>
<path d="M30 150 l48 -62 l30 36 l22 -24 l60 50 z" fill="{LEAF}" {S}/>'''),
"lámpara": (160, 300, f'''
<path d="M80 110 v160" stroke="{O}" stroke-width="10" stroke-linecap="round"/>
<path d="M80 110 v160" stroke="{WOOD2}" stroke-width="4" stroke-linecap="round"/>
<path d="M40 20 h80 l30 90 h-140 z" fill="#f6d186" {S}/>
<ellipse cx="80" cy="278" rx="50" ry="14" fill="{WOOD}" {S}/>
<path d="M60 40 h40" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>'''),
"taza": (150, 140, f'''
<path d="M110 62 h10 a16 16 0 0 1 0 32 h-12" fill="none" {S}/>
<path d="M20 50 h90 v50 a30 30 0 0 1 -30 30 h-30 a30 30 0 0 1 -30 -30 z" fill="#85cdca" {S}/>
<path d="M50 34 c-8 -10 8 -16 0 -28 M76 34 c-8 -10 8 -16 0 -28" fill="none" {S} opacity=".7"/>
<path d="M40 80 h50" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>'''),
"libros": (210, 180, f'''
<rect x="20" y="130" width="170" height="36" rx="6" fill="#c38d9e" {S}/>
<rect x="34" y="94" width="150" height="36" rx="6" fill="#85cdca" {S}/>
<rect x="14" y="58" width="160" height="36" rx="6" fill="#f6d186" {S}/>
<path d="M160 130 v36 M170 94 v36 M30 58 v36" {S}/>
<rect x="60" y="20" width="90" height="38" rx="6" fill="{POT}" {S} transform="rotate(-6 105 40)"/>'''),
"reloj": (180, 180, f'''
<circle cx="90" cy="90" r="80" fill="{WOOD}" {S}/>
<circle cx="90" cy="90" r="64" fill="#fff6e8" {S}/>
<path d="M90 90 V46 M90 90 L120 106" {S.replace('stroke-width="4"', 'stroke-width="6"')}/>
<circle cx="90" cy="90" r="6" fill="{O}"/>
<path d="M90 32 v8 M90 140 v8 M32 90 h8 M140 90 h8" {S}/>'''),
"ventana": (240, 280, f'''
<rect x="30" y="20" width="180" height="220" rx="8" fill="#cfe8f3" {S}/>
<circle cx="170" cy="70" r="16" fill="#f6d186" {S}/>
<path d="M120 20 v220 M30 130 h180" stroke="{O}" stroke-width="12" stroke-linecap="round"/>
<path d="M120 20 v220 M30 130 h180" stroke="{WOOD}" stroke-width="6" stroke-linecap="round"/>
<path d="M14 14 q40 0 50 120 q-10 120 -50 130 z" fill="#e8a87c" {S}/>
<path d="M226 14 q-40 0 -50 120 q10 120 50 130 z" fill="#e8a87c" {S}/>
<rect x="10" y="236" width="220" height="18" rx="6" fill="{WOOD}" {S}/>'''),
"alfombra": (360, 150, f'''
<ellipse cx="180" cy="75" rx="168" ry="62" fill="#c38d9e" {S}/>
<ellipse cx="180" cy="75" rx="128" ry="44" fill="#f6d186" {S}/>
<ellipse cx="180" cy="75" rx="84" ry="26" fill="#85cdca" {S}/>'''),
"planta colgante": (180, 290, f'''
<path d="M90 6 L46 120 M90 6 L134 120 M90 6 V120" fill="none" {S.replace('stroke-width="4"', 'stroke-width="3"')}/>
<path d="M54 140 c-12 40 -4 80 -16 130" fill="none" stroke="{LEAF2}" stroke-width="5" stroke-linecap="round"/>
<path d="M122 140 c12 40 6 70 18 110" fill="none" stroke="{LEAF2}" stroke-width="5" stroke-linecap="round"/>
<path d="M46 170 c-16 -4 -20 10 -8 16 c10 -2 12 -8 8 -16 z M44 220 c-16 -4 -20 10 -8 16 c10 -2 12 -8 8 -16 z M136 190 c16 -4 20 10 8 16 c-10 -2 -12 -8 -8 -16 z M140 236 c16 -4 20 10 8 16 c-10 -2 -12 -8 -8 -16 z M40 262 c-14 -2 -16 12 -6 16 c8 -2 10 -8 6 -16 z" fill="{LEAF}" {S.replace('stroke-width="4"', 'stroke-width="3"')}/>
<path d="M40 120 h100 a50 44 0 0 1 -100 0 z" fill="{POT}" {S}/>'''),
"vela": (100, 180, f'''
<rect x="26" y="70" width="48" height="96" rx="6" fill="#fff6e8" {S}/>
<path d="M50 70 v-12" {S}/>
<path d="M50 56 c-14 -14 -8 -30 0 -44 c8 14 14 30 0 44 z" fill="#f6b04e" {S}/>
<path d="M30 100 q20 10 40 0" fill="none" stroke="#e8a87c" stroke-width="5" stroke-linecap="round"/>'''),
}

M = "#3d3a36"
L = f'stroke="{M}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"'
minimal = {
"arco": (200, 240, '<path d="M20 230 V110 a80 80 0 0 1 160 0 V230 z" fill="#e07a5f"/><path d="M60 230 V120 a40 40 0 0 1 80 0 V230 z" fill="#f2cc8f"/>'),
"mancha": (240, 200, '<path d="M60 30 C120 -10 210 20 222 90 C234 160 170 196 110 186 C50 176 6 140 14 92 C20 60 36 44 60 30 Z" fill="#a3b18a"/>'),
"sol": (200, 200, '<circle cx="100" cy="100" r="90" fill="#f2cc8f"/>'),
"ola": (300, 80, f'<path d="M10 40 q35 -40 70 0 t70 0 t70 0 t70 0" {L}/>'),
"hoja": (160, 240, f'<path d="M80 230 V30 M80 30 C20 60 20 150 80 190 C140 150 140 60 80 30 Z M80 90 l-28 -22 M80 130 l-34 -26 M80 90 l28 -22 M80 130 l34 -26" {L}/>'),
"anillo": (200, 200, '<circle cx="100" cy="100" r="78" fill="none" stroke="#e07a5f" stroke-width="20"/>'),
"puntos": (200, 200, "".join(f'<circle cx="{20 + 40*i}" cy="{20 + 40*j}" r="7" fill="{M}"/>' for i in range(5) for j in range(5))),
"garabato": (260, 80, f'<path d="M10 50 c20 -50 40 30 60 -10 s40 30 60 -10 s40 30 60 -10 s30 20 50 0" {L}/>'),
"semicírculo": (220, 120, '<path d="M10 115 a100 100 0 0 1 200 0 z" fill="#d9cfc1"/>'),
"destello": (160, 160, f'<path d="M80 6 C86 60 100 74 154 80 C100 86 86 100 80 154 C74 100 60 86 6 80 C60 74 74 60 80 6 Z" fill="{M}"/>'),
"marco línea": (260, 180, f'<rect x="8" y="8" width="244" height="164" rx="24" {L}/>'),
"montañas": (300, 160, f'<path d="M6 150 L90 40 L150 110 L200 60 L294 150" {L}/><circle cx="230" cy="34" r="16" fill="#e07a5f"/>'),
}


def mix(c, t, k):
    """Blends hex color c toward hex t by k (0..1)."""
    a = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(t[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * k):02x}" for x, y in zip(a, b))


def shade(body):
    """Gives every flat fill volume: lit from above, darker at the base."""
    grads = {}

    def sub(m):
        c = m.group(1).lower()
        if len(c) == 4:
            c = "#" + "".join(ch * 2 for ch in c[1:])
        if c not in grads:
            grads[c] = f"v{len(grads)}"
        return f'fill="url(#{grads[c]})"'

    body = re.sub(r'fill="(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})"', sub, body)
    defs = "".join(
        f'<linearGradient id="{i}" x1="0" y1="0" x2="0.35" y2="1">'
        f'<stop offset="0" stop-color="{mix(c, "#ffffff", 0.28)}"/><stop offset=".55" stop-color="{c}"/>'
        f'<stop offset="1" stop-color="{mix(c, "#1e1024", 0.18)}"/></linearGradient>'
        for c, i in grads.items())
    return defs, body


def die_cut(w, h, crisp=False):
    """White die-cut border and soft drop shadow, like a real vinyl sticker. Returns (filter, padding)."""
    r = round(max(w, h) * 0.035, 1)
    blur, dy = round(r * 0.9, 1), round(r * 0.6, 1)
    pad = int(r + blur * 3 + dy) + 1
    edge = (f'<feMorphology in="SourceAlpha" operator="dilate" radius="{r}" result="d"/>' if crisp else
            f'<feMorphology in="SourceAlpha" operator="dilate" radius="{r * 0.6}"/><feGaussianBlur stdDeviation="{r * 0.4}"/>'
            '<feComponentTransfer result="d"><feFuncA type="linear" slope="8" intercept="-2"/></feComponentTransfer>')
    f = (f'<filter id="cut" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">{edge}'
         '<feFlood flood-color="#ffffff"/><feComposite in2="d" operator="in" result="b"/>'
         f'<feGaussianBlur in="d" stdDeviation="{blur}"/><feOffset dy="{dy}" result="o"/>'
         '<feFlood flood-color="#2b1d33" flood-opacity=".3"/><feComposite in2="o" operator="in" result="s"/>'
         '<feMerge><feMergeNode in="s"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>')
    return f, pad


def write(pack, items, scale=1.44, finish="sticker"):
    """finish: "sticker" (volume + die-cut), "pixel" (die-cut only), "volume" (no border, keeps slots exact) or None."""
    os.makedirs(os.path.join(ROOT, pack), exist_ok=True)
    out = []
    for name, (w, h, body, *slots) in items.items():
        ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
        fname = ascii_name.replace(" ", "-") + ".svg"
        defs, pad = "", 0
        if finish in ("sticker", "volume"):
            defs, body = shade(body)
        if finish in ("sticker", "pixel"):
            f, pad = die_cut(w, h, finish == "pixel")
            defs += f
            body = f'<g filter="url(#cut)">{body}</g>'
        w2, h2 = w + 2 * pad, h + 2 * pad
        with open(os.path.join(ROOT, pack, fname), "w", encoding="utf-8") as f:
            f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w2}" height="{h2}" viewBox="{-pad} {-pad} {w2} {h2}">'
                    f'<defs>{defs}</defs>{body.strip()}</svg>\n')
        w, h = w2, h2
        out.append({"name": name[0].upper() + name[1:], "src": f"/stickers/{pack}/{fname}",
                    "width": round(w * scale), "height": round(h * scale), **({"slots": slots[0]} if slots and slots[0] else {})})
    return out


import sys

sys.path.insert(0, HERE)
from packs_extra import nature, neon_pack, pixel, space  # noqa: E402
from backgrounds import BACKGROUNDS, render  # noqa: E402
from packs_house import ROOM_DEFS, furniture, rooms, templates  # noqa: E402
import json

entries = {
    "Habitación acogedora": write("cozy", cozy),
    "Minimalista": write("minimal", minimal),
    "Casa": write("house", furniture, 1, "volume"),
    "Pixel art": write("pixel", pixel, 2.88, "pixel"),
    "Espacio": write("space", space),
    "Naturaleza": write("nature", nature),
    "Neón": write("neon", neon_pack, finish=None),
}

BG_ROOT = os.path.join(HERE, "..", "public", "backgrounds")
os.makedirs(BG_ROOT, exist_ok=True)
backgrounds = []
for name, fn in BACKGROUNDS.items():
    fname = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower().replace(" ", "-") + ".svg"
    with open(os.path.join(BG_ROOT, fname), "w", encoding="utf-8") as f:
        f.write(render(fn))
    backgrounds.append((name, f"/backgrounds/{fname}"))
for name, body in rooms.items():
    fname = "room-" + unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower().replace(" ", "-") + ".svg"
    with open(os.path.join(BG_ROOT, fname), "w", encoding="utf-8") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs>{ROOM_DEFS}</defs>{body}</svg>\n')
    backgrounds.insert(0, (name, f"/backgrounds/{fname}"))
house = {s_["name"].lower(): s_ for s_ in entries["Casa"]}
template_out = [
    {"name": name, "background": next(src for n, src in backgrounds if n == bg),
     "items": [{**{k: v for k, v in house[item].items() if k != "name"}, "x": x, "y": y} for item, x, y in items]}
    for name, (bg, items) in templates.items()
]

with open(os.path.join(HERE, "..", "src", "stickers.ts"), "w", encoding="utf-8") as f:
    NL = "\n"
    f.write("// Generated by scripts/make_stickers.py. Do not edit by hand." + NL)
    f.write("export type Sticker = { name: string; src: string; width: number; height: number; slots?: number[][] };" + NL * 2)
    f.write("export const stickerPacks: Record<string, Sticker[]> = " + json.dumps(entries, ensure_ascii=False, indent=1) + ";" + NL * 2)
    f.write("/** Ready-made 1920x1080 wallpapers (SVG, scale to any monitor). */" + NL)
    f.write("export const backgrounds: { name: string; src: string }[] = "
            + json.dumps([{"name": n, "src": s_} for n, s_ in backgrounds], ensure_ascii=False, indent=1) + ";" + NL * 2)
    f.write("/** Furnished rooms in 1920x1080 coordinates (x, y = item center). */" + NL)
    f.write('export type Template = { name: string; background: string; items: (Omit<Sticker, "name"> & { x: number; y: number })[] };' + NL)
    f.write("export const templates: Template[] = " + json.dumps(template_out, ensure_ascii=False, indent=1) + ";" + NL)
print(sum(len(v) for v in entries.values()), "stickers,", len(backgrounds), "backgrounds")
