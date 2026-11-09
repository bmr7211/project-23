import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const URL = '/models/bust.glb';
const HEIGHT = 3.2;      // 연기까지 포함한 전체 높이 (가운데 맞추기용)
const LEAN = 0.15;

// ===== 연기 (원래 모델 기준: 코끝 1.21 / 입 0.97 / 정수리 1.9) =====
const C2x = 0.02, C2z = -0.08; // 머리 중심축 (x, z)
const SMOKE_Y   = 1.18;  // 연기 시작 (콧대)
const DRIP      = 0.10;  // 결이 코 위로 흘러내리는 길이
const INFLATE   = 0.01;  // 피부에서 띄우는 거리 (깜빡이면 조금 키우기)
const STRETCH   = 1.2;   // 위로 솟는 정도
const KEEP_W    = 0.64;  // 위로 올라가도 유지할 폭
const SWAY      = 0.25;
const GLITCH    = 0.05;
const SPEED     = 0.5;
const CUT_Y     = 1.68;  // 꼭대기 끊김 (원래 모델 높이 기준)
const CUT_RANGE = 0.22;
const LINES = 180;

// ===== 물감 색 =====
const PAINT_SCALE = 2.2;  // 무늬 크기 (작을수록 큼직한 물감 덩어리)
const PAINT_SWIRL = 4.0;  // 휘감기는 정도
const PAINT_FLOW  = 0.35; // 위로 흘러가는 속도
const PAINT_GOLD  = 0.8;  // 주황·노랑 양
const PAINT_LINES = 9.0;  // 흰 선 개수
const VEIN_W      = 0.03;// 흰 선 굵기
const FACE_SWIRL  = 0.35; // 얼굴 쪽 휘감기는 정도
const FACE_SHADE_MIN = 0.45; // 얼굴 그늘진 쪽 밝기 (낮출수록 입체감 강함)
const STRANDS     = 130;  // 연기 결 개수 (늘리면 더 가늘어짐)
const STRAND_SHARP = 0.22; // 결 경계 또렷함 (작을수록 또렷)
const SMOKE_FINE  = 2.5;  // 연기 색 덩어리를 가로로 잘게 쪼개는 정도
const STRAND_WARP = 2;    // 결이 꾸불거리는 정도
const STRAND_AMT  = 0.5;  // 결 진하기 (0이면 결 없음)

const WARP  = 20;
const HEAD_RX   = 0.45; // 연기 기둥 가로 반지름 (모델 실측: 이마 폭 ±0.45)
const HEAD_RZ   = 0.58; // 연기 기둥 앞뒤 반지름 (모델 실측: 앞뒤 ±0.6)
const FLAT_FADE = 0.08; // 경계에서 매끈해지기까지 높이
const BEND_IN   = 0.6;  // 연기 시작점부터 휘는 힘이 다 차기까지 높이 (작을수록 바로 휨)
const BACK_H    = 0.15; // 눈 높이를 연기 안쪽에서 받쳐주는 구간 높이
const FLAT_TOP  = 1.55; // 이 높이부터는 원래 두피 모양으로 (눈썹·눈·귀는 이 아래에만 있음)

// ===== 얼굴 =====
const FACE_FADE = 0.3;   // 연기 아래로 결 무늬가 이어지는 길이
const FACE_MIX  = 0.85;

const f = (n) => n.toFixed(3);
const C2 = `vec2(${f(C2x)}, ${f(C2z)})`;

const NOISE = /* glsl */`
  float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p), u=fract(p); u=u*u*(3.-2.*u);
    return mix(mix(hs(i),hs(i+vec2(1,0)),u.x), mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),u.x), u.y); }
`;

