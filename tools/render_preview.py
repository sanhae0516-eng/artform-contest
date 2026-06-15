"""
render_preview.py (v9) — no ADJUST · fuller source · click glitch demo.
  preview_frame.png  full composition (napoleon) with the longer source
  preview_click.gif  click → shatter → 'compiling/rebuilding' → reassemble
"""
import json, re, random, math
from PIL import Image, ImageDraw, ImageFont
import img2ascii as A

random.seed(7)
F="C:/Windows/Fonts/"; MONO=F+"CascadiaCode.ttf"; KORB=F+"malgunbd.ttf"
BG=(5,6,7); INK=(205,200,184); DIM=(95,107,102); ART=(236,228,210); HOT=(251,248,238)
TAGC=(203,196,178); COLS,ROWS=168,92; BLEED=0.99; VX=57; VY=58
TAG="2026 KGAAC"; TITLE="제2회 대한민국 생성형 AI 창조공모전"
SCR="ABCDEFGHKLMNPRSTUWXabcdefghijkmnoprstuvwxyz0123456789{}[]()<>/*;=+-_$#&%"

with open("src/paintings.js",encoding="utf-8") as f: s=f.read()
PAINTINGS=json.loads(s[s.index("["):s.rindex("]")+1]); BY={p["id"]:p for p in PAINTINGS}
GRID={p["id"]: A.to_ascii_color(f"tools/custom/{p['id']}.png",COLS,ROWS,floor=0.02,black_cut=24)
      for p in PAINTINGS}

W,H=1600,900; COLX=int(W*0.42); RW=W-COLX; RH=H
RATIO=ImageFont.truetype(MONO,100).getlength("M")/100
FS=max(RW/(COLS*RATIO), RH/ROWS)*BLEED; CW=FS*RATIO; CH=FS
GW=COLS*CW; GH=ROWS*CH; OX=(RW-GW)+VX; OY=VY
FART=ImageFont.truetype(MONO, max(5,int(round(FS))))

# fuller source for the code pane
CODE=("""#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#define W 168
#define H 92

/* artFORM · render masterpieces as a calibrated ASCII ramp.
 * luminance -> glyph by measured ink coverage (perceptually even),
 * dark background dropped so the subject floats on the terminal. */
static const char *RAMP =
  " .':-=+*<>!ilvcxznuoJQ0OZmwpqdbkhao#MW&8%B@$";

typedef struct { unsigned char px[H][W]; } canvas;
typedef struct { const char *title, *artist; int year; } plate_t;

static double clampd(double v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
static char glyph(double v){ return RAMP[(int)(clampd(v) * (strlen(RAMP)-1))]; }

static unsigned char tone(unsigned char v){
  double n = pow(v / 255.0, 0.92);
  return (unsigned char)((n < 0.02 ? 0.0 : n) * 255);
}

int blit(canvas c){
  for (int y = 0; y < H; y++){
    for (int x = 0; x < W; x++)
      putchar(glyph(tone(c.px[y][x]) / 255.0));
    putchar('\\n');
  }
  return 0;
}

/* 03 · Napoleon Crossing the Alps — Jacques-Louis David (1801) */
int render_napoleon(void){
  canvas c = load("gallery/napoleon.lum");
  fprintf(stderr, "rendering %s …\\n", "Napoleon Crossing the Alps");
  for (int y = 0; y < H; y++)
    for (int x = 0; x < W; x++)
      c.px[y][x] = tone(c.px[y][x]);
  return blit(c);
}
""")

def tok(line):
    st=line.lstrip()
    return [(line, DIM if st.startswith(("//","/*","*","·")) else INK)]

def art_layer(pid, hide=None, scramble=None):
    hide=hide or set(); scramble=scramble or set()
    layer=Image.new("RGB",(RW,RH),BG); d=ImageDraw.Draw(layer)
    for r in range(ROWS):
        for c in range(COLS):
            g=GRID[pid][r][c][0]
            if g==" " or (r,c) in hide: continue
            x=OX+c*CW; y=OY+r*CH
            if (r,c) in scramble:
                ox=(random.random()-0.5)*CW*3; oy=(random.random()-0.5)*CH*3
                d.text((x+ox,y+oy),random.choice(SCR),font=FART,fill=HOT)
            else:
                d.text((x,y),g,font=FART,fill=ART)
    return layer

def draw_code(d, code):
    cfs=12; fc=ImageFont.truetype(MONO,cfs); lh=round(cfs*1.5)
    capn=(H-170)//lh; lines=code.split("\n"); start=max(0,len(lines)-capn); vis=lines[start:]
    y=18
    for i,ln in enumerate(vis):
        d.text((16,y),str(start+i+1),font=fc,fill=(74,82,76)); x=52
        for seg,col in tok(ln):
            if seg: d.text((x,y),seg,font=fc,fill=col)
        y+=lh
    cx=52+fc.getlength(vis[-1] if vis else ""); cy=18+(len(vis)-1)*lh
    d.rectangle([cx+2,cy+2,cx+2+cfs*0.5,cy+cfs],fill=INK)

