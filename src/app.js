/* =====================================================================
   2026 KGAAC — terminal hero (v8)
   · code typing and image fill share ONE rhythm (cells advance per char)
   · the image occasionally backspaces a written patch and rewrites it
   · hero title: each glyph scrambles through code/latin, then resolves
   · mouse: REPULSE — glyphs near the pointer are pushed away
   ===================================================================== */

/* Always (re)enter at the hero: don't let the browser restore the previous
   scroll position on refresh — otherwise the intro scroll-lock would strand
   the user mid-page instead of starting at the top. */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const CONFIG = {
  brand: "2026 · 제2회",
  title: "대한민국 AI 창조공모대전",
  deadline: "2026-11-29",          // 접수 마감 (D-day / 카운트다운)
  applyUrl: "#",                   // ← 구글폼(지원/AI 제작기록 첨부) 링크로 교체
  phone: "02-745-5092",
  org: "사단법인 한국창조미술협회",
  schedule: [                      // 일정 (start/end = 기간, date = 단일일)
    {start:"2026-11-25", end:"2026-11-29", label:"접수 (1차 예선)", note:"작품 이미지 온라인 제출"},
    {date:"2026-12-11",                     label:"1차 심사 결과",   note:"도록 · 캔버스 제작 안내"},
    {start:"2026-12-23", end:"2026-12-29", label:"수상작 전시",     note:"갤러리 라메르 2F · 2차 작품 심사"},
    {date:"2026-12-28",                     label:"시상식",          note:"라메르갤러리 2F · 오후 3시"},
  ],
  pool: "대상 200만원 외 · 상장 · 상품권 · 전시",
  prizes: [                        // 시상 (featured = 대상 강조 · award = 상장/상패 구분)
    {rank:"GRAND",   name:"대상",     amount:"상품권 200만원", award:"상패", count:"1명", featured:true, extra:"+ 개인 초대부스전"},
    {rank:"GOLD",    name:"최우수상", amount:"상품권 100만원", award:"상패", count:"6명"},
    {rank:"SILVER",  name:"우수상",   amount:"상품권 50만원",  award:"상장", count:"○명"},
    {rank:"SPECIAL", name:"특별상",   amount:"부상",          award:"상장", count:"○명"},
    {rank:"MERIT",   name:"장려상",   amount:"상품권 10만원",  award:"상장", count:"○명"},
    {rank:"SELECT",  name:"특선 · 입선", amount:"상장",        award:"",     count:"다수"},
  ],
  codeCps: 70, firstCps: 220, holdMs: 4600, firstHoldMs: 900, maxLines: 240, scatter: 0.30,
  bleed: 0.99, viewX: 57, viewY: 58,     // image size & position (from ADJUST)
  defaultMode: "color",
  typos: true, flicker: true, imgBackspace: true, speed: 1,
};

const $=(id)=>document.getElementById(id);
const elCode=$("code"), elGutter=$("gutter"), elCodePane=$("codepane"),
      elCanvas=$("art"), elToggle=$("modeToggle"),
      elHeroTag=$("heroTag"), elHeroTitle=$("heroTitle");
const ctx=elCanvas.getContext("2d");

