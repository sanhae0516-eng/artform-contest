"""Render a still of the typed contest-intro banner (left) + a painting
mid-render (right). Reuses helpers/data from render_preview."""
import random
from PIL import Image, ImageDraw, ImageFont
import render_preview as rp

F=rp.F
BG,INK,DIM,GREEN,CYAN,ACC,STR,ART = rp.BG,rp.INK,rp.DIM,rp.GREEN,rp.CYAN,rp.ACC,rp.STR,rp.ART
BAR,LINE=rp.BAR,rp.LINE
kor=F+"malgun.ttf"; mono=F+"CascadiaCode.ttf"

BANNER=[
 ("prompt","artform@studio:~$ ./contest --welcome"),
 ("blank",""),
 ("brand","  ART × CODE 2026"),
 ("rule","  ──────────────────────────────────────"),
 ("title","  제1회 artFORM 코드·아트 공모전"),
 ("tag",'  "명화를, 코드로 다시 그리다"'),
 ("blank",""),
 ("kv","  ▸ 주제       명화 재해석 · Generative / ASCII / Creative Coding"),
 ("kv","  ▸ 응모자격    전국 중·고등학생 및 일반부"),
 ("kv","  ▸ 접수기간    2026.07.01 — 08.31"),
 ("kv","  ▸ 시상        대상 1 · 최우수 2 · 우수 5 (총 상금 ○○○만원)"),
 ("kv","  ▸ 접수처      contest.artform.kr"),
 ("blank",""),
 ("prompt","artform@studio:~$ ./render --gallery --loop"),
]
COL={"prompt":GREEN,"brand":ACC,"rule":DIM,"title":(232,236,232),
     "tag":STR,"kv":INK,"blank":INK}

def main():
    W,H=1600,900
    img=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(img)
    tb=46
    d.rectangle([0,0,W,tb],fill=BAR); d.line([0,tb,W,tb],fill=LINE)
    for i,c in enumerate([(255,95,86),(255,189,46),(39,201,63)]):
        d.ellipse([18+i*22,tb//2-6,30+i*22,tb//2+6],fill=c)
    f12=ImageFont.truetype(mono,15)
    d.text((110,tb//2-9),"artform@studio — ./contest --welcome",font=f12,fill=(136,147,160))
    badge="ART × CODE 2026"
    d.text((W-f12.getlength(badge)-22,tb//2-9),badge,font=f12,fill=ACC)
    colx=int(W*0.42); d.line([colx,tb,colx,H],fill=LINE)

    # left: banner typed (Malgun handles KR + box chars)
    fb=ImageFont.truetype(kor,19); lh=34; y=tb+40
    for kind,text in BANNER:
        if kind=="kv" and text.strip():
            # split "▸ key   value" -> key INK, value DIM
            d.text((34,y),text,font=fb,fill=INK)
        else:
            d.text((34,y),text,font=fb,fill=COL[kind])
        y+=lh
    # cursor
    d.rectangle([34+fb.getlength("artform@studio:~$ ./render --gallery --loop")+4,
                 y-lh+4,34+fb.getlength("artform@studio:~$ ./render --gallery --loop")+16,y-6],fill=GREEN)

    # right: pearl mid-render with glitch head
    p=rp.BY["pearl"]; arows=p["art"].split("\n")
    px0,px1,py0,py1=colx+14,W-14,tb+14,H-14
    afs=rp.fit_art_font(p["art"],px1-px0,py1-py0,mono)
    fart=ImageFont.truetype(mono,afs); alh=round(afs*1.0)
    aw=max(fart.getlength(l) for l in arows); ah=len(arows)*alh
    ox=px0+((px1-px0)-aw)/2; oy=py0+((py1-py0)-ah)/2
    random.seed(3); shown=int(len(arows)*0.46)
    for i,ln in enumerate(arows):
        if i<shown:
            d.text((ox,oy+i*alh),ln,font=fart,fill=ART)
        elif i<shown+2:
            g="".join(random.choice(rp.PALETTE_GLYPHS) if ch!=" " else " " for ch in ln)
            d.text((ox,oy+i*alh),g,font=fart,fill=(150,140,120))
    img.save("tools/preview_banner.png"); print("wrote tools/preview_banner.png")

if __name__=="__main__":
    main()
