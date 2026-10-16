"""Ready-made wallpapers (original artwork), 1920x1080 SVG so they stay sharp on any monitor."""
import math
import random

W, H = 1920, 1080


def grad(id_, stops, x2=0, y2=1):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id_}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def ridge(seed, base, amp, step, color, rough=0.5):
    """Mountain/hill silhouette path across the width."""
    rnd = random.Random(seed)
    pts, y = [], base
    for x in range(0, W + step, step):
        y = base + (rnd.random() - 0.5) * amp + (y - base) * rough
        pts.append(f"{x},{y:.0f}")
    return f'<polygon points="0,{H} {" ".join(pts)} {W},{H}" fill="{color}"/>'


def stars(seed, n, ymax, color="#ffffff"):
    rnd = random.Random(seed)
    return "".join(
        f'<circle cx="{rnd.random()*W:.0f}" cy="{rnd.random()*ymax:.0f}" r="{rnd.choice([1,1,1.5,2,2.5])}" fill="{color}" opacity="{rnd.uniform(.4,1):.2f}"/>'
        for _ in range(n)
    )


def sunset():
    return (grad("s", [(0, "#2d1b4e"), (0.45, "#c2507a"), (0.75, "#f3a256"), (1, "#f9d56e")]) ,
            f'<rect width="{W}" height="{H}" fill="url(#s)"/>'
            '<circle cx="1300" cy="640" r="170" fill="#ffe7a8" opacity=".95"/>'
            + ridge(1, 700, 160, 80, "#7a3b6a")
            + ridge(2, 800, 120, 60, "#4e2a5a")
            + ridge(3, 920, 80, 40, "#2b1b3d"))


def night():
    return (grad("n", [(0, "#0b1026"), (0.7, "#1f2a5a"), (1, "#3b3f7a")]),
            f'<rect width="{W}" height="{H}" fill="url(#n)"/>' + stars(7, 380, 800)
            + '<circle cx="1550" cy="220" r="90" fill="#f4f0dc"/><circle cx="1590" cy="200" r="90" fill="#121a3e"/>'
            + ridge(4, 900, 120, 50, "#141b3a"))


def ocean():
    waves = "".join(
        f'<path d="M0 {y} ' + " ".join(f"q{60} {-a} {120} 0 t120 0" for _ in range(1)) + "".join(" t120 0" for _ in range(16))
        + f' V{H} H0 Z" fill="{c}"/>'
        for y, a, c in [(620, 26, "#5ec4d6"), (720, 30, "#3a9fc0"), (840, 34, "#2a7aa8"), (960, 38, "#1d5a86")]
    )
    return (grad("o", [(0, "#bfe6f5"), (1, "#fff3dc")]),
            f'<rect width="{W}" height="{H}" fill="url(#o)"/><circle cx="480" cy="420" r="120" fill="#ffd27a"/>' + waves)


def forest():
    def pines(seed, base, size, color, n):
        rnd = random.Random(seed)
        out = []
        for i in range(n):
            x = i * W / (n - 1) + rnd.uniform(-30, 30)
            s = size * rnd.uniform(0.75, 1.25)
            out.append(f'<polygon points="{x:.0f},{base - s*2.4:.0f} {x - s*0.7:.0f},{base:.0f} {x + s*0.7:.0f},{base:.0f}" fill="{color}"/>')
        return "".join(out) + f'<rect y="{base}" width="{W}" height="{H-base}" fill="{color}"/>'
    return (grad("f", [(0, "#d9f0e3"), (1, "#f6efd6")]),
            f'<rect width="{W}" height="{H}" fill="url(#f)"/>'
            + pines(11, 720, 120, "#a9cdb3", 22) + pines(12, 860, 150, "#6fa585", 16) + pines(13, 1000, 190, "#3e6e57", 12))


def synthwave():
    lines = "".join(f'<line x1="{960 + (x - 960) * 0.05:.0f}" y1="620" x2="{x}" y2="{H}" stroke="#ff3d9a" stroke-width="3" opacity=".8"/>' for x in range(-1920, 3840, 160))
    hor = "".join(f'<line x1="0" y1="{620 + 460 * (i / 12) ** 2:.0f}" x2="{W}" y2="{620 + 460 * (i / 12) ** 2:.0f}" stroke="#ff3d9a" stroke-width="3" opacity=".8"/>' for i in range(1, 13))
    sun_cut = "".join(f'<rect x="660" y="{420 + i*34}" width="600" height="{6 + i*2}" fill="#2a0f4a"/>' for i in range(6))
    return (grad("y", [(0, "#14052e"), (0.6, "#2a0f4a"), (1, "#5b1a6e")]) + grad("ys", [(0, "#ffe76b"), (1, "#ff3d9a")]),
            f'<rect width="{W}" height="{H}" fill="url(#y)"/>' + stars(21, 160, 500)
            + '<circle cx="960" cy="440" r="250" fill="url(#ys)"/>' + sun_cut
            + f'<rect y="620" width="{W}" height="{H-620}" fill="#1a0833"/>' + lines + hor)


