import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useTexture, Stars } from '@react-three/drei';
import * as THREE from 'three';
// http://localhost:5173/earth-render

// 구도
const EARTH_R = 2.5; // 지구 반지름
const EARTH_X = 0; // 좌우 위치 (+면 오른쪽)
const EARTH_Y = -2.2; // 위아래 위치 (-면 아래로, 클수록 반구가 더 적게 보임)

// 어느 지역이 정면에 올지
const CENTER_LON = 20; // 경도 (동경 +, 서경 -) — 80 = 인도·중앙아시아
const CENTER_LAT = 0; // 위도 (북위 +, 남위 -) — 작을수록 위쪽 테두리에 북쪽 땅이 덜 보임

const ROT_Y = -Math.PI / 2 - THREE.MathUtils.degToRad(CENTER_LON);
const TILT_X = THREE.MathUtils.degToRad(CENTER_LAT);

const CAM_Z = 6; // 카메라 거리 (멀수록 원근 왜곡이 적음)
const FOV = 25;

// 저장
const OUT_W = 3840;
const OUT_H = 2160; // 16:9 (지금 earth.jpg와 같은 비율)

// 빛
const SUN_DIR = new THREE.Vector3(5, 1, 2).normalize(); // 해가 있는 방향 (오른쪽 위 앞)
const DAY_LIGHT = 1.6; // 낮 쪽 밝기
const NIGHT_LIGHT = 1.8; // 도시 불빛 밝기
const TERMINATOR = 0.5; // 낮밤 경계 부드러운 정도 (클수록 넓게 번짐)

const CLOUD_OPACITY = 0.9; // 구름 진하기
const ATMOS_COLOR = new THREE.Color('#8cc5ff'); // 대기층 색
const ATMOS_STRENGTH = 0.3; // 대기층 밝기

// 배경 별
const STAR_COUNT = 10000;
const STAR_SIZE = 25;

// 남색 안개
const FOG_COLOR = new THREE.Color('#122a52');
const FOG_STRENGTH = 0.8; // 진하기 (0이면 없음)
const FOG_SCALE = 1.5; // 얼룩 크기 (클수록 잘게 쪼개짐)
const FOG_CENTER = new THREE.Vector2(0.55, 0.2); // 안개가 가장 짙은 곳 (화면 비율, 왼쪽아래 0,0 / 오른쪽위 1,1)
const FOG_DIST = 50; // 카메라 기준 지구 뒤로 얼마나 멀리 둘지