const BG="#050607", MONO_COL="#ece4d2", HOT_COL="#fbf8ee";
const CURSOR='<span class="cursor"></span>';
const SCRAMBLE="ABCDEFGHKLMNPRSTUWXabcdefghijkmnoprstuvwxyz0123456789{}[]()<>/*;=+-_$#&%";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms*CONFIG.speed));
const now=()=>performance.now();
const rnd=(a)=>SCRAMBLE[Math.floor(Math.random()*SCRAMBLE.length)];
const esc=(s)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* ---------- syntax highlight (mono via CSS) ---------- */
const C_KW=/\b(int|char|const|static|void|return|if|else|for|while|struct|typedef|sizeof|unsigned|double|float)\b/g;
function highlightLine(line){
  let m=line.match(/^([\w.-]+@[\w.-]+):([~\w/.-]*)\$(.*)$/);
  if(m) return `<span class="t-prompt">${esc(m[1])}</span>:`+
               `<span class="t-path">${esc(m[2])}</span>`+
               `<span class="t-prompt">$</span><span class="t-cmd">${esc(m[3])}</span>`;
  let s=esc(line);
  s=s.replace(/(\/\/[^\n]*$)/g,'<span class="t-com">$1</span>');
  s=s.replace(/(\/\*[^\n]*?\*\/|\/\*.*$)/g,'<span class="t-com">$1</span>');
  s=s.replace(/(^\s*#\s*\w+)/g,'<span class="t-pre">$1</span>');
  s=s.replace(/(&quot;[^&]*?&quot;|&quot;[^"]*$)/g,'<span class="t-str">$1</span>');
  s=s.replace(/\b(\d+)\b/g,'<span class="t-num">$1</span>');
  s=s.replace(C_KW,'<span class="t-kw">$1</span>');
  s=s.replace(/\b(canvas|Plate|frame_t)\b/g,'<span class="t-type">$1</span>');
  s=s.replace(/\b(glyph|blit|load|render_\w+|paint|gallery_add|strlen|putchar)\b/g,
              '<span class="t-fn">$1</span>');
  return s;
}
const highlightCode=(b)=>b.split("\n").map(highlightLine).join("\n");

/* ---------- left pane: growing source ---------- */
let codeBuf="", lineOffset=0;
function renderCode(cursor=true){
  elCode.innerHTML=highlightCode(codeBuf)+(cursor?CURSOR:"");
  const n=codeBuf?codeBuf.split("\n").length:1;
  let g=""; for(let i=0;i<n;i++) g+=(lineOffset+i+1)+(i<n-1?"\n":"");
  elGutter.textContent=g; elCodePane.scrollTop=elCodePane.scrollHeight;
}
function charDelay(ch, base){
  if(ch==="\n") return base*(1.0+Math.random()*0.5);
  return base*(0.7+Math.random()*0.55);
}
function trimCode(max){
  const lines=codeBuf.split("\n");
  if(lines.length>max){ const cut=lines.length-max; lineOffset+=cut;
    codeBuf=lines.slice(cut).join("\n"); renderCode(); }
}

/* ---------- canvas painting ---------- */
let COLS=168, ROWS=92, CHAR_RATIO=0.6, FS=8, CELLW=5, CELLH=8, OX=0, OY=0;
let charGrids={}, colorGrids={}, ORDER=[], displayId=null;
let mode=localStorage.getItem("artmode")||CONFIG.defaultMode;
let glitching=false;
const view={scale:CONFIG.bleed, ox:CONFIG.viewX, oy:CONFIG.viewY};   // baked size/pos

function toCharGrid(art){
  const lines=art.split("\n"), g=[];
  for(let r=0;r<ROWS;r++){ const ln=lines[r]||""; const row=new Array(COLS);
    for(let c=0;c<COLS;c++) row[c]=ln[c]||" "; g.push(row); }
  return g;
}
function buildChars(list){ for(const p of list) charGrids[p.id]=toCharGrid(p.art); }
function loadColor(uri){
  return new Promise(res=>{
    const img=new Image(); let done=false; const fin=v=>{if(done)return;done=true;res(v);};
    img.onload=()=>{ try{
      const oc=document.createElement("canvas"); oc.width=COLS; oc.height=ROWS;
      const o=oc.getContext("2d"); o.drawImage(img,0,0,COLS,ROWS);
      const d=o.getImageData(0,0,COLS,ROWS).data, arr=new Array(COLS*ROWS);
      for(let i=0;i<COLS*ROWS;i++) arr[i]=`rgb(${d[i*4]},${d[i*4+1]},${d[i*4+2]})`;
      fin(arr);
    }catch(e){ fin(null); } };
    img.onerror=()=>fin(null); setTimeout(()=>fin(null),5000); img.src=uri;
  });
}
function preloadColors(list){
  // just cache colours in the background — do NOT repaint (that would pop the
  // whole image in before it has been typed). Colours apply on the next redraw.
  list.forEach(async p=>{ colorGrids[p.id]=p.color?await loadColor(p.color):null; });
}
function buildOrder(){
  const band=COLS*CONFIG.scatter, cells=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) cells.push([r,c,c+Math.random()*band]);
  cells.sort((a,b)=>a[2]-b[2]); ORDER=cells.map(x=>[x[0],x[1]]);
}
function colorAt(id,r,c){ return (mode==="mono"||!colorGrids[id])?MONO_COL:colorGrids[id][r*COLS+c]; }
function clearCell(r,c){ ctx.fillStyle=BG; ctx.fillRect(OX+c*CELLW,OY+r*CELLH,CELLW+0.8,CELLH+0.6); }
function drawCell(id,r,c){ const ch=charGrids[id][r][c]; clearCell(r,c);
  if(ch!==" "){ ctx.fillStyle=colorAt(id,r,c); ctx.fillText(ch,OX+c*CELLW,OY+r*CELLH); } }
function drawCellHot(id,r,c){ const ch=charGrids[id][r][c]; clearCell(r,c);
  if(ch!==" "){ ctx.fillStyle=HOT_COL; ctx.fillText(ch,OX+c*CELLW,OY+r*CELLH); } }
function redrawFull(id){
  ctx.fillStyle=BG; ctx.fillRect(0,0,elCanvas.width,elCanvas.height); repBox=null;
  if(!id||!charGrids[id]) return;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) drawCell(id,r,c);
}
function measureRatio(){ ctx.font='100px "Cascadia Code", ui-monospace, monospace';
  CHAR_RATIO=ctx.measureText("M").width/100; }
function fit(){
  const pane=$("artstage"), pw=pane.clientWidth, ph=pane.clientHeight;
  const narrow=pw<720;
  const baseFS = narrow
    ? Math.min(pw/(COLS*CHAR_RATIO), ph/ROWS)*0.99   // phone: CONTAIN, full width (painting is the main element)
    : Math.max(pw/(COLS*CHAR_RATIO), ph/ROWS);       // desktop: COVER — full bleed
  FS=Math.max(narrow?2.6:4, baseFS*(narrow?1:view.scale)); CELLW=FS*CHAR_RATIO; CELLH=FS;
  const gw=COLS*CELLW, gh=ROWS*CELLH, dpr=window.devicePixelRatio||1;
  elCanvas.width=Math.round(pw*dpr); elCanvas.height=Math.round(ph*dpr);
  elCanvas.style.width=pw+"px"; elCanvas.style.height=ph+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.font=`${FS}px "Cascadia Code", ui-monospace, monospace`; ctx.textBaseline="top";
  if(narrow){ OX=(pw-gw)/2; OY=(ph-gh)*0.10; }  // phone: near the top of the art row so it clears the title
  else { OX=(pw-gw)+view.ox; OY=0+view.oy; }      // desktop: right/top-aligned + baked offset
  redrawFull(displayId);
}

/* ---------- synced code + image typing ---------- */
async function typeFrame(p, snip, cps, onProg){
  const id=p.id; displayId=id; repBox=null;
  const total=ORDER.length; let idx=0, acc=0;
  const hot=[], HOTLEN=Math.max(140, Math.round(total*0.05));
  const base=1000/(cps||CONFIG.codeCps), per=total/Math.max(1,snip.length);
  for(let i=0;i<snip.length;i++){
    const ch=snip[i];
    if(CONFIG.typos && /[A-Za-z]/.test(ch) && Math.random()<0.012){     // code typo→fix
      codeBuf+="etaoinsrhld"[Math.floor(Math.random()*11)]; renderCode();
      await sleep(base*(2+Math.random()*2.5));
      codeBuf=codeBuf.slice(0,-1); renderCode(); await sleep(base*(1.2+Math.random()));
    }
    codeBuf+=ch; renderCode();
    if(CONFIG.imgBackspace && idx>500 && hot.length>40 && Math.random()<0.02){ // image backspace
      const seg=hot.slice(-(14+Math.floor(Math.random()*26)));
      for(const [r,c] of seg) clearCell(r,c);
      await sleep(base*3);
      for(const [r,c] of seg) drawCellHot(id,r,c);
    }
    acc+=per; let step=Math.floor(acc); acc-=step;            // advance image with code
    while(step-->0 && idx<total){ const [r,c]=ORDER[idx++]; drawCellHot(id,r,c); hot.push([r,c]); }
    while(hot.length>HOTLEN){ const [r,c]=hot.shift(); drawCell(id,r,c); }
    if(onProg) onProg((i+1)/snip.length);
    await sleep(charDelay(ch, base));
  }
  while(idx<total){ const [r,c]=ORDER[idx++]; drawCellHot(id,r,c); hot.push([r,c]); }
  while(hot.length){ const [r,c]=hot.shift(); drawCell(id,r,c); }
  redrawFull(id);
}
async function holdAlive(id, ms){
  const end=now()+ms*CONFIG.speed;
  while(now()<end){
    if(displayId!==id) return;
    if(glitching){ await sleep(150); continue; }
    const fl=[];
    if(CONFIG.flicker){ const k=2+Math.floor(Math.random()*3);
      for(let i=0;i<k;i++){ const [r,c]=ORDER[Math.floor(Math.random()*ORDER.length)];
        if(charGrids[id][r][c]!==" "){ drawCellHot(id,r,c); fl.push([r,c]); } } }
    await sleep(80+Math.random()*140);
    for(const [r,c] of fl) drawCell(id,r,c);
    await sleep(280+Math.random()*460);
  }
}

/* ---------- hover tooltip (code hidden in the image) + click glitch ---------- */
const elTip=$("tip");
let _tpend=null, _traf=0;
function rgbToHex(s){ const m=(s||"").match(/\d+/g);
  return m? "#"+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,"0")).join("") : "#000000"; }
function hueName(r,g,b){
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
  if(mx<42) return "shadow";
  if(mx-mn<24) return mx>180?"bone":(mx>96?"ash":"slate");
  if(r>=g&&r>=b) return g>112?"amber":"rust";
  if(g>=r&&g>=b) return b>112?"teal":"green";
  return r>112?"violet":"blue";
}
const SHAPES=["fragmented_light","soft_edge","quiet_shadow","warm_grain","still_air",
              "lit_contour","drifting_dust","held_breath","slow_fade","grain_of_time"];
const shapeFor=(r,c)=>SHAPES[Math.abs((r>>3)*73+(c>>3)*149)%SHAPES.length];
function tipFor(id,r,c){
  const ch=charGrids[id][r][c].replace("<","&lt;");
  const rgb=(colorGrids[id]&&colorGrids[id][r*COLS+c])||"rgb(236,228,210)";
  const m=rgb.match(/\d+/g).map(Number), hex=rgbToHex(rgb);
  const tone=(0.299*m[0]+0.587*m[1]+0.114*m[2])/255;
  const layer=String(1+Math.min(4,Math.floor(tone*5))).padStart(2,"0");
  return `<span class="k">pixel</span>[${r}][${c}] = "<span class="hex" style="color:${hex}">${hex}</span>";\n`+
         `<span class="k">glyph</span> = '<span class="v">${ch}</span>';  <span class="k">tone</span> = <span class="n">${tone.toFixed(2)}</span>;\n`+
         `<span class="k">layer</span> = <span class="n">${layer}</span>;\n`+
         `this.<span class="k">color</span> = memory.<span class="v">${hueName(...m)}</span>;\n`+
         `this.<span class="k">shape</span> = <span class="v">${shapeFor(r,c)}</span>;`;
}
function tipTick(){
  _traf=0; if(!_tpend) return;
  const [cx,cy]=_tpend;
  if(glitching||!displayId){ elTip.style.opacity="0"; return; }
  const rect=elCanvas.getBoundingClientRect();
  const c=Math.floor((cx-rect.left-OX)/CELLW), r=Math.floor((cy-rect.top-OY)/CELLH);
  if(r<0||r>=ROWS||c<0||c>=COLS||charGrids[displayId][r][c]===" "){ elTip.style.opacity="0"; return; }
  elTip.classList.remove("warn"); elTip.innerHTML=tipFor(displayId,r,c);
  let x=cx+16, y=cy+18; const tw=elTip.offsetWidth, th=elTip.offsetHeight;
  if(x+tw>innerWidth-8) x=cx-tw-16;
  if(y+th>innerHeight-8) y=cy-th-16;
  elTip.style.left=x+"px"; elTip.style.top=y+"px"; elTip.style.opacity="1";
}
/* ---------- source hover (box the word) + contest-text hover ---------- */
const elCodebox=$("codebox");
let _cw=6.6, _lh=16.5;
function measureCode(){
  const s=document.createElement("span");
  s.style.cssText="position:absolute;visibility:hidden;white-space:pre";
  s.style.font=getComputedStyle(elCode).font; s.textContent="M".repeat(50);
  document.body.appendChild(s); _cw=s.getBoundingClientRect().width/50||6.6; s.remove();
  _lh=parseFloat(getComputedStyle(elCode).lineHeight)||16.5;
}
function codeHover(e){            // box the \w word under the cursor (monospace → exact)
  const cr=elCode.getBoundingClientRect(), pr=elCodePane.getBoundingClientRect();
  const line=Math.floor((e.clientY-cr.top)/_lh), lines=codeBuf.split("\n");
  if(line<0||line>=lines.length){ elCodebox.style.opacity="0"; return; }
  const txt=lines[line], col=Math.floor((e.clientX-cr.left)/_cw);
  if(col<0||col>=txt.length||/\s/.test(txt[col])){ elCodebox.style.opacity="0"; return; }
  let s=col,en=col; const isw=ch=>/\w/.test(ch);
  if(isw(txt[col])){ while(s>0&&isw(txt[s-1]))s--; while(en<txt.length-1&&isw(txt[en+1]))en++; }
  const x=cr.left+s*_cw, y=cr.top+line*_lh, w=(en-s+1)*_cw;
  if(y<pr.top-1||y+_lh>pr.bottom+1){ elCodebox.style.opacity="0"; return; }
  elCodebox.style.left=(x-2)+"px"; elCodebox.style.top=(y-1)+"px";
  elCodebox.style.width=(w+4)+"px"; elCodebox.style.height=(_lh+2)+"px"; elCodebox.style.opacity="1";
}
let APPLY=null;                  // 신청(접수) 기간 상태 (setupSections에서 계산)
function placeTip(e){
  let x=e.clientX+16,y=e.clientY+18; const tw=elTip.offsetWidth,th=elTip.offsetHeight;
  if(x+tw>innerWidth-8)x=e.clientX-tw-16; if(y+th>innerHeight-8)y=e.clientY-th-16;
  elTip.style.left=x+"px"; elTip.style.top=y+"px";
}
function applyState(){            // now 기준 접수 전/중/후 판정
  const now=new Date();
  const r=(CONFIG.schedule&&CONFIG.schedule[0])||{};
  const openStr=r.start||CONFIG.applyOpen;
  const open=openStr?new Date(openStr+"T00:00:00"):null;
  const close=new Date(CONFIG.deadline+"T23:59:59");
  if(open && now<open){ const od=_fmt(openStr).slice(5);
    return {state:"before",
      msg:`아직 신청기간이 아닙니다\n<span class="sub">접수 시작 · ${od}</span>`,
      note:`아직 신청기간이 아닙니다 — ${od} 접수 시작`}; }
  if(now>close) return {state:"closed", msg:`접수가 마감되었습니다`, note:`접수가 마감되었습니다`};
  return {state:"open", msg:null, note:null};
}
function applyWarn(e){            // 비활성 지원 버튼 위 → 빨간 안내 툴팁
  if(!APPLY||!APPLY.msg) return false;
  const t=e.target.closest("a.apply"); if(!t||!t.classList.contains("disabled")) return false;
  elTip.classList.add("warn"); elTip.innerHTML=APPLY.msg; placeTip(e); elTip.style.opacity="1";
  return true;
}
function heroTip(e){              // contest text → its own "code"
  if(applyWarn(e)) return;
  elTip.classList.remove("warn");
  elTip.innerHTML=`<span class="k">node</span> = &lt;h1 lang="ko"&gt;\n`+
    `<span class="k">font</span>   = "<span class="v">Pretendard</span>";  <span class="k">weight</span> = <span class="n">800</span>;\n`+
    `<span class="k">chars</span>  = <span class="n">${[...CONFIG.title].length}</span>;\n`+
    `this.<span class="k">meaning</span> = <span class="v">open_call</span>;`;
  placeTip(e); elTip.style.opacity="1";
}
/* keep the "hidden code" hover alive on the lower sections too */
function bodyTipCode(el){
  const t=s=>esc((s||"").replace(/\s+/g," ").trim().slice(0,42));
  const q=(sel)=>el.querySelector(sel);
  if(el.matches(".prize-feat")||(el.matches(".card")&&el.closest(".prize-row")))
    return `<span class="k">prize</span> { <span class="k">name</span>:"<span class="v">${t(q(".name")?.textContent)}</span>", <span class="k">award</span>:"<span class="v">${t(q(".cnt")?.textContent)}</span>" }`;
  if(el.matches(".log .row"))
    return `<span class="k">phase</span> { <span class="k">when</span>:"<span class="v">${t(q(".date")?.textContent)}</span>" }`;
  if(el.matches(".th"))   return `<span class="k">theme</span> = "<span class="v">${t(q("b")?.textContent)}</span>";`;
  if(el.matches(".fld"))  return `<span class="k">field</span>[<span class="n">${t(q(".no")?.textContent)}</span>] = "<span class="v">${t(q("b")?.textContent)}</span>";`;
  if(el.matches(".steps3 li")) return `<span class="k">step</span> ${t(q(".num")?.textContent)} → "<span class="v">${t(q("b")?.textContent)}</span>"`;
  if(el.matches(".spec .srow")) return `<span class="k">${t(q(".sk")?.textContent)}</span> = "<span class="v">${t(q(".sv")?.textContent)}</span>";`;
  if(el.matches(".chip")) return `<span class="k">item</span> = "<span class="v">${t(el.textContent)}</span>";`;
  if(el.matches(".checklist li")) return `<span class="k">check</span>(<span class="v">${t(el.textContent)}</span>) → ok`;
  if(el.matches(".sec-title")) return `<span class="k">section</span> = "<span class="v">${t(el.textContent)}</span>";`;
  if(el.matches(".lead")) return `&lt;p <span class="k">lang</span>="<span class="v">ko</span>"&gt;`;
  return null;
}
function setupBodyTips(){
  const sel=".prize-feat,.prize-row .card,.log .row,.th,.fld,.steps3 li,.spec .srow,.chip,.checklist li,.sec-title,.lead";
  const host=document.querySelector("main"); if(!host) return;
  host.addEventListener("mousemove",e=>{
    if(applyWarn(e)) return;
    const el=e.target.closest(sel), code=el&&bodyTipCode(el);
    if(!code){ elTip.style.opacity="0"; return; }
    elTip.classList.remove("warn"); elTip.innerHTML=code;
    placeTip(e); elTip.style.opacity="1";
  });
  host.addEventListener("mouseleave",()=>{ elTip.style.opacity="0"; });
}
function addPointer(){
  measureCode(); addEventListener("resize", measureCode);
  elCanvas.addEventListener("mousemove", e=>{ _tpend=[e.clientX,e.clientY];
    if(!_traf) _traf=requestAnimationFrame(tipTick); });
  elCanvas.addEventListener("mouseleave", ()=>{ elTip.style.opacity="0"; });
  elCodePane.addEventListener("mousemove", codeHover);
  elCodePane.addEventListener("mouseleave", ()=>{ elCodebox.style.opacity="0"; });
  const hero=$("hero");
  hero.addEventListener("mousemove", heroTip);
  hero.addEventListener("mouseleave", ()=>{ elTip.style.opacity="0"; });
}

/* ---------- mode toggle ---------- */
function updateToggleUI(){ elToggle.querySelectorAll("span[data-mode]").forEach(s=>
  s.classList.toggle("active", s.dataset.mode===mode)); }
function setMode(m){ mode=m; localStorage.setItem("artmode",m); updateToggleUI(); redrawFull(displayId); }
elToggle.addEventListener("click",()=>setMode(mode==="color"?"mono":"color"));
elToggle.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setMode(mode==="color"?"mono":"color"); } });
addEventListener("keydown",e=>{ if(e.key==="m"||e.key==="M") setMode(mode==="color"?"mono":"color"); });

