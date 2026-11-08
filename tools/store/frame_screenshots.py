"""
Frames raw phone screenshots for the Play listing: brand background, caption on top, rounded
screenshot below. Captions come from store/en/screenshots.md (keep them in sync; no "free",
"no ads", "#1", "best" or emoji — CLAUDE.md rule 8).

    python tools/store/frame_screenshots.py <raw-dir> <out-dir>

<raw-dir> holds 1.png … 5.png (1080 × 2400 emulator captures, in caption order).
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / 'node_modules/@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'

CREAM = (255, 248, 236)
VIOLET = (109, 63, 224)
SUNNY = (255, 201, 60)
INK = (30, 27, 58)

CAPTIONS = [
    'Decode a timeless quote every day',
    'No timers. No lives. Solve at your own pace.',
    'Meet the author behind every quote',
    'Big, clear letters, easy on the eyes',
    'Your streak and progress, safely backed up',
]

W, H = 1080, 1920


def wrap(draw, text, font, width):
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if draw.textlength(trial, font=font) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def frame(raw: Path, caption: str, index: int) -> Image.Image:
    canvas = Image.new('RGB', (W, H), CREAM)
    d = ImageDraw.Draw(canvas)
    # Soft brand blobs behind the phone.
    d.ellipse((-260, 1180, 520, 1960), fill=(255, 233, 168))
    d.ellipse((640, 1280, 1340, 1980), fill=(232, 222, 255))
    # Largest size that fits in two lines without a single word left on the last line.
    for size in range(76, 40, -2):
        font = ImageFont.truetype(str(FONT), size)
        lines = wrap(d, caption, font, W - 160)
        if len(lines) <= 2 and (len(lines) == 1 or ' ' in lines[-1]):
            break
    y = 90
    for line in lines:
        tw = d.textlength(line, font=font)
        d.text(((W - tw) / 2, y), line, font=font, fill=INK)
        y += int(font.size * 1.2)
    d.rounded_rectangle((W / 2 - 70, y + 14, W / 2 + 70, y + 30), radius=8, fill=SUNNY if index % 2 else VIOLET)
    shot = Image.open(raw).convert('RGB')
    top = y + 70
    h = H - top - 40
    w = int(shot.width * h / shot.height)
    shot = shot.resize((w, h), Image.LANCZOS)
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=48, fill=255)
    x = (W - w) // 2
    d.rounded_rectangle((x - 12, top - 12, x + w + 12, top + h + 12), radius=58, fill=INK)
    canvas.paste(shot, (x, top), mask)
    return canvas


def main():
    raw_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, caption in enumerate(CAPTIONS, start=1):
        raw = raw_dir / f'{i}.png'
        if not raw.exists():
            print(f'skip {raw} (missing)')
            continue
        frame(raw, caption, i).save(out_dir / f'play-phone-{i}.png', optimize=True)
        print(f'wrote {out_dir / f"play-phone-{i}.png"}')


if __name__ == '__main__':
    main()
