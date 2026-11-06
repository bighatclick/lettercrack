"""Builds the LetterCrack app icon set (Inky Pop) as SVG, then renders PNGs with headless Edge/Chrome.

Run: python tools/icon/make_icon.py
Writes assets/images/{icon,android-icon-foreground,android-icon-background,
android-icon-monochrome,splash-icon,favicon}.png. The SVG sources go to tools/icon/out/.
"""

import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "tools", "icon", "out")
IMAGES = os.path.join(ROOT, "assets", "images")

BROWSERS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
]

# ---------------------------------------------------------------- shared defs
DEFS = """
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#2A1F6B"/>
    <stop offset="0.55" stop-color="#4B2BB8"/>
    <stop offset="1" stop-color="#7A4CF0"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFC93C" stop-opacity="0.55"/>
    <stop offset="1" stop-color="#FFC93C" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#C9B8FF" stop-opacity="0.75"/>
    <stop offset="0.55" stop-color="#A98BFF" stop-opacity="0.3"/>
    <stop offset="1" stop-color="#A98BFF" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowPink" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FF7EB6" stop-opacity="0.45"/>
    <stop offset="1" stop-color="#FF7EB6" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="body" cx="0.36" cy="0.34" r="0.78">
    <stop offset="0" stop-color="#9DB4FF"/>
    <stop offset="0.32" stop-color="#5A70F0"/>
    <stop offset="0.72" stop-color="#2F33A8"/>
    <stop offset="1" stop-color="#1A1660"/>
  </radialGradient>
  <radialGradient id="belly" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#B9C8FF" stop-opacity="0.55"/>
    <stop offset="1" stop-color="#B9C8FF" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="shine" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="eye" cx="0.42" cy="0.32" r="0.75">
    <stop offset="0" stop-color="#FFFFFF"/>
    <stop offset="0.7" stop-color="#F1F3FF"/>
    <stop offset="1" stop-color="#BFC6EA"/>
  </radialGradient>
  <radialGradient id="iris" cx="0.5" cy="0.38" r="0.62">
    <stop offset="0" stop-color="#FFE29A"/>
    <stop offset="0.5" stop-color="#F59A2A"/>
    <stop offset="1" stop-color="#8A3A0C"/>
  </radialGradient>
  <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFF2B8"/>
    <stop offset="0.45" stop-color="#F5BE2E"/>
    <stop offset="1" stop-color="#9C6A06"/>
  </linearGradient>
  <radialGradient id="blush" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FF7A9C" stop-opacity="0.8"/>
    <stop offset="1" stop-color="#FF7A9C" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="limb" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5E72F2"/>
    <stop offset="1" stop-color="#25217A"/>
  </linearGradient>
  <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#140F3C" stop-opacity="0.55"/>
    <stop offset="1" stop-color="#140F3C" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="mouth" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5A1238"/>
    <stop offset="1" stop-color="#2A0818"/>
  </linearGradient>
  <linearGradient id="tileShine" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.45"/>
    <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
  </linearGradient>
</defs>
"""