/* ---------- source + snippets (substantial blocks per cycle) ---------- */
const BASE_SRC=
`#include <stdio.h>
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

static char glyph(double v) {
  int n = (int)strlen(RAMP) - 1;
  return RAMP[(int)(clampd(v) * n)];
}

/* tone-map one sample: gamma + black floor */
static unsigned char tone(unsigned char v) {
  double n = pow(v / 255.0, 0.92);
  return (unsigned char)((n < 0.02 ? 0.0 : n) * 255);
}

/* stream a framebuffer to the gallery, row by row */
int blit(canvas c) {
  for (int y = 0; y < H; y++) {
    for (int x = 0; x < W; x++)
      putchar(glyph(tone(c.px[y][x]) / 255.0));
    putchar('\\n');
  }
  return 0;
}
canvas load(const char *path);   /* read .lum framebuffer */
`;
const NOTE={
  pearl:"single light source, a quiet turn of the head",
  klimt:"gold leaf, two figures folded into one",
  napoleon:"wind, a red cloak, a pointing hand",
  monalisa:"sfumato — edges dissolve into shadow",
};
function snippet(p,n){
  const nn=String(n).padStart(2,"0"), id=p.id, y=p.year.replace(/\D/g,"")||"0";
  const S=[
    ()=>`\n/* ${nn} · ${p.title} — ${p.artist} (${p.year}) */\n`+
        `int render_${id}(void) {\n`+
        `  canvas c = load("gallery/${id}.lum");\n`+
        `  fprintf(stderr, "rendering %s …\\n", "${p.title}");\n`+
        `  for (int y = 0; y < H; y++)\n`+
        `    for (int x = 0; x < W; x++)\n`+
        `      c.px[y][x] = tone(c.px[y][x]);\n`+
        `  return blit(c);\n}\n`,
    ()=>`\nart@artFORM:~$ cc -O2 render.c -o gallery\n`+
        `art@artFORM:~$ ./gallery --art ${id} --ramp calibrated\n`+
        `  · loaded   gallery/${id}.lum        168 x 92\n`+
        `  · contrast autocontrast + unsharp   done\n`+
        `  · map      luminance -> 77 glyphs   done\n`+
        `  · streamed 15456 cells              ok\n`,
    ()=>`\n/* ${nn} · register on the gallery wall */\n`+
        `static const plate_t ${id} = {\n`+
        `  .title  = "${p.title}",\n  .artist = "${p.artist}",\n  .year   = ${y},\n};\n`+
        `gallery_add(&wall, &${id}, render_${id});\n`,
    ()=>`\n/* ${NOTE[id]||"a study in light"} */\n`+
        `long scan_${id}(canvas c) {\n`+
        `  long ink = 0;\n`+
        `  for (int y = 0; y < H; y++)\n`+
        `    for (int x = 0; x < W; x++)\n`+
        `      if (c.px[y][x] > 24) ink++;\n`+
        `  fprintf(stderr, "  %ld lit cells\\n", ink);\n`+
        `  return ink;\n}\n`,
    ()=>`\n/* paint ${id}, then breathe */\n`+
        `frame_t f${n} = paint(${id});      // ${p.artist}\n`+
        `present(f${n});\n`+
        `usleep(4200 * 1000);\n`+
        `free_frame(f${n});\n`,
  ];
  return S[(n-1)%S.length]();
}

