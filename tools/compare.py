"""Render a labelled comparison of recognizability methods for one painting."""
import sys
from PIL import Image, ImageDraw, ImageFont
import img2ascii as A

MONO = A.MONO
BG = (8, 9, 10)
ART = (236, 228, 210)
LBL = (224, 175, 104)
SUB = (130, 140, 150)

# legacy method (old fixed ramp, no sharpen) for the "before" panel
def legacy_ascii(path, cols=104, rows=56, gamma=0.85):
    from PIL import ImageOps
    im = ImageOps.autocontrast(Image.open(path).convert("L"), cutoff=1)
    cell = 0.5; sw, sh = im.size; sa = sw / sh; ga = cols * cell / rows
    if sa > ga: nc, nr = cols, max(1, round(cols * cell / sa))
    else:       nr, nc = rows, max(1, round(rows * sa / cell))
    im = im.resize((nc, nr), Image.LANCZOS); px = im.load()
    P = A.PALETTE; n = len(P) - 1
    pt, pl = (rows - nr) // 2, (cols - nc) // 2; out = []
    for r in range(rows):
        s = ""
        for c in range(cols):
            sr, sc = r - pt, c - pl
            s += P[round(pow(px[sc, sr]/255.0, gamma) * n)] if (0<=sr<nr and 0<=sc<nc) else " "
        out.append(s.rstrip())
    return "\n".join(out)


def panel(draw, x, y, w, h, label, sub, art, color=None):
    f = ImageFont.truetype(MONO, 15)
    draw.text((x, y), label, font=f, fill=LBL)
    draw.text((x + f.getlength(label) + 14, y + 1), sub, font=ImageFont.truetype(MONO, 12), fill=SUB)
    ay = y + 26
    if color:                      # list of rows of (ch,(r,g,b))
        rows = len(color); cols = max(len(r) for r in color)
        fs = _fit(cols, rows, w, h - 26)
        fa = ImageFont.truetype(MONO, fs); lh = round(fs * 1.0); cw = fa.getlength("M")
        for i, row in enumerate(color):
            for j, (ch, col) in enumerate(row):
                if ch != " ":
                    draw.text((x + j * cw, ay + i * lh), ch, font=fa, fill=col)
    else:
        lines = art.split("\n"); rows = len(lines); cols = max(len(l) for l in lines)
        fs = _fit(cols, rows, w, h - 26)
        fa = ImageFont.truetype(MONO, fs); lh = round(fs * 1.0)
        for i, l in enumerate(lines):
            draw.text((x, ay + i * lh), l, font=fa, fill=ART)


def _fit(cols, rows, w, h):
    for px in range(16, 3, -1):
        fa = ImageFont.truetype(MONO, px)
        if cols * fa.getlength("M") <= w and rows * px <= h:
            return px
    return 4


def main(pid):
    img_path = f"tools/_{pid}.img"
    W, H = 2000, 1180
    img = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(img)
    pw, ph = (W - 60) // 2, (H - 90) // 2
    d.text((24, 14), f"recognizability comparison — {pid}", font=ImageFont.truetype(MONO, 20), fill=(210, 215, 220))

    cells = [
        ("1. CURRENT", "old ramp · 104w", legacy_ascii(img_path), None),
        ("2. CALIBRATED mono", "coverage ramp + sharpen · 120w", A.to_ascii(img_path, 120, 66), None),
        ("3. CALIBRATED mono", "hi-detail · 168w", A.to_ascii(img_path, 168, 92), None),
        ("4. CALIBRATED tint", "subtle colour · 140w", None, A.to_ascii_color(img_path, 140, 78)),
    ]
    for k, (lab, sub, art, col) in enumerate(cells):
        x = 24 + (k % 2) * (pw + 12)
        y = 48 + (k // 2) * (ph + 12)
        d.rectangle([x - 6, y - 6, x + pw, y + ph], outline=(28, 32, 36))
        panel(d, x, y, pw, ph, lab, sub, art, col)
    out = f"tools/compare_{pid}.png"; img.save(out); print("wrote", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "pearl")