const PATTERN = /* glsl */`
  ${NOISE}
  float warpAt(vec2 dir, float y, float t){
    return (n2(dir * 1.5 + vec2(y * 1.2 - t * 0.5, 0.0)) * 2.0 - 1.0)
         + 0.5 * (n2(dir * 3.5 + vec2(0.0, y * 2.5 - t * 0.3)) * 2.0 - 1.0);
  }
  float lineAt(vec2 dir, float y, float t, out float phase){
    float ang = atan(dir.y, dir.x);
    float warp = warpAt(dir, y, t);
    phase = ${f(LINES)} * ang + warp * ${f(WARP)};
    float dA = min(fwidth(ang), fwidth(atan(-dir.y, -dir.x)));
    float w = ${f(LINES)} * dA + ${f(WARP)} * fwidth(warp);
    float aa = clamp(1.5 / (w + 1e-4), 0.0, 1.0);
    return 0.5 + 0.5 * sin(phase) * aa;
  }
  // ---- 물감 마블링 (3D 노이즈라 머리 둘레에 이음매 없음) ----
  float h3(vec3 q){ return fract(sin(dot(q, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 p){
    vec3 i = floor(p), u = fract(p); u = u * u * (3.0 - 2.0 * u);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), u.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), u.x), u.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), u.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), u.x), u.y), u.z);
  }
  float fbm(vec3 p){
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 4; i++){ s += a * n3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    return s;
  }
  // amt: 휘감기는 정도 (연기 1.0, 얼굴은 작게)
  vec3 marble(vec2 dir, float y, float t, float amt){
    float hz = mix(1.0, ${f(SMOKE_FINE)}, smoothstep(0.6, 1.0, amt));   // 연기에선 색 덩어리를 가로로 잘게 → 가는 색 줄기
    vec3 p = vec3(dir.x * hz, y * 0.8 - t * ${f(PAINT_FLOW)}, dir.y * hz) * ${f(PAINT_SCALE)};
    vec3 q = vec3(fbm(p + vec3(0.0, t * 0.1, 0.0)), fbm(p + vec3(5.2, 1.3, 2.8)), fbm(p + vec3(2.1, 7.4, 4.6)));
    vec3 w = p + amt * ${f(PAINT_SWIRL)} * q;
    vec2 r = vec2(fbm(w + vec3(1.7, 9.2, 0.0) + t * 0.15), fbm(w + vec3(8.3, 2.8, 5.1)));
    float v = fbm(p + amt * ${f(PAINT_SWIRL)} * vec3(r, r.x));

    // 보라 → 마젠타 → 연분홍, 군데군데 주황·노랑
    vec3 col = mix(vec3(0.42, 0.08, 0.85), vec3(1.0, 0.18, 0.78), smoothstep(0.25, 0.5, v));
    col = mix(col, vec3(1.0, 0.62, 0.95), smoothstep(0.5, 0.72, v));
    col = mix(col, vec3(1.0, 0.72, 0.28), smoothstep(0.55, 0.75, q.y) * smoothstep(0.4, 0.62, v) * ${f(PAINT_GOLD)});

    // 물감 경계를 따라 흐르는 가는 흰 선
    float b = v * ${f(PAINT_LINES)};
    float fw = fwidth(b);
    float d = abs(fract(b) - 0.5);
    float vein = smoothstep(0.5 - ${f(VEIN_W)} - fw, 0.5 - ${f(VEIN_W)} + fw, d) * smoothstep(0.35, 0.6, r.x);
    return mix(col, vec3(1.0, 0.93, 1.0), vein * 0.85);
  }
  // 연기 결: 머리 둘레로 STRANDS개, 위로 가며 살짝 꾸불꾸불
  // 가는 결 한 겹 (n: 머리 둘레 결 개수, off: 겹마다 다르게)
  float strandLayer(vec2 dir, float y, float t, float n, float off){
    float ang = atan(dir.y, dir.x);
    float warp = warpAt(dir + off, y, t);
    float ph = n * ang + warp * ${f(STRAND_WARP)} + off;
    float dA = min(fwidth(ang), fwidth(atan(-dir.y, -dir.x)));
    float w = n * dA + ${f(STRAND_WARP)} * fwidth(warp);
    return 0.5 + 0.5 * sin(ph) * clamp(1.5 / (w + 1e-4), 0.0, 1.0);
  }
  // 가는 결 두 겹을 겹쳐서 한 가닥씩 또렷하게
  float strandAt(vec2 dir, float y, float t){
    float s = 0.6 * strandLayer(dir, y, t, ${f(STRANDS)}, 0.0)
            + 0.4 * strandLayer(dir, y, t, ${f(STRANDS * 0.47)}, 2.3);
    return smoothstep(${f(0.5 - STRAND_SHARP)}, ${f(0.5 + STRAND_SHARP)}, s);   // 결 사이 골을 진하게
  }
  // 얼굴·연기 공통 명암 (n: 화면 기준 법선)
  float faceShade(vec3 n){
    n = normalize(n);
    if (!gl_FrontFacing) n = -n;
    float diff = max(dot(n, normalize(vec3(0.3, 0.6, 0.8))), 0.0);
    return ${f(FACE_SHADE_MIN)} + (1.0 - ${f(FACE_SHADE_MIN)}) * diff;
  }
  // 얼굴·연기 공통 색. y는 둘 다 '원래 모델 높이'라서 경계에서 무늬가 그대로 이어짐
  vec3 paint(vec2 dir, float y, float t){
    float kS = smoothstep(${f(SMOKE_Y - 0.05)}, ${f(SMOKE_Y + 0.3)}, y);   // 0 얼굴 → 1 연기
    float amt = mix(${f(FACE_SWIRL)}, 1.0, kS);
    vec3 c;
    if (kS <= 0.0)      c = marble(dir, y, 0.0, amt);                       // 얼굴: 안 움직임
    else if (kS >= 1.0) c = marble(dir, y, t, amt);                         // 연기: 흐름
    else                c = mix(marble(dir, y, 0.0, amt), marble(dir, y, t, amt), kS);
    float st = strandAt(dir, y, t);
    c *= mix(1.0, 0.6 + 0.75 * st, kS * ${f(STRAND_AMT)});                  // 결 사이 골은 어둡게
    c = mix(c, vec3(1.0, 0.9, 1.0), pow(st, 6.0) * 0.3 * kS);               // 결 꼭대기엔 살짝 하이라이트
    return c;
  }
`;

