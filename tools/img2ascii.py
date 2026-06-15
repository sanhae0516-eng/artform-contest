"""
img2ascii.py — image -> ASCII grid + colour grid.

Recognizability: (1) CALIBRATED palette (glyph ink-coverage measured in the
real font), (2) autocontrast + unsharp tone mapping.
Background: respects PNG alpha (transparent -> blank); for images without
alpha an optional luminance `floor` drops the darkest tones to blank so the
subject melts into a black terminal.
Colour: a tinted RGB grid (desaturated toward bone, lifted to read on black).
"""
import bisect, functools, sys
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageFilter, ImageChops

MONO = "C:/Windows/Fonts/CascadiaCode.ttf"
PALETTE = " .'`^\":;~-_+<>i!lI?][}{1)(|tfjrxnuvczXYUJCLQ0OZmwqpdbkhao#MW&8%B@$"
_CANDIDATES = (" .'`,:;_-~\"^=+*!?/\\|()[]{}<>ilrtfjxnuvczXYUJLCQ0OZmwqpdbkhao"
               "#MW&8%B@$0123456789")


@functools.lru_cache(maxsize=8)
def calibrated_ramp(font_path=MONO, px=32):
    font = ImageFont.truetype(font_path, px)
    asc, desc = font.getmetrics(); h = asc + desc
    w = max(1, round(font.getlength("M")))
    seen, pairs = set(), []
    for ch in _CANDIDATES:
        if ch in seen:
            continue
        seen.add(ch)
        im = Image.new("L", (w, h), 0)
        ImageDraw.Draw(im).text((0, 0), ch, font=font, fill=255)
        pairs.append((sum(im.getdata()) / (255.0 * w * h), ch))
    pairs.sort()
    mx = pairs[-1][0] or 1.0
    return [p[0] / mx for p in pairs], [p[1] for p in pairs]


def _glyph(t, covs, chars):
    i = bisect.bisect_left(covs, t)
    if i <= 0:         return chars[0]
    if i >= len(covs): return chars[-1]
    return chars[i] if abs(covs[i] - t) < abs(covs[i - 1] - t) else chars[i - 1]


def _subject_mask(rgb, alpha, black_cut):
    """255 where the subject is, 0 on the (alpha- or black-) background."""
    if alpha is not None:
        return alpha.point(lambda a: 255 if a >= 110 else 0)
    r, g, b = rgb.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)     # max channel
    return mx.point(lambda v: 255 if v >= black_cut else 0)


def _masked_stretch(L, mask, lo_p=0.02, hi_p=0.995):
    """Linearly stretch L using percentiles computed over masked pixels only —
    so a large black background can't flatten the subject's contrast."""
    hist = L.histogram(mask); tot = sum(hist)
    if tot == 0:
        return L
    loN, hiN = tot * lo_p, tot * hi_p
    c = 0; lo = 0; hi = 255
    for i, h in enumerate(hist):
        c += h
        if c <= loN: lo = i
        if c <= hiN: hi = i
    if hi <= lo:
        return L
    sc = 255.0 / (hi - lo)
    return L.point(lambda v: 0 if v <= lo else (255 if v >= hi else int((v - lo) * sc)))


def _prep(path, cols, rows, sharpen, black_cut):
    src = Image.open(path)
    alpha = src.getchannel("A").convert("L") if "A" in src.getbands() else None
    rgb = src.convert("RGB")
    mask = _subject_mask(rgb, alpha, black_cut)
    g = _masked_stretch(rgb.convert("L"), mask)
    if sharpen:
        g = g.filter(ImageFilter.UnsharpMask(radius=2, percent=95, threshold=2))

    cell = 0.5; sw, sh = rgb.size
    sa, ga = sw / sh, (cols * cell) / rows
    if sa > ga: nc, nr = cols, max(1, round(cols * cell / sa))
    else:       nr, nc = rows, max(1, round(rows * sa / cell))

    g = g.resize((nc, nr), Image.LANCZOS)
    rgb = rgb.resize((nc, nr), Image.LANCZOS)
    mask = mask.resize((nc, nr), Image.LANCZOS)
    return g, rgb, mask, (rows - nr) // 2, (cols - nc) // 2, nc, nr


def _sample(path, cols, rows, gamma, sharpen, floor, sat, lift, black_cut):
    """Return (charGrid, colorGrid); blank cell = (' ', None). Background (alpha
    or near-black) is left blank so the art melts into a black terminal."""
    covs, chars = calibrated_ramp()
    g, rgb, mask, pt, pl, nc, nr = _prep(path, cols, rows, sharpen, black_cut)
    gp, cp, mp = g.load(), rgb.load(), mask.load()
    ch_grid = [[" "] * cols for _ in range(rows)]
    co_grid = [[None] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            sr, sc = r - pt, c - pl
            if not (0 <= sr < nr and 0 <= sc < nc):
                continue
            if mp[sc, sr] < 128:                  # background
                continue
            v0 = gp[sc, sr] / 255.0
            if v0 < floor:
                continue
            ch_grid[r][c] = _glyph(pow(v0, gamma), covs, chars)
            pr, pg, pb = cp[sc, sr]
            lum = 0.299 * pr + 0.587 * pg + 0.114 * pb
            mix = lambda x: int(max(0, min(255, lift + (lum * (1 - sat) + x * sat))))
            co_grid[r][c] = (mix(pr), mix(pg), mix(pb))
    return ch_grid, co_grid


def to_ascii(path, cols=168, rows=92, gamma=0.92, sharpen=True, floor=0.07, black_cut=0):
    ch, _ = _sample(path, cols, rows, gamma, sharpen, floor, 0.7, 70, black_cut)
    return "\n".join("".join(row).rstrip() for row in ch)


def to_color_image(path, cols=168, rows=92, gamma=0.92, sharpen=True,
                   floor=0.07, sat=0.72, lift=64, black_cut=0):
    """cols x rows RGB image; blank cells are black (not drawn on the client)."""
    _, co = _sample(path, cols, rows, gamma, sharpen, floor, sat, lift, black_cut)
    im = Image.new("RGB", (cols, rows), (0, 0, 0))
    im.putdata([c if c else (0, 0, 0) for row in co for c in row])
    return im


def to_ascii_color(path, cols=168, rows=92, gamma=0.92, sharpen=True,
                   floor=0.07, sat=0.72, lift=64, black_cut=0):
    ch, co = _sample(path, cols, rows, gamma, sharpen, floor, sat, lift, black_cut)
    return [[(ch[r][c], co[r][c] or (0, 0, 0)) for c in range(cols)] for r in range(rows)]


if __name__ == "__main__":
    print(to_ascii(sys.argv[1]))
