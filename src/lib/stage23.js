/* 23 GRAMS — homepage engine. window.Stage23.mount(stageEl, {mode, loopSeconds, healSeconds, debug})
Swap assets in CHARS: video = transparent walk-cycle (webm/hevc), texture = leather image (future). */
const W = 1280, H = 720, N = 5, BASE_H = 432, BASE_W = 96;
const LINE = 0.5;
const UP = 0.5;
const CHARS = [
  { id: '01', href: '/album', body: '#780000', video: null, leather: { type: 0, color: [.03, .03, .034], gloss: 1.0, bump: 30 } },
  { id: '02', href: '/project', body: '#939100', video: null, leather: { type: 1, color: [.27, .035, .04], gloss: .35, bump: 2.5 } },
  { id: '03', href: '/location', noFlood: true, body: '#009552', video: null, leather: { type: 2, color: [.13, .085, .06], gloss: .5, bump: 5 } },
  { id: '04', href: '/lookbook', body: '#00458a', video: null, leather: { type: 3, color: [.095, .1, .105], gloss: .6, bump: 4 } },
  { id: '05', href: '/archive', noFlood: true, body: '#8d008f', video: null, leather: { type: 4, color: [.024, .024, .027], gloss: .75, bump: 12 } },
];
const MIN_S = 0.1; // 왼쪽 끝 크기 (작을수록 멀어 보임)
const MAX_S = 1.8; // 오른쪽 끝 크기 (1.65를 넘으면 위아래가 살짝 잘림)
const PERSP = 1.2; // 원근 가속 정도 (0~1, 클수록 오른쪽에서 확 다가옴)

const MODES = { pigment: 0, tear: 1, peel: 2 };
// 페이지가 바뀌어도 마지막 마우스 위치를 기억
const lastPointer = { x: innerWidth / 2, y: innerHeight * 0.3 };
window.addEventListener('pointermove', e => { lastPointer.x = e.clientX; lastPointer.y = e.clientY; });