// ---------- 연기: 머리 복사본을 변형 ----------
const smokeVert = /* glsl */`
  uniform float uTime;
  varying vec3 vOrig; varying vec3 vP; varying vec3 vN;
  ${NOISE}
  void main(){
    vN = normalMatrix * normal;   // 얼굴과 같은 명암을 주려고 원래 법선 전달
    vec3 p = position + normal * ${f(INFLATE)}; // 피부 바로 위
    float y0 = position.y;
    vOrig = position;

    // 연기 구역의 얼굴 굴곡(눈썹뼈·눈꺼풀·귀) 지우기
    vec2 relF = p.xz - ${C2};
    float rF = length(relF);
    vec2 dirF = relF / max(rF, 1e-4);
    float rEll = 1.0 / length(dirF / vec2(${f(HEAD_RX)}, ${f(HEAD_RZ)}));
    float kF = smoothstep(${f(SMOKE_Y)}, ${f(SMOKE_Y + FLAT_FADE)}, y0)
             * (1.0 - smoothstep(${f(FLAT_TOP - 0.05)}, ${f(FLAT_TOP + 0.05)}, y0));
    p.xz = ${C2} + dirF * mix(rF, rEll, kF);

    // 정수리가 좁아지지 않게 옆으로 벌려서 기둥처럼
    float hw = 0.46 * sqrt(max(1.0 - pow((y0 - 1.4) / 0.52, 2.0), 0.0));
    float widen = mix(1.0, ${f(KEEP_W)} / max(hw, 0.12), smoothstep(1.5, 1.8, y0));
    p.xz = ${C2} + (p.xz - ${C2}) * widen;

    // 위로 솟기 (콧대 근처는 거의 그대로, 위로 갈수록 크게)
    float h = max(y0 - ${f(SMOKE_Y)}, 0.0);
    p.y += h * h / 0.4 * ${f(STRETCH)};

    // 흐물거림 + 가로 글리치 (위로 갈수록 크게)
    float t = uTime * ${f(SPEED)};
    float k = smoothstep(${f(SMOKE_Y)}, 1.9, y0);
    // 연기 시작점부터 바로 휘게: 시작점에선 0, BEND_IN 높이에서 거의 다 차고 위로 갈수록 조금 더
    float amp = ${f(SWAY)} * smoothstep(0.0, ${f(BEND_IN)}, h) * (0.7 + 0.3 * k);
    p.x += amp * sin(p.y * 4.0 - t) + amp * 0.5 * sin(p.y * 9.0 - t * 1.7);
    p.z += amp * 0.5 * cos(p.y * 3.0 - t * 0.8);
    p.x += ${f(GLITCH)} * (n2(vec2(p.y * 30.0, t * 0.5)) - 0.5) * k;

    vP = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;

const smokeFrag = /* glsl */`
  uniform float uTime;
  varying vec3 vOrig; varying vec3 vP; varying vec3 vN;
  ${PATTERN}
  void main(){
    float t = uTime * ${f(SPEED)};
    vec2 dir = normalize(vOrig.xz - ${C2} + 1e-4);
    float h = vOrig.y - ${f(SMOKE_Y)};

    // 얼굴·몸 부분은 연기 없음, 경계는 결마다 다르게 흘러내림
    float phase;
    float line = lineAt(dir, vP.y, t, phase);
    if (h < -${f(DRIP)} * n2(vec2(phase * 0.12, 3.0))) discard;

    // 꼭대기: 결마다 다른 길이로 딱 끊김
    vec2 drift = vec2(uTime * 0.04);
    float strand = 0.7 * n2(dir * 6.0 + drift) + 0.3 * n2(dir * 25.0 + drift);
    if (vOrig.y > ${f(CUT_Y)} + strand * ${f(CUT_RANGE)}) discard;

    // 위쪽 결 갈라짐
    float warp = warpAt(dir, vP.y, t);
    if (h > 0.3 && n2(dir * 10.0 + vec2(0.0, warp * 0.5)) < smoothstep(0.3, 0.55, h) * 0.3) discard;

    // 연기 아래쪽(코·이마에 붙은 부분)은 얼굴과 똑같은 명암, 위로 갈수록 명암 없이
    float shadeS = mix(faceShade(vN), 1.0, smoothstep(${f(SMOKE_Y)}, ${f(SMOKE_Y + 0.3)}, vOrig.y));
    gl_FragColor = vec4(paint(dir, vOrig.y, t) * shadeS, 1.0);   // 원래 높이 기준 → 늘어난 만큼 무늬도 위로 길게 늘어나 결이 됨
  }`;

function Smoke({ geometry, uniforms }) {
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial vertexShader={smokeVert} fragmentShader={smokeFrag}
        uniforms={uniforms} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------- 얼굴 ----------
function makeFaceShader(uniforms) {
  return (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vModel;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vModel = position;
        // 연기 시작점 위 얼굴은 안쪽으로 오므려서 연기 속 받침으로만 씀 (절대 밖으로 안 튀어나옴)
        float kB = smoothstep(${f(SMOKE_Y)}, ${f(SMOKE_Y + BACK_H)}, position.y);
        transformed.xz = ${C2} + (transformed.xz - ${C2}) * (1.0 - 0.35 * kB);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; varying vec3 vModel;
        ${PATTERN}
        float gNear; vec3 gPaint;`)
      // 연기가 덮는 구역은 얼굴을 지워서 튀어나올 일이 없게
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (vModel.y > ${f(SMOKE_Y + BACK_H)}) discard;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float t = uTime * ${f(SPEED)};
          vec2 dir = normalize(vModel.xz - ${C2} + 1e-4);
          gNear = smoothstep(${f(SMOKE_Y - DRIP - FACE_FADE)}, ${f(SMOKE_Y - DRIP)}, vModel.y);
          gPaint = paint(dir, vModel.y, t);
          diffuseColor.rgb = gPaint * (1.0 - 0.7 * gNear);   // 연기에 가까울수록 조명 대신 자체 발광 → 연기와 같은 밝기
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
        totalEmissiveRadiance += gPaint * (0.1 + 0.9 * gNear) + vec3(1.0, 0.4, 0.9) * rim * 0.5 * (1.0 - gNear);`)
      // 마지막에 색을 직접 덮어쓰기: 조명 반사·톤매핑·색공간 변환을 다 건너뛰고 연기와 같은 방식으로 칠함
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        {
          gl_FragColor = vec4(gPaint * faceShade(vNormal), 1.0);   // 얼굴 전체에 명암 유지
        }`);
  };
}

export default function Bust({ size = 3 }) {
  const { nodes } = useGLTF(URL);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, dt) => { uniforms.uTime.value += dt; });
  const onFace = useMemo(() => makeFaceShader(uniforms), [uniforms]);
  const geo = nodes.model.geometry;

  return (
    <group scale={size / HEIGHT} rotation={[LEAN, 0, 0]}>
      <group position={[0, -HEIGHT / 2, 0]}>
        <mesh geometry={geo}>
          <meshStandardMaterial roughness={0.35}
            onBeforeCompile={onFace} customProgramCacheKey={() => 'bust-face'} />
        </mesh>
        <Smoke geometry={geo} uniforms={uniforms} />
      </group>
    </group>
  );
}

useGLTF.preload(URL);