/* ---------- hero: each glyph scrambles (one char at a time) then settles ---------- */
async function decodeInto(el, text){
  el.textContent=""; let out="";
  for(const ch of text){
    if(ch===" "){ out+=" "; el.textContent=out; await sleep(24); continue; }
    const reps=3+Math.floor(Math.random()*4);
    for(let s=0;s<reps;s++){ el.textContent=out+rnd(); await sleep(26); }   // 한 글자씩
    out+=ch; el.textContent=out; await sleep(40);
  }
}
// typewriter: type text into el char-by-char. caret: "keep" | "drop" (default) | "none"
async function typeInto(el, text, cps, caret){
  el.textContent="";
  let car=null;
  if(caret!=="none"){ car=document.createElement("span"); car.className="cursor"; el.appendChild(car); }
  const base=Math.max(8, Math.round(1000/(cps||60)));
  for(const ch of text){
    if(car) car.insertAdjacentText("beforebegin", ch); else el.appendChild(document.createTextNode(ch));
    await sleep(ch===" " ? Math.round(base*0.5) : base);
  }
  if(car && caret!=="keep") car.remove();
  return car;
}
function heroMetaText(){
  const r=CONFIG.schedule[0];
  const range=r&&r.start?`${_fmt(r.start).slice(5)}–${_fmt(r.end).slice(5)}`:"";
  const dl=new Date(CONFIG.deadline+"T23:59:59");
  const days=Math.max(0,Math.ceil((dl-new Date())/86400000));
  return `AI 이미지 · 영상   ·   접수 ${range}   ·   D-${days}`;
}
// CTA "boot": a ▸ prompt blinks, then each button fades in and types its label
async function bootButtons(){
  const cta=$("heroCta"); if(!cta) return;
  const pb=cta.querySelector(".pb");
  const items=[...cta.querySelectorAll(".btn")].map(b=>{
    const lbl=b.querySelector(".lbl"), ic=b.querySelector(".ic"), r=b.getBoundingClientRect();
    b.style.width=Math.ceil(r.width)+"px";                           // lock final box (border-box) so
    b.style.height=Math.ceil(r.height)+"px";                         // clearing the label can't reflow the row
    if(lbl) lbl.textContent="";
    if(ic) ic.style.opacity="0";
    return {b, lbl, ic, full: lbl?(lbl.dataset.full||""):""};
  });
  if(pb) pb.classList.add("on");
  await sleep(150);
  for(const it of items){
    it.b.classList.add("on");
    await sleep(80);
    if(it.lbl) await typeInto(it.lbl, it.full, 55, "none");
    if(it.ic) it.ic.style.opacity="";
    it.b.style.width=""; it.b.style.height="";   // restore natural sizing (label is full again)
    await sleep(110);
  }
  if(pb) pb.classList.remove("on");
}
async function typeHero(){
  const h=$("hero");
  const REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches;
  document.querySelectorAll("#heroCta .btn .lbl").forEach(l=>{ if(!l.dataset.full) l.dataset.full=l.textContent; });

  if(REDUCE){                                          // motion-reduced: show everything at once
    elHeroTag.textContent=CONFIG.brand;
    elHeroTitle.innerHTML='<span id="ht">'+CONFIG.title+'</span>';
    const m=$("heroMeta"); if(m) m.textContent=heroMetaText();
    const pb=document.querySelector("#heroCta .pb"); if(pb) pb.remove();
    document.querySelectorAll("#heroCta .btn").forEach(b=>b.classList.add("on"));
    if(h) h.classList.add("show","done");
    return;
  }

  await decodeInto(elHeroTag, CONFIG.brand);
  await sleep(140);
  elHeroTitle.innerHTML='<span id="ht"></span><span class="hc"></span>';
  await decodeInto($("ht"), CONFIG.title);
  const hc=elHeroTitle.querySelector(".hc"); if(hc) hc.remove();        // hand the cursor down

  const org=$("heroOrg"); const orgText=org?org.textContent.trim():"";
  if(org) org.textContent="";                                          // clear before reveal (no flash)

  if(h) h.classList.add("show");                                       // containers fade in (still empty)

  const m=$("heroMeta"); if(m) await typeInto(m, heroMetaText(), 95, "keep");  // resting caret on the meta line
  await sleep(120);
  await bootButtons();
  if(org){ await sleep(80); await typeInto(org, orgText, 95, "drop"); }
  if(h) h.classList.add("done");
}