def pill(d):
    f=ImageFont.truetype(MONO,11); t="COLOR · MONO"
    d.text((W-f.getlength(t)-16,14),t,font=f,fill=(96,104,100))
    d.text((W-f.getlength("MONO")-16,14),"MONO",font=f,fill=TAGC)

def scrim(img):
    ov=Image.new("RGBA",(W,H),(0,0,0,0)); od=ImageDraw.Draw(ov); h0=int(H*0.55)
    for y in range(h0,H): od.line([(0,y),(W,y)],fill=(0,0,0,int(190*((y-h0)/(H-h0))**1.3)))
    img.alpha_composite(ov)

def box_word(d, word, color=(220,213,195)):   # outline a word in the visible code
    cfs=12; fc=ImageFont.truetype(MONO,cfs); lh=round(cfs*1.5); cw=fc.getlength("M")
    capn=(H-170)//lh; lines=CODE.split("\n"); start=max(0,len(lines)-capn); vis=lines[start:]
    for i,ln in enumerate(vis):
        j=ln.find(word)
        if j>=0:
            x=52+j*cw; y=18+i*lh
            d.rectangle([x-3,y-1,x+len(word)*cw+3,y+lh-1],outline=color)
            return

def compose(layer, fx=None, fxpos=None, tag=TAG, title=TITLE, hcur=False, word=None):
    img=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(img)
    img.paste(layer,(COLX,0)); draw_code(d,CODE)
    if word: box_word(d, word)
    pill(d)
    img=img.convert("RGBA"); scrim(img); d=ImageDraw.Draw(img)
    d.text((46,H-128),tag,font=ImageFont.truetype(KORB,15),fill=TAGC)   # Pretendard (approx)
    fb=ImageFont.truetype(KORB,44); d.text((46,H-94),title,font=fb,fill=(241,235,219))
    if hcur: d.rectangle([46+fb.getlength(title)+7,H-90,46+fb.getlength(title)+26,H-50],fill=(241,235,219))
    if fx: d.text(fxpos,fx,font=ImageFont.truetype(MONO,13),fill=INK)
    return img.convert("RGB")

SHAPES=["fragmented_light","soft_edge","quiet_shadow","warm_grain","still_air",
        "lit_contour","drifting_dust","held_breath","slow_fade","grain_of_time"]
def hue_name(r,g,b):
    mx=max(r,g,b); mn=min(r,g,b)
    if mx<42: return "shadow"
    if mx-mn<24: return "bone" if mx>180 else ("ash" if mx>96 else "slate")
    if r>=g and r>=b: return "amber" if g>112 else "rust"
    if g>=r and g>=b: return "teal" if b>112 else "green"
    return "violet" if r>112 else "blue"
def draw_tip(d,x,y,r,c):
    ch,(rr,gg,bb)=GRID["napoleon"][r][c]; hexv="#%02x%02x%02x"%(rr,gg,bb)
    tone=(0.299*rr+0.587*gg+0.114*bb)/255; layer="%02d"%(1+min(4,int(tone*5)))
    hue=hue_name(rr,gg,bb); shp=SHAPES[abs((r>>3)*73+(c>>3)*149)%len(SHAPES)]
    lines=["pixel[%d][%d] = \"%s\";"%(r,c,hexv),"glyph = '%s';  tone = %.2f;"%(ch,tone),
           "layer = %s;"%layer,"this.color = memory.%s;"%hue,"this.shape = %s;"%shp]
    f=ImageFont.truetype(MONO,12); lh=19
    w=max(f.getlength(t) for t in lines)+22; h=lh*len(lines)+16
    d.rectangle([x,y,x+w,y+h],fill=(7,10,11),outline=(28,35,41))
    yy=y+9
    for t in lines: d.text((x+11,yy),t,font=f,fill=(205,200,184)); yy+=lh
    pre="pixel[%d][%d] = \""%(r,c)                      # hex shown in its own colour
    d.text((x+11+f.getlength(pre),y+9),hexv,font=f,fill=(rr,gg,bb))

def main():
    # frame: hero in Pretendard + a source word boxed (source hover)
    compose(art_layer("napoleon"), word="render_napoleon").save("tools/preview_frame.png")
    print("wrote preview_frame.png")

    # image tooltip still (image hover)
    img=compose(art_layer("napoleon")); d=ImageDraw.Draw(img)
    sel=None
    for r in range(40,62):
        for c in range(118,150):
            if GRID["napoleon"][r][c][0]!=" ": sel=(r,c); break
        if sel: break
    r,c=sel; sx=COLX+OX+c*CW; sy=OY+r*CH
    d.ellipse([sx-4,sy-4,sx+CW+4,sy+CH+4],outline=(230,224,210))
    draw_tip(d, sx+16, sy+10, r, c)
    img.save("tools/preview_tip.png"); print("wrote preview_tip.png")

if __name__=="__main__": main()