const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormalW;
    void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal); // 회전 반영된 표면 방향
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform vec3 sunDir;
    uniform float dayLight;
    uniform float nightLight;
    uniform float terminator;
    varying vec2 vUv;
    varying vec3 vNormalW;

    void main() {
        float sun = dot(normalize(vNormalW), sunDir); // 1 = 해 정면, 0 = 경계, -1 = 한밤

        vec3 day = texture2D(dayMap, vUv).rgb * max(sun, 0.0) * dayLight;
        vec3 night = pow(texture2D(nightMap, vUv).rgb, vec3(1.6)) * nightLight;

        float dayMix = smoothstep(-terminator, terminator, sun);
        gl_FragColor = vec4(mix(night, day, dayMix), 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

// 구름
const cloudFragment = /* glsl */ `
    uniform sampler2D cloudMap;
    uniform vec3 sunDir;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vNormalW;

    void main() {
        float cloud = texture2D(cloudMap, vUv).r;
        float sun = dot(normalize(vNormalW), sunDir);
        float lit = smoothstep(-0.1, 0.3, sun);
        gl_FragColor = vec4(vec3(lit), cloud * opacity);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

// 대기층
const atmosVertex = /* glsl */ `
    varying vec3 vNormalV;
    varying vec3 vNormalW;
    void main() {
        vNormalV = normalize(normalMatrix * normal);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const atmosFragment = `
    uniform vec3 color;
    uniform vec3 sunDir;
    uniform float strength;
    varying vec3 vNormalV;
    varying vec3 vNormalW;

    void main() {
        float rim = pow(0.7 + dot(vNormalV, vec3(0.0, 0.0, 1.0)), 3.0);
        float lit = smoothstep(-0.3, 0.5, dot(normalize(vNormalW), sunDir));
        gl_FragColor = vec4(color * rim * lit * strength, 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

const fogVertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fogFragment = /* glsl */ `
    uniform vec3 color;
    uniform float strength;
    uniform float scale;
    uniform vec2 center;
    varying vec2 vUv;

    // 부드러운 노이즈
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    // 여러 크기 노이즈를 겹쳐서 구름 같은 얼룩 만들기
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
        return v;
    }

    void main() {
        vec2 p = vUv * vec2(16.0 / 9.0, 1.0); // 가로로 안 늘어나게
        float cloud = fbm(p * scale);
        float glow = 1.0 - smoothstep(0.0, 0.9, distance(vUv, center));
        float fog = (0.3 + 0.7 * cloud) * (0.25 + 0.75 * glow);
        gl_FragColor = vec4(color * fog * strength, 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

function Earth() {
    const [day, night, clouds] = useTexture([
        '/locations/earth/day.jpg',
        '/locations/earth/night.jpg',
        '/locations/earth/clouds.jpg',
    ]);
    for (const t of [day, night, clouds]) {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
    }

    const uniforms = useMemo(() => ({
        dayMap: { value: day },
        nightMap: { value: night },
        sunDir: { value: SUN_DIR },
        dayLight: { value: DAY_LIGHT },
        nightLight: { value: NIGHT_LIGHT },
        terminator: { value: TERMINATOR },
    }), [day, night]);

    const cloudUniforms = useMemo(() => ({
        cloudMap: { value: clouds },
        sunDir: { value: SUN_DIR },
        opacity: { value: CLOUD_OPACITY },
    }), [clouds]);

    const atmosUniforms = useMemo(() => ({
        color: { value: ATMOS_COLOR },
        sunDir: { value: SUN_DIR },
        strength: { value: ATMOS_STRENGTH },
    }), []);

    return (
        <group position={[EARTH_X, EARTH_Y, 0]} rotation={[TILT_X, ROT_Y, 0]}>
            <mesh>
                <sphereGeometry args={[EARTH_R, 128, 128]} />
                <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                />
            </mesh>

            {/* 구름 */}
            <mesh>
                <sphereGeometry args={[EARTH_R * 1.006, 128, 128]} />
                <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={cloudFragment}
                uniforms={cloudUniforms}
                transparent
                depthWrite={false}
                />
            </mesh>

            {/* 대기층 */}
            <mesh>
                <sphereGeometry args={[EARTH_R * 1.018, 128, 128]} />
                <shaderMaterial
                vertexShader={atmosVertex}
                fragmentShader={atmosFragment}
                uniforms={atmosUniforms}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                transparent
                depthWrite={false}
                />
            </mesh>
        </group>
    );
}

// 안개 판
function Fog() {
  const h = 2 * (CAM_Z + FOG_DIST) * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const w = h * (16 / 9);

  const uniforms = useMemo(() => ({
    color: { value: FOG_COLOR },
    strength: { value: FOG_STRENGTH },
    scale: { value: FOG_SCALE },
    center: { value: FOG_CENTER },
  }), []);

  return (
    <mesh position={[0, 0, -FOG_DIST]}>
      <planeGeometry args={[w, h]} />
      <shaderMaterial
        vertexShader={fogVertex}
        fragmentShader={fogFragment}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// 버튼 누르면 OUT_W × OUT_H 크기로 한 번 그려서 저장
function Saver({ saveRef }) {
  const { gl, scene, camera, size } = useThree();

  saveRef.current = () => {
    const prevRatio = gl.getPixelRatio();

    // 1) 저장용 크기로 바꿔서 한 번 그리기
    gl.setPixelRatio(1);
    gl.setSize(OUT_W, OUT_H, false);
    camera.aspect = OUT_W / OUT_H;
    camera.updateProjectionMatrix();
    gl.render(scene, camera);
    const url = gl.domElement.toDataURL('image/jpeg', 0.92);

    // 2) 화면 크기로 되돌리기
    gl.setPixelRatio(prevRatio);
    gl.setSize(size.width, size.height, false);
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();

    // 3) 다운로드
    const a = document.createElement('a');
    a.href = url;
    a.download = 'earth.jpg';
    a.click();
  };

  return null;
}

export default function EarthRender() {
  const saveRef = useRef(null);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: '#111',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 16:9 미리보기 틀 = 저장되는 화면 */}
      <div style={{
        width: 'min(100vw, 100vh * 16 / 9)',
        aspectRatio: '16 / 9',
        background: '#000',
      }}>
        <Canvas camera={{ position: [0, 0, CAM_Z], fov: FOV }}>
            <Stars
                radius={150}
                depth={60}
                count={STAR_COUNT}
                factor={STAR_SIZE}
                saturation={0}
                fade
                speed={0}
            />
            <Fog />
            <Suspense fallback={null}>
                <Earth />
            </Suspense>
            <Saver saveRef={saveRef} />
        </Canvas>
      </div>

      <button
        onClick={() => saveRef.current?.()}
        style={{
          position: 'fixed', right: 24, bottom: 24, padding: '10px 16px',
          font: '12px ui-monospace, Menlo, monospace', cursor: 'pointer',
        }}
      >
        Save {OUT_W}×{OUT_H}
      </button>
    </div>
  );
}