/* ---------- upgraded section content (data-driven) ---------- */
const _fmt=(s)=>s.replace(/-/g,".");                 // 2026-07-01 -> 2026.07.01
function renderGallery(){
  const el=$("galleryStrip"); if(!el) return;
  const list=window.PAINTINGS||[];
  el.innerHTML=list.map(p=>
    `<div class="thumb"><pre>${esc(p.art)}</pre>`+
    `<div class="cap">${esc(p.ko)}<span class="fn">render_${p.id}()</span></div></div>`).join("");
  fitGallery();
}
function fitGallery(){
  document.querySelectorAll(".thumb pre").forEach(pre=>{
    const w=pre.parentElement.clientWidth-20;
    const fs=Math.max(1.6, w/(COLS*0.6));
    pre.style.fontSize=fs+"px"; pre.style.lineHeight="1"; pre.style.height=(fs*ROWS)+"px";
  });
}
function renderSchedule(){
  const el=$("scheduleLog"); if(!el) return;
  const now=new Date();
  const ph=CONFIG.schedule.map(p=>{
    const s=new Date((p.start||p.date)+"T00:00:00"), e=new Date((p.end||p.date)+"T23:59:59");
    return {p,s,e,state: now>e?"done": now>=s?"active":"upcoming"};
  });
  const hasActive=ph.some(x=>x.state==="active");
  const firstUp=ph.findIndex(x=>x.state==="upcoming");
  el.innerHTML=ph.map((x,i)=>{
    const p=x.p;
    const dateStr= p.start? `${_fmt(p.start)} — ${_fmt(p.end).slice(5)}` : _fmt(p.date);
    let bar="", cls=x.state;
    if(x.state==="active" && p.end){
      const pct=Math.max(0,Math.min(100,(now-x.s)/(x.e-x.s)*100));
      const days=Math.max(0,Math.ceil((x.e-now)/86400000));
      bar=`<div class="pbar"><i style="width:${pct.toFixed(0)}%"></i></div><div class="dd">D-${days} · ${esc(p.label)} 중</div>`;
    } else if(!hasActive && i===firstUp){
      cls+=" soon";
      bar=`<div class="dd">곧 시작 · D-${Math.max(0,Math.ceil((x.s-now)/86400000))}</div>`;
    }
    return `<div class="row ${cls}"><span class="mark" aria-hidden="true"></span>`+
      `<span class="date">${dateStr}</span>`+
      `<span class="lab">${esc(p.label)}<span class="nt">${esc(p.note||"")}</span>${bar}</span></div>`;
  }).join("");
}
function renderPrizes(){
  const pool=$("poolLine");
  if(pool) pool.innerHTML=`시상 규모 &nbsp; <b>${esc(CONFIG.pool)}</b>`;
  const area=$("prizeArea"); if(!area) return;
  const f=CONFIG.prizes.find(p=>p.featured)||CONFIG.prizes[0];
  const rest=CONFIG.prizes.filter(p=>p!==f);
  const amt=(a)=>/^[\d,]+$/.test(a)?`reward = ${a};`:a;
  const star='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 17.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z"/></svg>';
  const sub=(p)=>[p.award,p.count].filter(Boolean).map(esc).join(" · ");
  area.innerHTML=
    `<div class="prize-feat"><div><div class="rank">${star}${esc(f.rank)}</div>`+
      `<div class="name">${esc(f.name)}</div><div class="extra">${esc(f.extra||"")}</div></div>`+
      `<div class="amt">${esc(amt(f.amount))}<span class="cnt">${sub(f)}</span></div></div>`+
    `<div class="prize-row">`+rest.map(p=>
      `<div class="card"><div class="rank">${esc(p.rank)}</div><div class="name">${esc(p.name)}</div>`+
      `<div class="amt">${esc(p.amount)}</div><div class="cnt">${sub(p)}</div></div>`).join("")+`</div>`;
}
function startCountdown(){
  const el=$("countdown"); if(!el) return;
  const dl=new Date(CONFIG.deadline+"T23:59:59"), p2=n=>String(n).padStart(2,"0");
  const tick=()=>{
    let ms=dl-new Date();
    if(ms<=0){ el.textContent="접수 마감"; return false; }
    const d=Math.floor(ms/864e5); ms-=d*864e5;
    const h=Math.floor(ms/36e5); ms-=h*36e5;
    const m=Math.floor(ms/6e4); const s=Math.floor((ms-m*6e4)/1e3);
    el.innerHTML=`${d}<span class="u">일</span>${p2(h)}<span class="u">:</span>${p2(m)}<span class="u">:</span>${p2(s)}`;
    return true;
  };
  if(tick()!==false) setInterval(tick,1000);
}
async function typeLabel(el){          // type a section's terminal command
  const cmd=el.dataset.cmd||el.textContent; el.textContent="";
  for(const ch of cmd){ el.textContent+=ch; await sleep(22); }
}
async function runSubmitTerm(){
  const body=$("termBody"); if(!body||body.dataset.done) return; body.dataset.done="1";
  const add=h=>body.insertAdjacentHTML("beforeend",h);
  add('<span class="g">art@artFORM</span>:<span class="cy">~</span><span class="g">$</span> <span id="tcmd"></span><span class="cur"></span>');
  const tc=$("tcmd");
  for(const ch of "./apply --file submission.zip"){ tc.textContent+=ch; await sleep(34); }
  const cur=body.querySelector(".cur"); if(cur) cur.remove();
  add("\n");
  for(const t of ["packaging submission.zip","validating format (PNG / MP4 / GIF)","checking size  (≤ 50MB)"]){
    await sleep(420);
    add(`  <span class="ar">›</span> ${t} <span class="dim">……………</span> <span class="ok">ok</span>\n`);
  }
  await sleep(360);
  add(`  <span class="ar">›</span> uploading <span id="ubar"></span> <span id="upct" class="n"></span>\n`);
  const ub=$("ubar"), up=$("upct"), N=14;
  for(let i=0;i<=N;i++){ ub.textContent="["+"▰".repeat(i)+"▱".repeat(N-i)+"]"; up.textContent=Math.round(i/N*100)+"%"; await sleep(72); }
  await sleep(320);
  const tk=String(1000+Math.floor(Math.random()*8999));
  add(`  <span class="ok">✓ submitted.</span>  ticket = <span class="n">KGAAC-2026-${tk}</span>\n`);
  add(`  <span class="ar">→</span> 아래 <b>지원서 작성</b>으로 접수를 완료하세요.<span class="cur"></span>`);
}
let railSpy=null;
function setupRail(){
  const secs=[["about","01","개요"],["schedule","02","일정"],
              ["prizes","03","시상"],["submit","04","제출"],["apply","05","지원"]];
  const rail=document.createElement("nav"); rail.id="rail"; rail.className="pre"; // hidden until built
  rail.innerHTML=secs.map(([id,n,t])=>
    `<a href="#${id}" data-id="${id}" data-n="${n}"><span class="t">${t}</span><span class="n"></span><span class="dot"></span></a>`).join("");
  document.body.appendChild(rail);
  const links=[...rail.querySelectorAll("a")];
  const line=()=>innerHeight*0.35;                 // "current" = section top above this line
  const spy=()=>{ if(rail.classList.contains("pre")) return; let cur=secs[0][0];
    for(const [id] of secs){ const e=document.getElementById(id);
      if(e && e.getBoundingClientRect().top<=line()) cur=id; }
    if(innerHeight+scrollY >= document.documentElement.scrollHeight-2) cur=secs[secs.length-1][0]; // at bottom → last
    links.forEach(a=>a.classList.toggle("active",a.dataset.id===cur));
  };
  railSpy=spy;
  addEventListener("scroll",spy,{passive:true});
  addEventListener("resize",spy,{passive:true});
}
// reveal once the first painting is built: each item types its number in, one by one
async function revealRail(){
  const rail=$("rail"); if(!rail) return;
  rail.classList.remove("pre");
  for(const a of rail.querySelectorAll("a")){
    a.classList.add("on");
    const num=a.querySelector(".n"), full=a.dataset.n||"";
    for(let i=0;i<full.length;i++){
      num.innerHTML=full.slice(0,i+1)+'<span class="car">_</span>';
      await sleep(55);
    }
    num.textContent=full;
    await sleep(90);
  }
  if(railSpy) railSpy();           // light up the section currently in view
}

