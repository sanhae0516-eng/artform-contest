"""render_concept.py — a concept board for upgraded section designs."""
import json, re
from PIL import Image, ImageDraw, ImageFont
import img2ascii as A

F="C:/Windows/Fonts/"; MONO=F+"CascadiaCode.ttf"; KORB=F+"malgunbd.ttf"; KOR=F+"malgun.ttf"
BG=(5,6,7); INK=(205,200,184); DIM=(95,107,102); ART=(236,228,210); GOLD=(231,217,160)
ACC=(220,213,195); PANEL=(8,11,12); BORD=(28,35,41); COLS,ROWS=168,92
with open("src/paintings.js",encoding="utf-8") as f: s=f.read()
P=json.loads(s[s.index("["):s.rindex("]")+1])
GRID={p["id"]: A.to_ascii_color(f"tools/custom/{p['id']}.png",COLS,ROWS,floor=0.02,black_cut=24) for p in P}
TITLES={"pearl":"진주 귀걸이를 한 소녀","klimt":"키스","napoleon":"알프스를 넘는 나폴레옹","monalisa":"모나리자"}

W,H=1600,1120
img=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(img)
def mono(s): return ImageFont.truetype(MONO,s)
def kor(s): return ImageFont.truetype(KORB,s)
def panel(x,y,w,h,dots=True):
    d.rounded_rectangle([x,y,x+w,y+h],10,fill=PANEL,outline=BORD)
    if dots:
        for i,c in enumerate([(255,95,86),(255,189,46),(39,201,63)]):
            d.ellipse([x+16+i*20,y+15,x+27+i*20,y+26],fill=c)

d.text((40,30),"섹션 고도화 제안",font=kor(30),fill=(241,235,219))
d.text((300,40),"— section design concept (정보를 ‘터미널 세션의 연속’으로)",font=mono(15),fill=DIM)

# ---- Panel A: timeline as live status log ----
ax,ay,aw,ah=40,90,740,330; panel(ax,ay,aw,ah)
d.text((ax+20,ay+44),"art@artFORM:~$ ./schedule --status",font=mono(15),fill=(126,231,135))
rows=[("[✓]","2026.07.01","접수 시작",DIM),
      ("[►]","2026.08.31","접수 마감",GOLD),
      ("[ ]","2026.09","1차 심사",DIM),
      ("[ ]","2026.09.20","결과 발표",DIM),
      ("[ ]","2026.10","시상식",DIM)]
yy=ay+82
for mark,dt,label,col in rows:
    d.text((ax+22,yy),mark,font=mono(15),fill=GOLD if mark=="[►]" else DIM)
    d.text((ax+62,yy),dt,font=mono(15),fill=col)
    d.text((ax+210,yy-1),label,font=kor(16),fill=(207,200,182) if col==GOLD else DIM)
    if mark=="[►]":
        d.text((ax+360,yy),"▰▰▰▰▰▰▰▱▱▱",font=mono(15),fill=GOLD)
        d.text((ax+560,yy),"D-78 · 접수 중",font=mono(14),fill=GOLD)
    yy+=42
d.text((ax+20,ay+ah-34),"// 오늘 날짜로 ‘현재 단계’ 자동 하이라이트 + 진행바",font=mono(13),fill=DIM)

# ---- Panel B: prizes (featured 대상 + grid + total pool) ----
bx,by,bw,bh=820,90,740,330; panel(bx,by,bw,bh,dots=False)
d.text((bx+22,by+18),"/* prizes */",font=mono(14),fill=DIM)
d.text((bx+22,by+44),"TOTAL POOL  reward_sum = ",font=mono(16),fill=INK)
d.text((bx+22+mono(16).getlength("TOTAL POOL  reward_sum = "),by+44),"₩ ○○,○○○,○○○",font=mono(16),fill=GOLD)
# featured 대상
d.rounded_rectangle([bx+22,by+86,bx+360,by+bh-24],10,outline=(60,54,38),fill=(14,13,9))
d.text((bx+40,by+104),"GRAND",font=mono(13),fill=GOLD)
d.text((bx+40,by+126),"대상",font=kor(34),fill=(241,235,219))
d.text((bx+40,by+182),"reward = 3,000,000;",font=mono(16),fill=GOLD)
d.text((bx+40,by+210),"winners = 1;",font=mono(15),fill=DIM)
d.text((bx+40,by+244),"+ 전시 · 트로피",font=kor(15),fill=(180,174,158))
# small cards
sc=[("GOLD","최우수상","2"),("SILVER","우수상","5"),("SELECT","입선","○○")]
syy=by+86
for rank,name,n in sc:
    d.rounded_rectangle([bx+380,syy,bx+bw-22,syy+72],8,outline=BORD)
    d.text((bx+398,syy+12),rank,font=mono(12),fill=DIM)
    d.text((bx+398,syy+30),name,font=kor(20),fill=(232,226,210))
    d.text((bx+bw-150,syy+30),"x "+n,font=mono(15),fill=GOLD)
    syy+=80
d.text((bx+380,by+bh-30),"// 대상 강조 + 금액을 코드 값으로",font=mono(12),fill=DIM)

# ---- Panel C: gallery strip (ASCII masterpieces) ----
cx,cy,cw,ch=40,452,1520,300; panel(cx,cy,cw,ch)
d.text((cx+20,cy+44),"art@artFORM:~$ ls gallery/   # 재해석 대상 명화",font=mono(15),fill=(126,231,135))
def thumb(pid,x,y,w,h):
    fs=max(2,min((w)/(COLS*0.6),h/ROWS)); fa=mono(int(round(fs))) if fs>=4 else mono(4)
    cw_=fa.getlength("M"); ox=x+(w-COLS*cw_)/2; oy=y
    for r in range(0,ROWS,1):
        line="".join(GRID[pid][r][c][0] for c in range(COLS)).rstrip()
        if line.strip(): d.text((ox,oy+r*fs),line,font=fa,fill=ART)
ids=["pearl","klimt","napoleon","monalisa"]
tw=(cw-60)//4
for i,pid in enumerate(ids):
    tx=cx+20+i*tw
    thumb(pid,tx,cy+78,tw-16,150)
    d.text((tx,cy+238),TITLES[pid],font=kor(15),fill=(207,200,182))
    d.text((tx,cy+260),"render_"+pid+"()",font=mono(12),fill=DIM)

# ---- bottom: upgrade notes ----
nx,ny=40,792
d.text((nx,ny),"공통 시스템",font=kor(20),fill=(241,235,219))
notes=[
 "· 모든 섹션 = ‘프롬프트 한 줄 → 출력’ 패턴 (제목은 스크롤 진입 시 디코드)",
 "· 우측에 코드 거터형 섹션 인덱스(01–05) — 현재 섹션 하이라이트 + 클릭 이동",
 "· 호버 ‘숨은 코드’ 모티프를 섹션 키워드/숫자에도 확장",
 "· 지원 CTA: 실시간 카운트다운(초 단위) + 커서 깜빡이는 버튼  > 지원하기_",
 "· 모션은 1회·차분하게, prefers-reduced-motion 존중 · 태블릿(700–1100) 1순위",
]
yy=ny+36
for t in notes: d.text((nx,yy),t,font=kor(16),fill=(190,184,168)); yy+=34

img.save("tools/concept.png"); print("wrote tools/concept.png")