# Inky in the "wave" pose, drawn in the same 200 x 220 space as src/ui/fx/Inky.tsx.
INKY = """
<ellipse cx="100" cy="212" rx="62" ry="10" fill="url(#shadow)"/>
<ellipse cx="76" cy="203" rx="18" ry="10" fill="url(#limb)"/>
<ellipse cx="124" cy="203" rx="18" ry="10" fill="url(#limb)"/>
<ellipse cx="70" cy="199" rx="7" ry="3" fill="#FFFFFF" opacity="0.35"/>
<ellipse cx="118" cy="199" rx="7" ry="3" fill="#FFFFFF" opacity="0.35"/>
<path d="M100 12 C109 40 170 94 170 140 A70 70 0 0 1 30 140 C30 94 91 40 100 12 Z" fill="url(#body)"/>
<path d="M150 92 Q172 128 160 172" fill="none" stroke="#C9B8FF" stroke-width="4" stroke-linecap="round" opacity="0.55"/>
<ellipse cx="100" cy="168" rx="50" ry="36" fill="url(#belly)"/>
<ellipse cx="68" cy="80" rx="14" ry="28" transform="rotate(28 68 80)" fill="url(#shine)" opacity="0.75"/>
<ellipse cx="98" cy="30" rx="3" ry="7" transform="rotate(20 98 30)" fill="#FFFFFF" opacity="0.6"/>
<ellipse cx="56" cy="152" rx="16" ry="10" fill="url(#blush)"/>
<ellipse cx="144" cy="152" rx="16" ry="10" fill="url(#blush)"/>
<circle cx="76" cy="122" r="20" fill="url(#eye)"/>
<circle cx="124" cy="122" r="20" fill="url(#eye)"/>
<circle cx="77" cy="125" r="12" fill="url(#iris)"/>
<circle cx="125" cy="125" r="12" fill="url(#iris)"/>
<circle cx="77" cy="125" r="6.5" fill="#120E2E"/>
<circle cx="125" cy="125" r="6.5" fill="#120E2E"/>
<circle cx="81" cy="120" r="4" fill="#FFFFFF"/>
<circle cx="129" cy="120" r="4" fill="#FFFFFF"/>
<circle cx="73" cy="130" r="1.8" fill="#FFFFFF"/>
<circle cx="121" cy="130" r="1.8" fill="#FFFFFF"/>
<path d="M56 120 A20 20 0 0 1 96 120 Q76 108 56 120 Z" fill="#1A1660" opacity="0.22"/>
<path d="M104 120 A20 20 0 0 1 144 120 Q124 108 104 120 Z" fill="#1A1660" opacity="0.22"/>
<path d="M60 92 Q74 83 88 89" fill="none" stroke="#17134F" stroke-width="5.5" stroke-linecap="round"/>
<path d="M112 89 Q126 83 140 92" fill="none" stroke="#17134F" stroke-width="5.5" stroke-linecap="round"/>
<circle cx="124" cy="122" r="25" fill="#CFE6FF" fill-opacity="0.16" stroke="url(#brass)" stroke-width="5"/>
<path d="M108 110 Q114 101 125 99" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
<path d="M148 128 Q162 152 152 178" fill="none" stroke="#F5BE2E" stroke-width="2" stroke-dasharray="2.5 3.5" stroke-linecap="round"/>
<path d="M84 152 Q100 176 116 152 Z" fill="url(#mouth)"/>
<path d="M88 153 Q100 157 112 153 L111 157 Q100 161 89 157 Z" fill="#FFFFFF"/>
<ellipse cx="100" cy="166" rx="7" ry="4" fill="#FF7A8A"/>
<path d="M42 150 Q24 166 30 186" fill="none" stroke="url(#limb)" stroke-width="12" stroke-linecap="round"/>
<circle cx="30" cy="189" r="9.5" fill="url(#limb)"/>
<path d="M158 148 Q184 128 180 98" fill="none" stroke="url(#limb)" stroke-width="12" stroke-linecap="round"/>
<circle cx="180" cy="93" r="10.5" fill="#5E72F2"/>
<circle cx="177" cy="89" r="3" fill="#FFFFFF" opacity="0.5"/>
"""

# Silhouette for the Android monochrome (themed) icon: body, feet and arms, with the eyes cut out.
INKY_MONO = """
<mask id="eyes">
  <rect x="-50" y="-50" width="300" height="320" fill="#fff"/>
  <circle cx="76" cy="122" r="17" fill="#000"/>
  <circle cx="124" cy="122" r="17" fill="#000"/>
  <path d="M84 152 Q100 176 116 152 Z" fill="#000"/>
</mask>
<g mask="url(#eyes)" fill="#FFFFFF">
  <path d="M100 12 C109 40 170 94 170 140 A70 70 0 0 1 30 140 C30 94 91 40 100 12 Z"/>
  <ellipse cx="76" cy="203" rx="18" ry="10"/>
  <ellipse cx="124" cy="203" rx="18" ry="10"/>
</g>
<g fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round">
  <path d="M42 150 Q24 166 30 186"/>
  <path d="M158 148 Q184 128 180 98"/>
</g>
<circle cx="30" cy="189" r="9.5" fill="#FFFFFF"/>
<circle cx="180" cy="93" r="10.5" fill="#FFFFFF"/>
<circle cx="80" cy="124" r="7" fill="#FFFFFF"/>
<circle cx="128" cy="124" r="7" fill="#FFFFFF"/>
"""


def tile(x, y, size, rot, fill, edge, letter, ink, cipher=None):
    """A puzzle tile with a 3D bottom edge and a letter, as in the puzzle screen."""
    r = size * 0.22
    d = size * 0.11
    font = "font-family:'Arial Rounded MT Bold','Nunito','Segoe UI',Arial,sans-serif;font-weight:900"
    small = ""
    if cipher:
        small = (
            f'<text x="{size * 0.5}" y="{size * 0.27}" text-anchor="middle" '
            f'style="{font};font-size:{size * 0.2}px" fill="{ink}" opacity="0.6">{cipher}</text>'
        )
    return f"""
<g transform="translate({x} {y}) rotate({rot} {size / 2} {size / 2})">
  <rect x="{size * 0.04}" y="{d * 2.2}" width="{size * 0.92}" height="{size}" rx="{r}" fill="#140F3C" opacity="0.28"/>
  <rect x="0" y="{d}" width="{size}" height="{size}" rx="{r}" fill="{edge}"/>
  <rect x="0" y="0" width="{size}" height="{size}" rx="{r}" fill="{fill}"/>
  <rect x="0" y="0" width="{size}" height="{size}" rx="{r}" fill="url(#tileShine)"/>
  {small}
  <text x="{size * 0.5}" y="{size * (0.8 if cipher else 0.73)}" text-anchor="middle"
        style="{font};font-size:{size * (0.56 if cipher else 0.62)}px" fill="{ink}">{letter}</text>
</g>"""


def sparkle(x, y, s, color):
    return (
        f'<path transform="translate({x} {y}) scale({s})" '
        f'd="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="{color}"/>'
    )