/* ---------- one-page sections: D-day, sticky bar, scroll reveal ---------- */
function setupSections(){
  renderSchedule(); renderPrizes(); startCountdown(); setupRail(); setupBodyTips();
  const pad=n=>String(n).padStart(2,"0");
  const dl=new Date(CONFIG.deadline+"T23:59:59");
  if(!isNaN(dl)){
    const days=Math.ceil((dl-new Date())/86400000);
    const dval=days>1?("D-"+days):days===1?"D-1":days===0?"D-DAY":"접수 마감";
    const set=(id,t)=>{const e=$(id); if(e) e.textContent=t;};
    const wd="일월화수목금토"[dl.getDay()];
    set("ddayVal",dval); set("ddayVal2",dval);
    set("ddayDate",`${pad(dl.getMonth()+1)}.${pad(dl.getDate())}`);
    set("ddayDate2",`${dl.getFullYear()}.${pad(dl.getMonth()+1)}.${pad(dl.getDate())} (${wd})`);
  }
  // 신청(접수) 기간 상태 — 기간이 아니면 지원 폼 비활성화 + 안내
  APPLY = applyState();
  document.querySelectorAll("a.apply").forEach(a=>{
    if(APPLY.msg){                                   // 접수 전/후 → 비활성화
      a.classList.add("disabled"); a.setAttribute("aria-disabled","true");
      a.setAttribute("aria-label", (a.textContent||"지원").trim()+" — "+APPLY.note);
      a.removeAttribute("href"); a.removeAttribute("target");
      a.addEventListener("click", ev=>{ ev.preventDefault(); applyWarn(ev);   // 터치: 탭하면 빨간 안내가 잠깐 표시
        clearTimeout(a._wt); a._wt=setTimeout(()=>{ elTip.style.opacity="0"; elTip.classList.remove("warn"); }, 2600); });
      a.addEventListener("mousemove", e=>applyWarn(e));   // 데스크탑: 호버 안내
      a.addEventListener("mouseleave", ()=>{ elTip.style.opacity="0"; elTip.classList.remove("warn"); });
    } else {
      a.href=CONFIG.applyUrl;
      if(CONFIG.applyUrl==="#") a.removeAttribute("target");
    }
  });
  const an=$("applyNote");
  if(an && APPLY.note){ an.textContent=APPLY.note; an.classList.add("show"); }
  // sticky bar + scroll cue
  document.querySelectorAll(".mapblock").forEach(mb=>            // 터치: 첫 탭에 지도 활성(스크롤 트랩 방지)
    mb.addEventListener("click",()=>mb.classList.add("live"),{once:true}));
  const bar=$("bar"), cue=$("scrollcue");
  addEventListener("scroll",()=>{
    bar && bar.classList.toggle("show", scrollY>innerHeight*0.7);
    if(cue) cue.style.opacity = scrollY>120 ? "0" : "1";
  },{passive:true});
  // reveal + decode section titles on entry
  if(!("IntersectionObserver" in window)){
    document.querySelectorAll(".reveal").forEach(el=>el.classList.add("in")); return;
  }
  const io=new IntersectionObserver(es=>{
    for(const e of es){ if(!e.isIntersecting) continue;
      e.target.classList.add("in");
      if(e.target.classList.contains("typ")) typeLabel(e.target);
      if(e.target.classList.contains("dec")) decodeInto(e.target, e.target.dataset.text||e.target.textContent);
      io.unobserve(e.target);
    }
  },{threshold:0.18});
  document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
}

