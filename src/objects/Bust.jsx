import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const URL = '/models/bust.glb';
const HEIGHT = 3.2;      // 연기까지 포함한 전체 높이 (가운데 맞추기용)
const LEAN = 0.15;

// ===== 연기 (원래 모델 기준: 코끝 1.21 / 입 0.97 / 정수리 1.9) =====
const C2x = 0.02, C2z = -0.08; // 머리 중심축 (x, z)
const SMOKE_Y   = 1.28;  // 연기 시작 (콧대)
const DRIP      = 0.10;  // 결이 코 위로 흘러내리는 길이
const INFLATE   = 0.01;  // 피부에서 띄우는 거리 (깜빡이면 조금 키우기)
const STRETCH   = 1.2;   // 위로 솟는 정도
const KEEP_W    = 0.54;  // 위로 올라가도 유지할 폭
const SWAY      = 0.25;
const GLITCH    = 0.05;
const SPEED     = 0.5;
const CUT_Y     = 1.72;  // 꼭대기 끊김 (원래 모델 높이 기준)
const CUT_RANGE = 0.22;
const LINES = 180;
const WARP  = 20;

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
  vec3 smokeCol(vec2 dir, float y, float t, float line){
    float c = smoothstep(0.25, 0.75, n2(dir * 2.5 + vec2(y * 1.5 - t * 0.4, 3.0)));
    vec3 light = vec3(1.0, 0.8, 0.95);
    vec3 ink = mix(vec3(0.5, 0.15, 1.0), vec3(1.0, 0.2, 0.75), n2(dir * 2.0 + vec2(y - t * 0.2, 7.0)));
    ink = mix(ink, vec3(1.0, 0.55, 0.2), smoothstep(0.7, 1.0, n2(dir * 3.0 + vec2(y * 2.0, 11.0))) * 0.6);
    return mix(light, ink, line * c + (1.0 - c) * 0.15);
  }
`;

// ---------- 연기: 머리 복사본을 변형 ----------
const smokeVert = /* glsl */`
  uniform float uTime;
  varying vec3 vOrig; varying vec3 vP;
  ${NOISE}
  void main(){
    vec3 p = position + normal * ${f(INFLATE)};   // 피부 바로 위
    float y0 = position.y;
    vOrig = position;

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
    float amp = ${f(SWAY)} * k * k;
    p.x += amp * sin(p.y * 4.0 - t) + amp * 0.5 * sin(p.y * 9.0 - t * 1.7);
    p.z += amp * 0.5 * cos(p.y * 3.0 - t * 0.8);
    p.x += ${f(GLITCH)} * (n2(vec2(p.y * 30.0, t * 0.5)) - 0.5) * k;

    vP = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;

const smokeFrag = /* glsl */`
  uniform float uTime;
  varying vec3 vOrig; varying vec3 vP;
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

    gl_FragColor = vec4(smokeCol(dir, vP.y, t, line), 1.0);
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
        vModel = position;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; varying vec3 vModel;
        ${PATTERN}
        float gNear;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float t = uTime * ${f(SPEED)};
          vec2 dir = normalize(vModel.xz - ${C2} + 1e-4);
          float phase;
          float line = lineAt(dir, vModel.y, t, phase);
          gNear = smoothstep(${f(SMOKE_Y - DRIP - FACE_FADE)}, ${f(SMOKE_Y - DRIP)}, vModel.y);
          vec3 skin = mix(vec3(0.85, 0.2, 0.75), vec3(1.0, 0.5, 0.25),
                          n2(dir * 2.0 + vec2(vModel.y * 2.0, 5.0)));
          diffuseColor.rgb = mix(skin, smokeCol(dir, vModel.y, t, line), gNear * ${f(FACE_MIX)});
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
        totalEmissiveRadiance += diffuseColor.rgb * (0.1 + 0.3 * gNear) + vec3(1.0, 0.4, 0.9) * rim * 0.5;`);
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