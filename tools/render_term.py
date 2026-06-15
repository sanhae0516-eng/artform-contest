"""fake-terminal submit block — calmed palette, no apple bar."""
from PIL import Image, ImageDraw, ImageFont
F="C:/Windows/Fonts/"; MONO=F+"CascadiaCode.ttf"; KOR=F+"malgun.ttf"; KORB=F+"malgunbd.ttf"
BG=(5,6,7); PANEL=(7,10,11); BORD=(28,35,41)
INK=(205,200,184); DIM=(120,128,122); ACC=(220,213,195); HI=(236,228,210)
W,H=980,440
img=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(img)
m=lambda s:ImageFont.truetype(MONO,s); k=lambda s:ImageFont.truetype(KOR,s); kb=lambda s:ImageFont.truetype(KORB,s)
d.text((40,30),"제출 방법",font=kb(26),fill=HI)
d.text((150,40),"— 차분한 모노 팔레트 · 애플 창바 제거",font=m(13),fill=DIM)

bx,by,bw,bh=40,76,900,330
d.rounded_rectangle([bx,by,bx+bw,by+bh],10,fill=PANEL,outline=BORD)
def segs(x,y,parts):
    for t,c,f in parts: d.text((x,y),t,font=f,fill=c); x+=f.getlength(t)
fm=m(14); x0,y=bx+22,by+26; lh=40
segs(x0,y,[("art@artFORM",INK,fm),(":",INK,fm),("~",DIM,fm),("$",INK,fm),
           (" ./apply --file submission.zip",INK,fm)]); y+=lh
for t in ["packaging submission.zip","validating format (PNG / MP4 / GIF)","checking size  (≤ 50MB)"]:
    segs(x0,y,[("  › ",DIM,fm),(t+" ",INK,fm),("……… ",DIM,fm),("ok",HI,fm)]); y+=lh
segs(x0,y,[("  › ",DIM,fm),("uploading ",INK,fm),("[▰▰▰▰▰▰▰▰▰▰▰▰▰▰] ",ACC,fm),("100%",ACC,fm)]); y+=lh
segs(x0,y,[("  ✓ submitted.",HI,fm),("   ticket = ",INK,fm),("KGAAC-2026-0421",ACC,fm)]); y+=lh
segs(x0,y,[("  → ",DIM,fm)])
xx=x0+fm.getlength("  → "); d.text((xx,y-1),"아래 ",font=k(14),fill=INK); xx+=k(14).getlength("아래 ")
d.text((xx,y-1),"지원서 작성",font=kb(14),fill=ACC); xx+=kb(14).getlength("지원서 작성")
d.text((xx,y-1),"으로 접수를 완료하세요.",font=k(14),fill=INK)
img.save("tools/preview_term.png"); print("wrote tools/preview_term.png")