/* ---------- main ---------- */
async function main(){
  const list=window.PAINTINGS||[];
  if(list.length){
    ROWS=Math.max(...list.map(p=>p.art.split("\n").length));
    COLS=Math.max(...list.map(p=>Math.max(...p.art.split("\n").map(l=>l.length))));
  }
  buildChars(list); measureRatio(); buildOrder(); fit(); preloadColors(list);
  addEventListener("resize", fit); addPointer(); updateToggleUI(); setupSections();
  const REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches;
  if(!REDUCE) lockScroll();                 // lock scroll (mobile + desktop) until the 1st painting is built
  setTimeout(releaseIntro, 20000);          // hang-guard only; normal unlock fires when the build finishes (loadbar→100%)
  if(REDUCE) releaseIntro();                // reduced-motion: start unlocked
  redrawFull(null); await sleep(350);      // brief empty terminal
  typeHero();
  let count=0;
  for(let i=0; list.length; i++){
    const p=list[i%list.length];
    const snip=(count===0?BASE_SRC:"")+snippet(p,count+1); count++;
    if(i===0) await typeFrame(p, snip, CONFIG.firstCps, setLoad);   // fast first build + top bar
    else      await typeFrame(p, snip);
    if(i===0) releaseIntro();   // first coding done → unlock + reveal (guarded; may already be released)
    trimCode(CONFIG.maxLines);
    // 로딩이 길었던 첫 이미지는 짧게만 머문 뒤 곧장 다음 그림으로 한 번 전환
    await holdAlive(p.id, i===0 ? CONFIG.firstHoldMs : CONFIG.holdMs);
  }
}
const elLoad=$("loadbar");
function setLoad(f){ if(elLoad) elLoad.style.width=Math.min(100,Math.round(f*100))+"%"; }
function finishLoad(){ if(!elLoad) return; elLoad.style.width="100%";
  setTimeout(()=>{ elLoad.style.opacity="0"; }, 260); }
function lockScroll(){ window.scrollTo(0,0); document.documentElement.classList.add("locked"); }
function unlockScroll(){ document.documentElement.classList.remove("locked");
  const c=$("scrollcue"); if(c) c.style.opacity="1"; }
let _released=false;
function releaseIntro(){ if(_released) return; _released=true; finishLoad(); unlockScroll(); revealRail(); }
document.addEventListener("DOMContentLoaded", main);