const VS = `#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const COMMON = `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
vec2 voro(vec2 p){vec2 i=floor(p),f=fract(p);float d1=8.,d2=8.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y);vec2 o=vec2(hash(i+g),hash(i+g+17.3));vec2 r=g+o-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return vec2(sqrt(d1),sqrt(d2));}
`;
const BAKE = `#version 300 es
precision highp float;uniform vec2 uRes,uOff;uniform int uType;uniform vec3 uColor;uniform vec4 uPanel;uniform float uSeed;out vec4 o;
${COMMON}
void main(){
vec2 q=(gl_FragCoord.xy-uOff)/uRes.y+uSeed;float h=0.,tone=0.;
if(uType==0){float w=fbm(q*1.6);h=.5+.5*sin((q.x*2.2+q.y*1.3+w*2.8)*3.1416);h=h*.9+noise(q*500.)*.015;tone=w*.3;}
else if(uType==1){vec2 v=voro(q*55.+fbm(q*20.)*.6);h=smoothstep(0.,.35,v.y-v.x)*(.85+.15*noise(q*300.));tone=fbm(q*5.)*.45-.1;}
else if(uType==2){vec2 w=vec2(fbm(q*3.),fbm(q*3.+5.));float r=1.-abs(2.*fbm(q*vec2(9.,4.)+w*2.)-1.);float r2=1.-abs(2.*noise(q*vec2(40.,18.)+w*6.)-1.);h=pow(r,2.)*.7+pow(r2,3.)*.3;tone=w.x*.5-.15;}
else if(uType==3){vec2 qq=q*vec2(14.,10.)+fbm(q*4.)*.8;vec2 v=voro(qq);float dome=1.-smoothstep(0.,.9,v.x);h=smoothstep(0.,.12,v.y-v.x)*(.55+.45*dome);tone=(hash(floor(qq))-.5)*.3;}
else {float w=fbm(q*vec2(2.,5.));h=pow(.5+.5*sin((q.y*16.+w*5.)*3.1416),1.6)+fbm(q*60.)*.08;tone=w*.3;}
o=vec4(uColor*(1.+tone),clamp(h,0.,1.));
}`;
const SIM = `#version 300 es
precision highp float;uniform sampler2D uPrev;uniform vec2 uRes,uA,uB;uniform float uPaint,uDecay,uIdx,uTime,uVel,uK;uniform int uMode;out vec4 o;
${COMMON}
float segd(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);return length(pa-ba*h);}
void main(){
vec2 px=gl_FragCoord.xy,uv=px/uRes,e=1./uRes;vec4 p=texture(uPrev,uv);float r=p.r,g=p.g;
if(uMode==0){vec2 of=(vec2(noise(px/40.+uTime*.3),noise(px/40.-uTime*.3+7.))-.5)*2.5*e;
float b=(texture(uPrev,uv+of+vec2(e.x,0)).r+texture(uPrev,uv+of-vec2(e.x,0)).r+texture(uPrev,uv+of+vec2(0,e.y)).r+texture(uPrev,uv+of-vec2(0,e.y)).r)*.25;
r=mix(r,b,.5);}
else if(uMode==2){float b=(texture(uPrev,uv+vec2(e.x,0)).r+texture(uPrev,uv-vec2(e.x,0)).r+texture(uPrev,uv+vec2(0,e.y)).r+texture(uPrev,uv-vec2(0,e.y)).r)*.25;r=mix(r,max(r,b),.15);}
if(uPaint>0.){float d=segd(px,uA,uB);float s=0.;
if(uMode==0){float R=(26.+min(uVel,60.)*.4)*uK;s=smoothstep(R,0.,d+(noise(px/(9.*uK))-.5)*14.*uK);r+=s*.4;}
else if(uMode==1){float R=(3.+min(uVel,60.)*.22)*uK;float dd=d+(noise(px/(5.*uK))-.5)*R*1.2;s=smoothstep(R+1.5,R-1.5,dd);r=max(r,s);}
else {float R=(46.+min(uVel,60.)*.3)*uK;s=smoothstep(R,R*.35,d);r=max(r,s);}
if(s>.05)g=uIdx/4.;}
r=min(max(r-uDecay,0.),1.1);o=vec4(r,g,0.,1.);
}`;
const DISP = `#version 300 es
precision highp float;uniform sampler2D uMask,uAtlas;uniform vec2 uRes,uMouse,uFloodC;uniform int uMode;uniform float uTime,uFlood,uFloodIdx;uniform float uGloss[5];uniform float uBump[5];uniform vec4 uArea,uPanel;out vec4 o;
${COMMON}
vec4 lt(vec2 uv,float idx){return texture(uAtlas,vec2(uv.x,(clamp(uv.y,.002,.998)+idx)/5.));}
vec3 leather(vec2 uv,float idx,vec2 px){
int ii=int(idx);vec4 c=lt(uv,idx);vec2 e=2./uRes;
float hx=lt(uv+vec2(e.x,0.),idx).a-lt(uv-vec2(e.x,0.),idx).a;float hy=lt(uv+vec2(0.,e.y),idx).a-lt(uv-vec2(0.,e.y),idx).a;
float b=uBump[ii];vec3 N=normalize(vec3(-hx*b,-hy*b,1.));vec3 L=normalize(vec3(uMouse-px,320.));vec3 Hh=normalize(L+vec3(0,0,1));float g=uGloss[ii];
float dif=max(dot(N,L),0.);float sp=pow(max(dot(N,Hh),0.),mix(14.,120.,g))*mix(.18,1.3,g);
float sb=smoothstep(.3,0.,abs(N.x*3.+(uv.x-.5)*1.4-.35))*g*g*.28;
return c.rgb*(.45+.8*dif)*(.55+.45*c.a)+vec3(sp+sb);
}
float mk(vec2 uv){return texture(uMask,uv).r;}
void main(){
vec2 px=gl_FragCoord.xy,uv=px/uRes,e=1./uRes;vec4 m=texture(uMask,uv);float f=m.r;float idx=floor(m.g*4.+.5);
float n=fbm(px/38.+vec2(uTime*.04,0.));float fl=0.;
if(uFlood>0.){
  float d=length(px-uFloodC);
  bool usePanel=uPanel.z>0.;
  float R=usePanel?length(abs(uFloodC-uPanel.xy)+uPanel.zw)+120.:length(uRes)*1.15;
  float k=uFlood*R-d+(fbm(px/70.+uTime*.15)-.5)*220.;
  float inP=1.;
  if(usePanel){vec2 pd=abs(px-uPanel.xy)-uPanel.zw;inP=step(max(pd.x,pd.y),0.);}
  fl=smoothstep(0.,6.,k)*inP;
  if(k>-40.&&inP>0.)idx=uFloodIdx;
}
float a=0.,wa=0.,shade=1.;vec3 w=vec3(1.),add=vec3(0.);
if(uMode==0){
float v=f+(n-.5)*.35;a=smoothstep(.30,.345,v);
float gx=mk(uv+vec2(e.x*2.,0.))-mk(uv-vec2(e.x*2.,0.));float gy=mk(uv+vec2(0.,e.y*2.))-mk(uv-vec2(0.,e.y*2.));
vec3 Nw=normalize(vec3(-gx*6.,-gy*6.,1.));vec3 L=normalize(vec3(uMouse-px,300.));vec3 Hh=normalize(L+vec3(0,0,1));
float wet=pow(max(dot(Nw,Hh),0.),70.)*.9;float ring=a*(1.-smoothstep(.345,.5,v));
shade=1.-ring*.5;add=vec3(wet*a*.8);w=vec3(.80,.79,.78);wa=smoothstep(.16,.30,v)*(1.-a)*.22;
} else if(uMode==1){
float j=fbm(px/6.),j2=noise(px/2.);float v=f+(j-.5)*.55+(n-.5)*.2;a=smoothstep(.48,.52,v);
vec2 so=vec2(-5.,5.);float v2=mk(uv+so*e)+(fbm((px+so)/6.)-.5)*.55+(n-.5)*.2;shade=1.-(1.-smoothstep(.48,.52,v2))*.65;
float band=smoothstep(.34,.48,v)*(1.-a);float fib=band*step(.62,j2)*smoothstep(.2,.9,band);
w=mix(vec3(.86,.855,.85),vec3(1.),fib);wa=band*.35+fib*.6;
} else {
float v=f+(n-.5)*.16;a=smoothstep(.56,.585,v);float flap=smoothstep(.30,.33,v)*(1.-a);
float t=clamp((v-.30)/.26,0.,1.);vec3 fc=mix(vec3(.955,.952,.945),vec3(.80,.795,.785),pow(t,1.5))+exp(-pow((t-.18)/.07,2.))*.05;
float drop=smoothstep(.12,.30,v)*(1.-flap)*(1.-a);w=flap>.01?fc:vec3(.6,.595,.59);wa=max(flap,drop*.18);
shade=mix(.25,1.,smoothstep(.585,.85,v));
}
vec2 ad=abs(px-uArea.xy)-uArea.zw;float clipv=-max(ad.x,ad.y)+(fbm(px/45.)-.5)*28.-6.;float clip=smoothstep(0.,4.,clipv);a*=clip;wa*=clip;add*=clip;
if(fl>0.){a=max(a,fl);shade=mix(shade,1.,fl);wa*=(1.-fl);add*=(1.-fl);}
vec3 L=a>.001?leather(uv,idx,px)*shade+add:vec3(0.);
o=vec4(L*a+w*wa*(1.-a),a+wa*(1.-a));
}`;

function mount(root, opts) {
opts = Object.assign({ mode: 'pigment', loopSeconds: 15, healSeconds: 2.5, 
    debug: false, paused: false, getPanel: null }, opts);
const mode = MODES[opts.mode] ?? 0;
const zoneEl = root.querySelector('[data-zone]');
const made = [];
const mk = (tag, css, parent) => { const e = document.createElement(tag); e.style.cssText = css; (parent || root).appendChild(e); if (!parent) made.push(e); return e; };

const zoneGlow = zoneEl ? mk('div', 'position:absolute;inset:0;background:transparent;opacity:0;pointer-events:none', zoneEl) : null;
const canvas = mk('canvas', 'position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none');
canvas.width = W; canvas.height = H;
const figLayer = mk('div', 'position:absolute;inset:0;z-index:2;pointer-events:none;transition:opacity .6s;filter:drop-shadow(0 0 .8px rgba(255,255,255,.6))');
const dbgLayer = mk('div', 'position:absolute;inset:0;z-index:4;pointer-events:none;display:none');
const page = mk('div', "position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;justify-content:space-between;padding:28px 32px;color:#f2efea;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;opacity:0;pointer-events:none;transition:opacity .7s");
page.innerHTML = `<div style="display:flex;justify-content:space-between;font-weight:500;font-size:13px;letter-spacing:.18em"><span>23 GRAMS</span><span data-p-id></span></div>
<div data-p-big style="font-weight:300;font-size:260px;line-height:.8;letter-spacing:-.05em"></div>
<div style="display:flex;justify-content:space-between;align-items:flex-end;font:11px/1.4 ui-monospace,Menlo,monospace;letter-spacing:.08em"><button data-p-back style="all:unset;cursor:pointer;color:#f2efea;padding:10px 0">← RETURN</button><span data-p-href style="opacity:.7"></span></div>`;
const pId = page.querySelector('[data-p-id]'), pBig = page.querySelector('[data-p-big]'), pHref = page.querySelector('[data-p-href]');

const figs = CHARS.map((c, i) => {
    const el = mk('div', `position:absolute;left:0;top:0;width:${BASE_W}px;height:${BASE_H}px;transform-origin:50% 100%;will-change:transform,opacity`, figLayer);
    const f = { c, i, el, lag: 0, locked: false, p: 0, x: 0, y: 0, s: 1, legs: null, inner: null };
    if (c.video) {
    const v = document.createElement('video'); Object.assign(v, { src: c.video, muted: true, loop: true, autoplay: true, playsInline: true });
    v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%'; el.appendChild(v);
    } else {
    const inner = mk('div', 'position:absolute;inset:0', el);
    mk('div', `position:absolute;left:28px;top:0;width:40px;height:40px;border-radius:50%;background:${c.body}`, inner);
    const torso = mk('div', `position:absolute;left:0;top:46px;width:96px;height:236px;border-radius:36px 36px 10px 10px;background:${c.body};display:flex;align-items:center;justify-content:center`, inner);
    torso.innerHTML = `<span style="writing-mode:vertical-rl;font:9px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;color:rgba(255,255,255,.32)">23—${c.id} · walk_${c.id}.webm</span>`;
    const l1 = mk('div', `position:absolute;left:13px;top:272px;width:32px;height:160px;border-radius:12px;background:${c.body};transform-origin:50% 0`, inner);
    const l2 = mk('div', `position:absolute;left:51px;top:272px;width:32px;height:160px;border-radius:12px;background:${c.body};transform-origin:50% 0`, inner);
    f.inner = inner; f.legs = [l1, l2];
    }
    f.dbgBox = mk('div', 'position:absolute;border:1px dashed rgba(200,0,0,.6)', dbgLayer);
    f.dbgArea = mk('div', 'position:absolute;border:1px dashed rgba(0,90,200,.6);border-radius:50%', dbgLayer);
    return f;
});

// ---- WebGL
const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
let G = null;
if (gl) {
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
    const prog = fs => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); const u = {}; return { p, u: n => u[n] ?? (u[n] = gl.getUniformLocation(p, n)) }; };
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const flt = !!gl.getExtension('EXT_color_buffer_float');
    const tex = (w, h, f) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (f) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return { t, fb }; };
    const atlas = tex(W, H * N, false);
    const bake = prog(BAKE); gl.useProgram(bake.p); gl.bindFramebuffer(gl.FRAMEBUFFER, atlas.fb);
    CHARS.forEach((c, i) => { gl.viewport(0, i * H, W, H); gl.uniform2f(bake.u('uRes'), W, H); gl.uniform2f(bake.u('uOff'), 0, i * H);
    gl.uniform1i(bake.u('uType'), c.leather.type); gl.uniform3fv(bake.u('uColor'), c.leather.color); gl.uniform1f(bake.u('uSeed'), i * 3.7); gl.drawArrays(gl.TRIANGLES, 0, 3); });
    G = { sim: prog(SIM), disp: prog(DISP), atlas, m: [tex(W, H, flt), tex(W, H, flt)], cur: 0 };
} else console.warn('Stage23: WebGL2 unavailable — reveal disabled');

// ---- state
const S = { base: 0.9, /* p = .9,.7,.5,.3,.1 → all five on screen at load */ mouse: { x: -999, y: -999, in: false }, last: null, locked: null, activeUntil: 0, cleared: true,
    flood: 0, floodTarget: 0, floodC: [0, 0], floodIdx: 0, pageOpen: false, glow: 0, t: 0 };
const toStage = e => { const r = root.getBoundingClientRect(), k = r.width / W; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / (r.height / H) }; };
const toStageRect = v => {
  const r = root.getBoundingClientRect(), kx = r.width / W, ky = r.height / H;
  return { cx: (v.left + v.width / 2 - r.left) / kx, cy: (v.top + v.height / 2 - r.top) / ky,
           hw: v.width / 2 / kx, hh: v.height / 2 / ky };
};
const onMove = e => { const p = toStage(e); S.mouse.x = p.x; S.mouse.y = p.y; S.mouse.in = true; };
const onLeave = () => { S.mouse.in = false; };
const onClick = e => {
    if (e.target.closest('[data-p-back]')) { S.floodTarget = 0; S.pageOpen = false; page.style.opacity = 0; page.style.pointerEvents = 'none'; return; }
    if (S.locked && S.flood === 0 && S.floodTarget === 0) {
        const f = S.locked; S.selected = f; S.floodC = [S.mouse.x, H - S.mouse.y]; S.floodIdx = f.i; S.floodTarget = 1;
        S.panel = opts.getPanel ? toStageRect(opts.getPanel()) : null;  
        pId.textContent = '23—' + f.c.id; pBig.textContent = f.c.id; pHref.textContent = f.c.href + '  ·  PAGE IN DEVELOPMENT';
        unlock();
    }
};
root.addEventListener('mousemove', onMove); root.addEventListener('mouseleave', onLeave); root.addEventListener('click', onClick);
const unlock = () => { if (S.locked) { S.locked.locked = false; S.locked = null; S.last = null; S.light = null; root.style.cursor = ''; } };
const closePage = () => {
  S.floodTarget = 0; S.pageOpen = false;
  page.style.opacity = 0; page.style.pointerEvents = 'none';
};
let first = true;

const place = f => {
    const p = f.p, z = 2.2 + (0.9 - 2.2) * p, s = 1 / z;
    const pe = (s - 1 / 2.2) / (1 / 0.9 - 1 / 2.2);
    const e = (1 - PERSP) * p + PERSP * pe;
    f.e = e; f.x = -14 + (W + 76) * e; f.s = MIN_S + (MAX_S - MIN_S) * e;
    f.y = LINE * H + BASE_H * f.s * UP;
};
const inBox = (f, m, pad) => m.x > f.x - BASE_W / 2 * f.s - pad && m.x < f.x + BASE_W / 2 * f.s + pad && m.y > f.y - BASE_H * f.s - pad && m.y < f.y;
const area = f => ({ cx: f.x, cy: f.y - BASE_H / 2 * f.s, rx: BASE_W / 2 * f.s * 2.6 + 40, ry: BASE_H / 2 * f.s * 1.15 });
// input area (small, around target) -> effect space (full viewport)
const mapIn = m => ({ x: m.x, y: m.y }); // effect stays inside the input area (clipped in shader)
const inAreaA = (a, m) => Math.abs(m.x - a.cx) < a.rx && Math.abs(m.y - a.cy) < a.ry;
const zoneArea = () => { const l = zoneEl ? zoneEl.offsetLeft : W * .37, t = zoneEl ? zoneEl.offsetTop : H * .08, w = zoneEl ? zoneEl.offsetWidth : W * .26, h = zoneEl ? zoneEl.offsetHeight : H * .84; return { cx: l + w / 2, cy: t + h / 2, rx: w / 2, ry: h / 2 }; };
const inArea = (f, m) => { const a = area(f); const dx = (m.x - a.cx) / a.rx, dy = (m.y - a.cy) / a.ry; return dx * dx + dy * dy < 1; };

let raf, prev = performance.now();
const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now; S.t += dt;
    const L = opts.loopSeconds, rate = dt / L;
    if (!S.locked) S.base = (S.base + rate) % 1; // spatial freeze is global
    const zl = zoneEl ? zoneEl.offsetLeft : W * .37, zr = zoneEl ? zl + zoneEl.offsetWidth : W * .63;
    let anyIn = false;
    for (const f of figs) {
    f.p = ((S.base - f.i / N) % 1 + 2) % 1; place(f); f.inZone = f.x > zl && f.x < zr; anyIn = anyIn || f.inZone;
    }
    // interaction
    const busy = S.flood > 0 || S.floodTarget > 0;
    if (S.locked && (!S.mouse.in || !inAreaA(S.area, S.mouse) || busy)) unlock();
    if (!S.locked && S.mouse.in && !busy) {
    let best = null; for (const f of figs) if (f.inZone && inBox(f, S.mouse, 10) && (!best || f.p > best.p)) best = f;
    if (best) { best.locked = true; S.locked = best; S.area = zoneArea(); /* human = trigger; zone = active area */ S.last = mapIn(S.mouse); root.style.cursor = 'crosshair'; }
    }
    // figures
    for (const f of figs) {
    /*const ph = S.t * 5.6 + f.i * 1.3;*/
    f.el.style.transform = `translate(${f.x - BASE_W / 2}px,${f.y - BASE_H}px) scale(${f.s})`;
    f.el.style.zIndex = Math.floor(f.p * 1000); 
    /*if (f.inner) { f.inner.style.transform = `translateY(${-Math.abs(Math.sin(ph)) * 7}px)`; 
    f.legs[0].style.transform = `rotate(${Math.sin(ph) * 7}deg)`; 
    f.legs[1].style.transform = `rotate(${-Math.sin(ph) * 7}deg)`; }*/
    if (opts.debug) { const a = area(f);
        Object.assign(f.dbgBox.style, { left: f.x - BASE_W / 2 * f.s + 'px', top: f.y - BASE_H * f.s + 'px', width: BASE_W * f.s + 'px', height: BASE_H * f.s + 'px', opacity: f.inZone ? 1 : .25 });
        Object.assign(f.dbgArea.style, { left: a.cx - a.rx + 'px', top: a.cy - a.ry + 'px', width: a.rx * 2 + 'px', height: a.ry * 2 + 'px', opacity: f.locked ? 1 : f.inZone ? .5 : 0 }); }
    }
    dbgLayer.style.display = opts.debug ? 'block' : 'none';
    S.glow += ((anyIn ? 1 : 0) + (S.locked ? 0.8 : 0) - S.glow) * Math.min(1, dt * 3);
    if (zoneGlow) zoneGlow.style.opacity = S.glow.toFixed(3);
    // flood
    if (S.floodTarget === 1 && !S.pageOpen && S.selected?.c?.noFlood) {
      S.floodTarget = 0;
      S.flood = 0;
      S.pageOpen = true;
      if (opts.onSelect) opts.onSelect(S.selected.c);
    }

    if (S.flood !== S.floodTarget) {
    S.flood = S.floodTarget > S.flood ? Math.min(1, S.flood + dt / 1.5) : Math.max(0, S.flood - dt / 0.4);
    if (S.flood === 1 && !S.pageOpen) { S.pageOpen = true;
        if (opts.onSelect) opts.onSelect(S.selected.c);
        else { page.style.opacity = 1; page.style.pointerEvents = 'auto'; }
    }
    }
    const closing = S.floodTarget < S.flood;
    const fe = closing
    ? S.flood * S.flood
    : (S.flood < .5 ? 4 * S.flood ** 3 : 1 - Math.pow(-2 * S.flood + 2, 3) / 2); 
    figLayer.style.opacity = (S.pageOpen && !S.panel) ? '0' : '1';
    if (!G) return;

    // gl
    let paint = 0, A = [0, 0], B = [0, 0], vel = 0;
    if (S.locked && S.last) {
    const q = mapIn(S.mouse); S.k = 1; S.light = q;
    const dx = q.x - S.last.x, dy = q.y - S.last.y; vel = Math.hypot(dx, dy);
    if (mode === 0 || vel > 0.3) { paint = 1; A = [S.last.x, H - S.last.y]; B = [q.x, H - q.y]; S.last = q; }
    }
    if (paint || S.flood > 0) S.activeUntil = S.t + opts.healSeconds * 1.8 + 1;
    if (S.t > S.activeUntil) { if (!S.cleared) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); S.cleared = true; } return; }
    S.cleared = false;
    const src = G.m[G.cur], dst = G.m[1 - G.cur];
    gl.useProgram(G.sim.p); gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t); gl.uniform1i(G.sim.u('uPrev'), 0);
    gl.uniform2f(G.sim.u('uRes'), W, H); gl.uniform2fv(G.sim.u('uA'), A); gl.uniform2fv(G.sim.u('uB'), B);
    gl.uniform1f(G.sim.u('uPaint'), paint); gl.uniform1f(G.sim.u('uDecay'), dt / opts.healSeconds); gl.uniform1f(G.sim.u('uIdx'), S.locked ? S.locked.i : 0);
    gl.uniform1f(G.sim.u('uTime'), S.t); gl.uniform1f(G.sim.u('uVel'), vel); gl.uniform1f(G.sim.u('uK'), S.k || 1); gl.uniform1i(G.sim.u('uMode'), mode);
    gl.drawArrays(gl.TRIANGLES, 0, 3); G.cur = 1 - G.cur;
    gl.useProgram(G.disp.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dst.t); gl.uniform1i(G.disp.u('uMask'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, G.atlas.t); gl.uniform1i(G.disp.u('uAtlas'), 1);
    gl.uniform2f(G.disp.u('uRes'), W, H); const lp = S.light || S.mouse; gl.uniform2f(G.disp.u('uMouse'), lp.x, H - lp.y); gl.uniform1i(G.disp.u('uMode'), mode);
    gl.uniform1f(G.disp.u('uTime'), S.t); gl.uniform1f(G.disp.u('uFlood'), fe); gl.uniform2fv(G.disp.u('uFloodC'), S.floodC); gl.uniform1f(G.disp.u('uFloodIdx'), S.floodIdx);
    const ar = S.area || { cx: -9999, cy: -9999, rx: 1, ry: 1 }; gl.uniform4f(G.disp.u('uArea'), ar.cx, H - ar.cy, ar.rx, ar.ry);
    const pr = S.panel;
    gl.uniform4f(G.disp.u('uPanel'), pr ? pr.cx : 0, pr ? H - pr.cy : 0, pr ? pr.hw : 0, pr ? pr.hh : 0);
    gl.uniform1fv(G.disp.u('uGloss'), CHARS.map(c => c.leather.gloss)); gl.uniform1fv(G.disp.u('uBump'), CHARS.map(c => c.leather.bump));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
};
raf = requestAnimationFrame(frame);

return {
  set(o) {
    const was = opts.paused;
    Object.assign(opts, o);
    if (!('paused' in o) || was === opts.paused) return;
    if (opts.paused) { unlock(); S.mouse.in = false; }
    else closePage();
  },
  destroy() { cancelAnimationFrame(raf); root.removeEventListener('mousemove', onMove); root.removeEventListener('mouseleave', onLeave); root.removeEventListener('click', onClick);
  made.forEach(e => e.remove()); zoneGlow && zoneGlow.remove(); gl && gl.getExtension('WEBGL_lose_context')?.loseContext(); },
};
}

function mountLeather(root, opts = {}) {
  const idx = opts.index ?? 0;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity .3s';
  root.appendChild(canvas);
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
  if (!gl) { root.style.background = CHARS[idx].body; return { destroy() { canvas.remove(); } }; }

  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
  const prog = fs => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); const u = {}; return { p, u: n => u[n] ?? (u[n] = gl.getUniformLocation(p, n)) }; };
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = (w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return { t, fb }; };
  const bake = prog(BAKE), disp = prog(DISP);
  const c = CHARS[idx];
  let w = 0, h = 0, k = 1, atlas = null, mask = null, raf = 0, queued = false;
  const mouse = { x: lastPointer.x, y: lastPointer.y };   // 홈에서의 마지막 마우스 위치로 시작

  const setup = () => {
    const r = root.getBoundingClientRect();
    const cw = Math.max(1, root.clientWidth), ch = Math.max(1, root.clientHeight);
    k = Math.max(innerWidth / W, innerHeight / H);
    w = Math.round(cw / k); h = Math.round(ch / k);
    const sx = (innerWidth / k - W) / 2, sy = (innerHeight / k - H) / 2;
    const ox = sx - r.left / k;
    const oy = sy - (innerHeight - r.bottom) / k;
    canvas.width = w; canvas.height = h;
    for (const o of [atlas, mask]) if (o) { gl.deleteTexture(o.t); gl.deleteFramebuffer(o.fb); }
    atlas = tex(w, h * N); mask = tex(w, h);
    gl.useProgram(bake.p); gl.bindFramebuffer(gl.FRAMEBUFFER, atlas.fb); gl.viewport(0, idx * h, w, h);
    gl.uniform2f(bake.u('uRes'), W, H);
    gl.uniform2f(bake.u('uOff'), ox, idx * h + oy);
    gl.uniform1i(bake.u('uType'), c.leather.type); gl.uniform3fv(bake.u('uColor'), c.leather.color); gl.uniform1f(bake.u('uSeed'), idx * 3.7);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const render = () => {
    queued = false;
    const r = root.getBoundingClientRect();
    gl.useProgram(disp.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mask.t); gl.uniform1i(disp.u('uMask'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atlas.t); gl.uniform1i(disp.u('uAtlas'), 1);
    gl.uniform2f(disp.u('uRes'), w, h);
    gl.uniform2f(disp.u('uMouse'), (mouse.x - r.left) / k, h - (mouse.y - r.top) / k);   // 무대 좌표로 환산
    gl.uniform1i(disp.u('uMode'), 0); gl.uniform1f(disp.u('uTime'), 0);
    gl.uniform1f(disp.u('uFlood'), 1); gl.uniform2f(disp.u('uFloodC'), w / 2, h / 2); gl.uniform1f(disp.u('uFloodIdx'), idx);
    gl.uniform4f(disp.u('uArea'), -9999, -9999, 1, 1);
    gl.uniform1fv(disp.u('uGloss'), CHARS.map(q => q.leather.gloss)); gl.uniform1fv(disp.u('uBump'), CHARS.map(q => q.leather.bump));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const draw = () => { if (!queued) { queued = true; raf = requestAnimationFrame(render); } };

  const onResize = () => { setup(); draw(); };
  window.addEventListener('resize', onResize);
  setup(); render();
  requestAnimationFrame(() => { canvas.style.opacity = 1; });

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      gl.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove();
    },
  };
}

export {mount, mountLeather, CHARS};