def blobs():
    rnd = random.Random(5)
    cols = ["#f7c6d9", "#c9e4f7", "#d8c9f2", "#fde3b8", "#c8ecd9"]
    b = "".join(f'<circle cx="{rnd.uniform(0, W):.0f}" cy="{rnd.uniform(0, H):.0f}" r="{rnd.uniform(220, 420):.0f}" fill="{rnd.choice(cols)}" opacity=".85"/>' for _ in range(9))
    return ('<filter id="bl"><feGaussianBlur stdDeviation="90"/></filter>',
            f'<rect width="{W}" height="{H}" fill="#fff6f2"/><g filter="url(#bl)">{b}</g>')


def room():
    planks = "".join(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="#9c6a43" stroke-width="3"/>' for y in range(880, H, 50))
    joints = "".join(f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y + 50}" stroke="#9c6a43" stroke-width="3"/>' for i, y in enumerate(range(830, H, 50)) for x in range(120 + (i % 2) * 200, W, 400))
    return (grad("wall", [(0, "#f3e3d3"), (1, "#ead2bf")]),
            f'<rect width="{W}" height="{H}" fill="url(#wall)"/>'
            '<rect y="780" width="1920" height="50" fill="#e0c3a8"/><rect y="826" width="1920" height="8" fill="#c99f7c"/>'
            f'<rect y="830" width="{W}" height="{H-830}" fill="#c48b5c"/>' + planks + joints
            + '<rect x="1240" y="170" width="420" height="440" rx="16" fill="#bfe6f5" stroke="#fff" stroke-width="24"/>'
            '<path d="M1450 170 v440 M1240 390 h420" stroke="#fff" stroke-width="16"/>'
            '<circle cx="1560" cy="270" r="40" fill="#fff4c4"/>')


def pixel_city():
    rnd = random.Random(9)
    out = []
    x = 0
    while x < W:
        w = rnd.choice([120, 160, 200, 240])
        h = rnd.randint(260, 640)
        top = H - h
        col = rnd.choice(["#2b2a4a", "#33325a", "#24233f"])
        out.append(f'<rect x="{x}" y="{top}" width="{w}" height="{h}" fill="{col}"/>')
        for wy in range(top + 30, H - 40, 40):
            for wx in range(x + 20, x + w - 20, 40):
                if rnd.random() < 0.45:
                    out.append(f'<rect x="{wx}" y="{wy}" width="20" height="20" fill="#f9d56e"/>')
        x += w + 10
    return (grad("c", [(0, "#ff9a8b"), (0.5, "#ff6a88"), (1, "#7a4da8")]),
            f'<rect width="{W}" height="{H}" fill="url(#c)"/><g shape-rendering="crispEdges">'
            '<rect x="1400" y="160" width="160" height="160" fill="#ffe7a8"/>' + "".join(out) + "</g>")


def lines_minimal():
    paths = "".join(
        f'<path d="M-50 {y} ' + "".join(f"q240 {(-1) ** i * 60} 480 0 " for i in range(5)) + f'" fill="none" stroke="#c9b9a6" stroke-width="3"/>'
        for y in range(120, H, 70)
    )
    return ("", f'<rect width="{W}" height="{H}" fill="#f5efe6"/>{paths}<circle cx="1500" cy="300" r="140" fill="#e07a5f" opacity=".85"/>')


def dots():
    d = "".join(f'<circle cx="{x}" cy="{y}" r="5" fill="#d7cce8"/>' for x in range(40, W, 80) for y in range(40, H, 80))
    return ("", f'<rect width="{W}" height="{H}" fill="#fbf8ff"/>{d}')


def aurora():
    return ('<filter id="au"><feGaussianBlur stdDeviation="40"/></filter>' + grad("a", [(0, "#051622"), (1, "#0b2e3c")]),
            f'<rect width="{W}" height="{H}" fill="url(#a)"/>' + stars(31, 260, 700)
            + '<g filter="url(#au)" opacity=".85">'
            '<path d="M-100 520 C300 200 700 620 1100 320 S1800 260 2050 420" fill="none" stroke="#3dff9b" stroke-width="90"/>'
            '<path d="M-100 640 C400 380 800 760 1200 460 S1800 420 2050 560" fill="none" stroke="#7a5cff" stroke-width="70"/>'
            "</g>" + ridge(33, 960, 70, 40, "#03121b"))


def desert():
    return (grad("d", [(0, "#ffd9a8"), (1, "#ffefd6")]),
            f'<rect width="{W}" height="{H}" fill="url(#d)"/><circle cx="1500" cy="300" r="110" fill="#fff4d6"/>'
            '<path d="M0 760 C400 640 800 700 1100 760 S1700 720 1920 680 V1080 H0 Z" fill="#f2b880"/>'
            '<path d="M0 880 C500 780 900 860 1300 880 S1800 820 1920 860 V1080 H0 Z" fill="#e29a5f"/>'
            '<path d="M0 990 C400 940 900 980 1400 1000 S1800 960 1920 980 V1080 H0 Z" fill="#c97b45"/>')


BACKGROUNDS = {
    "Atardecer": sunset,
    "Noche estrellada": night,
    "Océano": ocean,
    "Bosque": forest,
    "Synthwave": synthwave,
    "Manchas pastel": blobs,
    "Habitación": room,
    "Ciudad pixel": pixel_city,
    "Ondas minimal": lines_minimal,
    "Puntos": dots,
    "Aurora": aurora,
    "Desierto": desert,
}


def render(fn):
    defs, body = fn()
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><defs>{defs}</defs>{body}</svg>\n'
