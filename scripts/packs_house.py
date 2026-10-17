"""House pack: furniture with icon surfaces ("slots"), room backgrounds and furnished templates.

Furniture is authored at its final size in 1080p pixels so a desktop icon (96x124 cell) fits on it.
Slots are [x0, x1, y] as fractions of the furniture size: the surface icons sit on.
"""

O = "#4b3a4f"
S = f'stroke="{O}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"'
WOOD, WOOD2, WOOD3 = "#c98f5f", "#a8703f", "#e0b083"
LEAF, LEAF2, POT = "#7fb685", "#5a9367", "#e27d60"


def legs(x1, x2, top, bottom, color=WOOD2):
    return "".join(f'<rect x="{x - 9}" y="{top}" width="18" height="{bottom - top}" rx="6" fill="{color}" {S}/>' for x in (x1, x2))


def books(x, base, widths, colors, heights):
    out, cx = [], x
    for w, c, h in zip(widths, colors, heights):
        out.append(f'<rect x="{cx}" y="{base - h}" width="{w}" height="{h}" rx="3" fill="{c}" {S}/>')
        cx += w + 2
    return "".join(out)


# name -> (width, height, svg body, slots)
furniture = {
"estantería": (360, 480, f'''
<rect x="8" y="8" width="344" height="464" rx="10" fill="{WOOD2}" {S}/>
<rect x="28" y="26" width="304" height="124" fill="#8a5a33"/>
<rect x="28" y="164" width="304" height="122" fill="#8a5a33"/>
<rect x="28" y="300" width="304" height="136" fill="#8a5a33"/>
<rect x="20" y="146" width="320" height="18" rx="4" fill="{WOOD}" {S}/>
<rect x="20" y="286" width="320" height="18" rx="4" fill="{WOOD}" {S}/>
<rect x="20" y="436" width="320" height="22" rx="4" fill="{WOOD}" {S}/>''',
 [[0.07, 0.93, 146 / 480], [0.07, 0.93, 286 / 480], [0.07, 0.93, 436 / 480]]),
"estante de pared": (420, 70, f'''
<path d="M50 34 v26 h34 M370 34 v26 h-34" fill="none" {S}/>
<rect x="6" y="14" width="408" height="22" rx="6" fill="{WOOD}" {S}/>''',
 [[0.03, 0.97, 14 / 70]]),
"mesa": (440, 230, legs(50, 390, 50, 222) + f'''
<rect x="40" y="52" width="360" height="26" fill="{WOOD2}" {S}/>
<rect x="8" y="26" width="424" height="30" rx="10" fill="{WOOD}" {S}/>''',
 [[0.02, 0.98, 26 / 230]]),
"escritorio": (520, 270, f'''
<rect x="30" y="56" width="170" height="206" rx="6" fill="{WOOD2}" {S}/>
<path d="M50 120 h130 M50 190 h130" {S}/><circle cx="115" cy="90" r="6" fill="{O}"/><circle cx="115" cy="156" r="6" fill="{O}"/><circle cx="115" cy="226" r="6" fill="{O}"/>
''' + legs(480, 480, 56, 262) + f'''
<rect x="8" y="34" width="504" height="28" rx="8" fill="{WOOD}" {S}/>''',
 [[0.02, 0.98, 34 / 270]]),
"mueble tv": (540, 160, f'''
<rect x="16" y="40" width="508" height="104" rx="10" fill="{WOOD2}" {S}/>
<path d="M186 40 v104 M354 40 v104" {S}/>
<path d="M150 92 h20 M372 92 h20" stroke="{O}" stroke-width="7" stroke-linecap="round"/>
<rect x="210" y="66" width="120" height="54" rx="6" fill="#3b3150" {S}/>
<path d="M40 144 v12 M500 144 v12" {S}/>
<rect x="6" y="20" width="528" height="26" rx="8" fill="{WOOD}" {S}/>''',
 [[0.02, 0.98, 20 / 160]]),
"tele": (420, 270, f'''
<path d="M150 236 l-30 28 M270 236 l30 28" {S}/>
<rect x="8" y="8" width="404" height="230" rx="16" fill="#2b2135" {S}/>
<rect x="24" y="24" width="372" height="196" rx="8" fill="#3d4f8a"/>
<path d="M24 160 L130 90 L210 150 L290 80 L396 160 V220 H24 Z" fill="#5a73c4" opacity=".8"/>
<path d="M60 50 l60 0" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".35"/>''', []),
"sofá": (580, 270, f'''
<rect x="60" y="20" width="460" height="140" rx="40" fill="#85a7cf" {S}/>
<rect x="60" y="140" width="460" height="80" rx="18" fill="#6f92bd" {S}/>
<path d="M290 150 v66" {S}/>
<rect x="8" y="100" width="90" height="140" rx="30" fill="#85a7cf" {S}/>
<rect x="482" y="100" width="90" height="140" rx="30" fill="#85a7cf" {S}/>
<path d="M60 240 v22 M520 240 v22" stroke="{O}" stroke-width="12" stroke-linecap="round"/>''',
 [[0.17, 0.83, 140 / 270]]),
"silla": (180, 290, f'''
<path d="M40 160 l-12 124 M140 160 l12 124" stroke="{O}" stroke-width="14" stroke-linecap="round"/>
<path d="M40 160 l-12 124 M140 160 l12 124" stroke="{WOOD2}" stroke-width="7" stroke-linecap="round"/>
<rect x="34" y="10" width="112" height="140" rx="20" fill="{WOOD}" {S}/>
<rect x="56" y="34" width="68" height="90" rx="12" fill="{WOOD3}" {S}/>
<rect x="14" y="146" width="152" height="26" rx="10" fill="{WOOD2}" {S}/>''',
 [[0.05, 0.95, 146 / 290]]),
"cómoda": (380, 290, f'''
<rect x="20" y="50" width="340" height="216" rx="10" fill="{WOOD2}" {S}/>
''' + "".join(f'<rect x="40" y="{y}" width="300" height="56" rx="6" fill="{WOOD3}" {S}/><path d="M170 {y + 28} h40" stroke="{O}" stroke-width="8" stroke-linecap="round"/>' for y in (64, 132, 200)) + f'''
<path d="M50 266 v18 M330 266 v18" stroke="{O}" stroke-width="10" stroke-linecap="round"/>
<rect x="8" y="28" width="364" height="28" rx="8" fill="{WOOD}" {S}/>''',
 [[0.03, 0.97, 28 / 290]]),
"mesita de noche": (190, 210, f'''
<rect x="20" y="48" width="150" height="140" rx="10" fill="{WOOD2}" {S}/>
<rect x="36" y="64" width="118" height="54" rx="6" fill="{WOOD3}" {S}/><path d="M80 91 h30" stroke="{O}" stroke-width="7" stroke-linecap="round"/>
<path d="M40 188 v16 M150 188 v16" stroke="{O}" stroke-width="10" stroke-linecap="round"/>
<rect x="8" y="28" width="174" height="26" rx="8" fill="{WOOD}" {S}/>''',
 [[0.0, 1.0, 28 / 210]]),
"cama": (620, 320, f'''
<rect x="10" y="20" width="110" height="290" rx="20" fill="{WOOD2}" {S}/>
<rect x="60" y="150" width="540" height="110" rx="20" fill="#f4eee6" {S}/>
<rect x="80" y="110" width="140" height="60" rx="26" fill="#ffffff" {S}/>
<path d="M240 140 h330 a30 30 0 0 1 30 30 v80 h-360 z" fill="#c9a7e8" {S}/>
<path d="M300 150 v100 M380 150 v100 M460 150 v100" stroke="#b28fd8" stroke-width="6"/>
<rect x="580" y="170" width="30" height="140" rx="12" fill="{WOOD2}" {S}/>''', []),
"cuadro paisaje": (260, 190, f'''
<rect x="8" y="8" width="244" height="174" rx="8" fill="{WOOD}" {S}/>
<rect x="26" y="26" width="208" height="138" fill="#cfe8f3"/>
<circle cx="190" cy="62" r="16" fill="#f9d56e"/>
<path d="M26 164 l60 -70 l40 44 l34 -30 l74 56 z" fill="{LEAF}"/>
<rect x="26" y="26" width="208" height="138" fill="none" {S}/>''', []),
"cuadro abstracto": (200, 260, f'''
<rect x="8" y="8" width="184" height="244" rx="6" fill="#2b2135" {S}/>
<rect x="24" y="24" width="152" height="212" fill="#fff6e8"/>
<circle cx="80" cy="96" r="40" fill="#e07a5f"/><rect x="96" y="130" width="64" height="86" fill="#81b29a"/><path d="M34 200 q50 -40 100 0" fill="none" stroke="#3d405b" stroke-width="10" stroke-linecap="round"/>''', []),
"póster gamer": (220, 300, f'''
<rect x="8" y="8" width="204" height="284" rx="6" fill="#1a1030" {S}/>
<path d="M30 230 L110 60 L190 230 Z" fill="none" stroke="#ff3d9a" stroke-width="8"/>
<circle cx="110" cy="160" r="34" fill="none" stroke="#3df5ff" stroke-width="8"/>
<path d="M40 268 h140" stroke="#f9e04b" stroke-width="10" stroke-linecap="round"/>''', []),
"tablón de corcho": (460, 330, f'''
<rect x="8" y="8" width="444" height="314" rx="12" fill="{WOOD2}" {S}/>
<rect x="26" y="26" width="408" height="278" rx="4" fill="#d9a066"/>
''' + "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="#b9814b"/>' for x in range(40, 430, 37) for y in range(40, 300, 31)) + f'''
<circle cx="60" cy="44" r="8" fill="#e8505b" {S}/><circle cx="400" cy="44" r="8" fill="#4fa3e0" {S}/>''',
 [[0.06, 0.94, 155 / 330], [0.06, 0.94, 290 / 330]]),
"ventana": (330, 400, f'''
<rect x="20" y="10" width="290" height="330" rx="10" fill="#bfe6f5" {S}/>
<circle cx="240" cy="80" r="26" fill="#fff4c4"/>
<path d="M165 10 v330 M20 175 h290" stroke="{O}" stroke-width="16"/>
<path d="M165 10 v330 M20 175 h290" stroke="#ffffff" stroke-width="9"/>
<rect x="4" y="336" width="322" height="28" rx="8" fill="#ffffff" {S}/>''',
 [[0.03, 0.97, 336 / 400]]),
"puerta": (250, 470, f'''
<rect x="14" y="10" width="222" height="452" rx="10" fill="{WOOD}" {S}/>
<rect x="40" y="40" width="170" height="170" rx="8" fill="{WOOD3}" {S}/>
<rect x="40" y="240" width="170" height="190" rx="8" fill="{WOOD3}" {S}/>
<circle cx="200" cy="250" r="12" fill="#f9d56e" {S}/>''', []),
"lámpara de pie": (150, 470, f'''
<path d="M75 120 V440" stroke="{O}" stroke-width="12" stroke-linecap="round"/>
<path d="M75 120 V440" stroke="#d9cfc1" stroke-width="6" stroke-linecap="round"/>
<ellipse cx="75" cy="448" rx="52" ry="14" fill="#3d3a36" {S}/>
<path d="M28 20 h94 l22 104 h-138 z" fill="#f9d56e" {S}/>''', []),
"lámpara de techo": (170, 300, f'''
<path d="M85 0 V170" stroke="{O}" stroke-width="5"/>
<path d="M20 250 a65 80 0 0 1 130 0 z" fill="#f3a256" {S}/>
<ellipse cx="85" cy="256" rx="22" ry="12" fill="#fff4c4"/>''', []),
"planta grande": (230, 410, f'''
<path d="M115 260 C80 200 20 190 6 200 C40 216 80 236 115 260 Z M115 260 C150 196 210 190 224 196 C190 214 150 236 115 260 Z" fill="{LEAF2}" {S}/>
<path d="M115 260 C80 180 70 90 100 20 C130 90 140 180 115 260 Z M115 260 C130 180 170 110 214 90 C200 160 160 220 115 260 Z M115 260 C90 190 40 130 14 116 C24 176 70 226 115 260 Z" fill="{LEAF}" {S}/>
<path d="M50 270 h130 l-16 130 h-98 z" fill="{POT}" {S}/>
<rect x="40" y="256" width="150" height="26" rx="8" fill="#ef9a7c" {S}/>''', []),
"reloj de pared": (160, 160, f'''
<circle cx="80" cy="80" r="70" fill="#2b2135" {S}/><circle cx="80" cy="80" r="56" fill="#fff6e8"/>
<path d="M80 80 V42 M80 80 L106 94" {S} />
<circle cx="80" cy="80" r="6" fill="{O}"/>''', []),
"alfombra redonda": (640, 170, f'''
<ellipse cx="320" cy="85" rx="310" ry="76" fill="#e8a87c" {S}/>
<ellipse cx="320" cy="85" rx="240" ry="54" fill="#f6d186"/>
<ellipse cx="320" cy="85" rx="160" ry="34" fill="#c38d9e"/>''', []),
"altavoz": (120, 210, f'''
<rect x="10" y="10" width="100" height="190" rx="14" fill="#2b2135" {S}/>
<circle cx="60" cy="140" r="34" fill="#4a3f5c" {S}/><circle cx="60" cy="140" r="12" fill="#2b2135"/><circle cx="60" cy="56" r="18" fill="#4a3f5c" {S}/>''', []),
"cesta": (220, 160, f'''
<path d="M14 50 h192 l-22 100 h-148 z" fill="#d9a066" {S}/>
<path d="M30 80 h160 M36 110 h148 M70 50 l10 100 M110 50 v100 M150 50 l-10 100" stroke="#a8703f" stroke-width="5"/>
<rect x="6" y="36" width="208" height="22" rx="8" fill="#c98f5f" {S}/>''',
 [[0.05, 0.95, 36 / 160]]),
}

# ---------------------------------------------------------------- room backgrounds
W, H, FLOOR = 1920, 1080, 820


def wood_floor(base, line):
    planks = "".join(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="{line}" stroke-width="3"/>' for y in range(FLOOR + 50, H, 52))
    joints = "".join(f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y + 52}" stroke="{line}" stroke-width="3"/>'
                     for i, y in enumerate(range(FLOOR, H, 52)) for x in range(140 + (i % 2) * 230, W, 460))
    return f'<rect y="{FLOOR}" width="{W}" height="{H - FLOOR}" fill="{base}"/>{planks}{joints}'


def baseboard(color, shadow):
    return f'<rect y="{FLOOR - 34}" width="{W}" height="34" fill="{color}"/><rect y="{FLOOR}" width="{W}" height="8" fill="{shadow}"/>'


def room(wall, extra_wall, floor, board):
    return f'<rect width="{W}" height="{FLOOR}" fill="{wall}"/>{extra_wall}{board}{floor}'


rooms = {
"Salón": room("#f1e2d0",
              '<rect y="520" width="1920" height="300" fill="#e6cfb6"/><rect y="514" width="1920" height="12" fill="#d4b593"/>'
              + "".join(f'<rect x="{x}" y="560" width="200" height="190" rx="6" fill="none" stroke="#d4b593" stroke-width="4"/>' for x in range(60, 1920, 260)),
              wood_floor("#c48b5c", "#9c6a43"), baseboard("#fff8ef", "#b98a62")),
"Dormitorio": room("#e9e0f5",
                   "".join(f'<rect x="{x}" width="60" height="{FLOOR}" fill="#ddd1ef"/>' for x in range(0, 1920, 120)),
                   f'<rect y="{FLOOR}" width="{W}" height="{H - FLOOR}" fill="#e8d9c8"/>'
                   + "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="#d6c3ad"/>' for x in range(30, 1920, 60) for y in range(FLOOR + 30, H, 50)),
                   baseboard("#ffffff", "#cbb9a6")),
"Estudio gamer": room("#1d1b33",
                      '<rect y="40" width="1920" height="10" fill="#a970ff"/><rect y="30" width="1920" height="30" fill="#a970ff" opacity=".25"/>'
                      '<rect y="0" width="1920" height="820" fill="url(#led)"/>',
                      wood_floor("#2c2840", "#1f1c30"), baseboard("#2f2b4a", "#141225")),
"Nórdico": room("#f7f5f0",
                '<path d="M0 260 L1920 260" stroke="#ece7dd" stroke-width="4"/>',
                wood_floor("#e3cfae", "#cdb48d"), baseboard("#ffffff", "#d9c8aa")),
"Ático": room("#f0e4d4",
              '<polygon points="0,0 520,0 0,420" fill="#d9c3a6"/><polygon points="1920,0 1400,0 1920,420" fill="#d9c3a6"/>'
              '<path d="M0 420 L520 0 M1920 420 L1400 0" stroke="#a8703f" stroke-width="24"/>'
              '<rect x="760" y="0" width="400" height="30" fill="#a8703f"/>',
              wood_floor("#b77d4f", "#8f5d37"), baseboard("#f6ead9", "#a87d55")),
}
ROOM_DEFS = '<radialGradient id="led" cx=".5" cy="0" r=".8"><stop offset="0" stop-color="#a970ff" stop-opacity=".22"/><stop offset="1" stop-color="#a970ff" stop-opacity="0"/></radialGradient>'

# ---------------------------------------------------------------- templates
# (furniture name, center x, center y) in 1920x1080. Floor-standing items rest at y = 840.
def on_floor(name, x, floor=840):
    return (name, x, floor - furniture[name][1] / 2)


templates = {
"Salón": ("Salón", [
    ("alfombra redonda", 1020, 930),
    on_floor("estantería", 420),
    ("cuadro paisaje", 1020, 250),
    ("estante de pared", 1020, 440),
    on_floor("sofá", 1020),
    ("tele", 1560, 380),
    on_floor("mueble tv", 1560),
    on_floor("planta grande", 1820),
    ("reloj de pared", 420, 180),
]),
"Dormitorio": ("Dormitorio", [
    ("ventana", 980, 300),
    on_floor("cama", 980),
    on_floor("mesita de noche", 560),
    on_floor("mesita de noche", 1400),
    on_floor("cómoda", 1720),
    ("tablón de corcho", 400, 330),
    ("lámpara de techo", 1720, 150),
    ("cuadro abstracto", 1720, 380),
]),
"Estudio gamer": ("Estudio gamer", [
    ("tele", 1000, 330),
    on_floor("escritorio", 1000),
    on_floor("silla", 1300),
    ("estante de pared", 420, 300),
    ("estante de pared", 420, 560),
    ("póster gamer", 1600, 300),
    on_floor("estantería", 1640),
    on_floor("altavoz", 200),
]),
"Nórdico": ("Nórdico", [
    ("cuadro abstracto", 900, 300),
    ("cuadro paisaje", 1150, 330),
    on_floor("mesa", 1020),
    on_floor("silla", 760),
    on_floor("silla", 1280),
    on_floor("lámpara de pie", 1500),
    on_floor("cómoda", 400),
    on_floor("planta grande", 1760),
    ("estante de pared", 400, 380),
]),
}
