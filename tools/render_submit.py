"""mock of the friendlier 제출 방법 section."""
from PIL import Image, ImageDraw, ImageFont
F="C:/Windows/Fonts/"; MONO=F+"CascadiaCode.ttf"; KOR=F+"malgun.ttf"; KORB=F+"malgunbd.ttf"
BG=(5,6,7); PANEL=(10,13,14); BORD=(26,33,36); INK=(205,200,184); DIM=(120,128,122)
ACC=(220,213,195); HI=(236,228,210); SUB=(180,174,158)
W,H=1120,1020
img=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(img)
m=lambda s:ImageFont.truetype(MONO,s); k=lambda s:ImageFont.truetype(KOR,s); kb=lambda s:ImageFont.truetype(KORB,s)
def wrap(txt,font,maxw):
    out,cur="",""
    for ch in txt:
        if font.getlength(cur+ch)>maxw and cur: out+=cur+"\n"; cur=ch
        else: cur+=ch
    return out+cur

d.text((40,28),"art@artFORM:~$ cat submit.md",font=m(13),fill=DIM)
d.text((40,52),"제출 방법",font=kb(34),fill=HI)
d.text((40,104),"지원서 작성 → 작품 업로드 → 제출 완료. 딱 3단계면 됩니다.",font=k(16),fill=SUB)

# steps
sy=150; gap=16; w3=(W-80-2*gap)//3; h3=148
steps=[("1","지원서 작성","구글폼에 이름·연락처 등 기본 정보를 입력합니다."),
       ("2","작품 업로드","아래 규격에 맞춰 작품 파일과 제작 설명(코드·프롬프트)을 첨부합니다."),
       ("3","제출 완료","접수 확인 메일을 받으면 끝! 마감 전이면 다시 수정·제출할 수 있어요.")]
def icon(x,y,n):
    if n=="1": d.line([(x,y+13),(x+13,y)],fill=ACC,width=2); d.line([(x+10,y),(x+13,y),(x+13,y+3)],fill=ACC,width=2)
    elif n=="2": d.line([(x+7,y+14),(x+7,y)],fill=ACC,width=2); d.line([(x+2,y+5),(x+7,y),(x+12,y+5)],fill=ACC,width=2)
    else: d.line([(x,y+7),(x+5,y+13),(x+14,y)],fill=ACC,width=2)
for i,(n,t,desc) in enumerate(steps):
    x=40+i*(w3+gap)
    d.rounded_rectangle([x,sy,x+w3,sy+h3],12,fill=(8,11,12),outline=BORD)
    d.ellipse([x+20,sy+20,x+48,sy+48],outline=(42,58,54)); d.text((x+30,sy+25),n,font=m(13),fill=HI)
    icon(x+62,sy+24,n)
    d.text((x+84,sy+22),t,font=kb(16),fill=HI)
    yy=sy+56
    for ln in wrap(desc,k(13),w3-40).split("\n"): d.text((x+20,yy),ln,font=k(13),fill=SUB); yy+=22
    if i<2: d.text((x+w3+2,sy+h3//2-8),"→",font=m(16),fill=DIM)

# spec
y=sy+h3+34
d.text((40,y),"// 제출 규격",font=m(13),fill=DIM); y+=24
rows=[("파일 형식","PNG · JPG · MP4 · GIF"),("용량","파일당 50MB 이하"),
      ("해상도","1920 × 1080 이상 권장"),("제출 수","1인 1~3점"),
      ("필수 포함","작품 파일 + 제작 설명(사용한 코드·프롬프트·도구)")]
rh=46; d.rounded_rectangle([40,y,W-40,y+rh*len(rows)],12,outline=BORD)
for i,(kk,vv) in enumerate(rows):
    ry=y+i*rh
    if i: d.line([(40,ry),(W-40,ry)],fill=(20,26,28))
    d.text((60,ry+15),kk,font=m(14),fill=DIM); d.text((190,ry+14),vv,font=k(15),fill=(207,200,182))
y+=rh*len(rows)+34

# checklist
d.text((40,y),"// 제출 전 체크리스트",font=m(13),fill=DIM); y+=26
for it in ["파일 형식과 용량이 규격에 맞나요?","제작 설명(코드·프롬프트)을 함께 넣었나요?","본인이 직접 만든 창작물인가요? (표절·도용 불가)"]:
    d.text((40,y),"✓",font=m(14),fill=HI); d.text((66,y-1),it,font=k(15),fill=(207,200,182)); y+=30
y+=14

# terminal preview (small)
d.text((40,y),"// 제출 미리보기",font=m(13),fill=DIM); y+=24
d.rounded_rectangle([40,y,W-40,y+96],10,fill=(7,10,11),outline=BORD)
def segs(x,yy,parts):
    for t,c,f in parts: d.text((x,yy),t,font=f,fill=c); x+=f.getlength(t)
fm=m(13)
segs(60,y+16,[("art@artFORM",INK,fm),(":",INK,fm),("~",DIM,fm),("$",INK,fm),(" ./apply --file submission.zip",INK,fm)])
segs(60,y+42,[("  › uploading ",DIM,fm),("[▰▰▰▰▰▰▰▰▰▰] 100%",ACC,fm)])
segs(60,y+66,[("  ✓ submitted.",HI,fm),("  ticket = ",INK,fm),("KGAAC-2026-0421",ACC,fm)])
img.save("tools/preview_submit.png"); print("wrote tools/preview_submit.png")