def background(size=1024):
    """Night gradient with warm and pink glows, soft rays and a few floating cipher letters."""
    s = size / 1024
    rays = "".join(
        f'<path d="M512 560 L{512 + 1400 * __import__("math").cos(a)} {560 + 1400 * __import__("math").sin(a)} '
        f'L{512 + 1400 * __import__("math").cos(a + 0.16)} {560 + 1400 * __import__("math").sin(a + 0.16)} Z" '
        f'fill="#FFFFFF" opacity="0.05"/>'
        for a in [i * 0.52 for i in range(12)]
    )
    letters = "".join(
        f'<text x="{x}" y="{y}" style="font-family:Consolas,\'IBM Plex Mono\',monospace;font-weight:700;'
        f'font-size:{fs}px" fill="{c}" opacity="{o}" transform="rotate({r} {x} {y})">{t}</text>'
        for x, y, fs, c, o, r, t in [
            (120, 230, 96, "#FFC93C", 0.22, -14, "Q"),
            (860, 900, 110, "#20C3AF", 0.22, 12, "X"),
            (90, 880, 84, "#FF7EB6", 0.22, 10, "R"),
            (900, 190, 78, "#FFFFFF", 0.16, 16, "Z"),
        ]
    )
    return f"""
<g transform="scale({s})">
  <rect width="1024" height="1024" fill="url(#bg)"/>
  {rays}
  <circle cx="820" cy="170" r="420" fill="url(#glow)"/>
  <circle cx="110" cy="960" r="420" fill="url(#glowPink)"/>
  {letters}
</g>"""


def foreground(scale=1.0, with_tiles=True):
    """Inky waving, with a coral 'L' and a sunny 'C' tile: LetterCrack. Centred in a 1024 box."""
    parts = []
    if with_tiles:
        parts.append(tile(150, 300, 230, -12, "#FF6B6B", "#B23030", "L", "#1E1B3A", cipher="K"))
        parts.append(tile(650, 220, 230, 10, "#FFC93C", "#C98A00", "C", "#1E1B3A", cipher="W"))
        parts.append(sparkle(600, 150, 3.2, "#FFFFFF"))
        parts.append(sparkle(250, 205, 2.2, "#20C3AF"))
        parts.append(sparkle(890, 560, 2.6, "#FF7EB6"))
    parts.append('<circle cx="512" cy="640" r="360" fill="url(#halo)"/>')
    # Inky: 224-wide drawing box scaled to ~600 px, sitting low and centred.
    k = 2.75
    parts.append(f'<g transform="translate({512 - 100 * k} {300}) scale({k})">{INKY}</g>')
    body = "\n".join(parts)
    return f'<g transform="translate(512 512) scale({scale}) translate(-512 -512)">{body}</g>'


def svg(content, size=1024):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
        f"{DEFS}{content}</svg>"
    )


def find_browser():
    for b in BROWSERS:
        if os.path.isabs(b) and os.path.exists(b):
            return b
        found = shutil.which(b)
        if found:
            return found
    sys.exit("Need Edge or Chrome to render the icon.")


def render(name, svg_text, size, browser):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, f"{name}.svg"), "w", encoding="utf-8", newline="\n") as f:
        f.write(svg_text)
    html = (
        "<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}"
        "svg{display:block}</style></head><body>" + svg_text + "</body></html>"
    )
    tmp = tempfile.mkdtemp()
    page = os.path.join(tmp, "p.html")
    with open(page, "w", encoding="utf-8") as f:
        f.write(html)
    target = os.path.join(IMAGES, f"{name}.png")
    subprocess.run(
        [
            browser,
            "--headless=new",
            f"--user-data-dir={tmp}",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--default-background-color=00000000",
            f"--window-size={size},{size}",
            f"--screenshot={target.replace(os.sep, '/')}",
            "file:///" + page.replace("\\", "/"),
        ],
        check=True,
        capture_output=True,
        timeout=60,
    )
    shutil.rmtree(tmp, ignore_errors=True)
    print("wrote", os.path.relpath(target, ROOT))


def main():
    b = find_browser()
    full = background() + foreground()
    # iOS / store icon: 1024, opaque, no rounded corners (the OS masks it).
    render("icon", svg(full), 1024, b)
    # Android adaptive: the OS crops to a circle/squircle about 61-66% across, so the
    # foreground is shrunk into that safe zone and drawn on a transparent layer.
    render("android-icon-background", svg(background()), 1024, b)
    render("android-icon-foreground", svg(foreground(scale=0.66)), 1024, b)
    render("android-icon-monochrome", svg(f'<g transform="translate(512 512) scale(1.9) translate(-104 -112)">{INKY_MONO}</g>'), 1024, b)
    # Splash: Inky alone on a transparent square; app.json sets the cream / indigo background.
    render("splash-icon", svg(f'<g transform="translate(512 520) scale(4.2) translate(-104 -112)">{INKY}</g>'), 1024, b)
    render("favicon", svg(background(48) + f'<g transform="scale({48 / 1024})">{foreground(with_tiles=False)}</g>', 48), 48, b)


if __name__ == "__main__":
    main()
