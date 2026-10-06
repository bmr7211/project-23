import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Center } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import './Album01.css';
import { LYRICS } from '../data/lyrics';
import { OBJECTS } from '../data/albumObjects';

const REF_AT = 1.5; // 이 깊이에 있는 줄이 처음 열었을 때 1배(CSS 글자 크기 그대로)
const LINE_H = 12; // 글자 한 줄 높이(px) (CSS 폰트 크기랑 같게)
const PAD = 16; // 구와 글자 사이 여백(px)
const ANCHOR = { x: 0 }; // 가사 기준점 (가로 가운데)
const MAX_SCALE = 3; // 글자가 최대 몇 배까지 커질지
const _a = new THREE.Vector3();

const _v = new THREE.Vector3();

// 오브제 사이 간격: 한 칸 갈 때마다 위로 GAP_Y, 뒤로 GAP_Z
const START_Y = -1.5, START_Z = 2;
const GAP_Y = 2.2, GAP_Z = 4;

const STEP_PX = 600; // 오브제 한 칸을 넘기는 데 필요한 휠 양 (작을수록 빠름)
const SPREAD = 0.25; // 퍼지는 정도 (0이면 퍼짐 없음, 클수록 많이 벌어짐)

function Model({ url, size = 2, color, ...props }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);

  const model = useMemo(() => {
    const m = clone(scene);
    // 테스트용: color를 주면 모든 면을 그 색 재질로 덮어씌움
    if (color) {
      m.traverse((o) => {
        if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
      });
    }
    return m;
  }, [scene, color]);
  const { actions, names } = useAnimations(animations, group);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const s = box.getSize(new THREE.Vector3());
    return size / Math.max(s.x, s.y, s.z);
  }, [model, size]);

  useEffect(() => {
    const action = actions[names[0]];
    if (!action) return;
    action.reset().play();
    action.time = Math.random() * action.getClip().duration; // 박자 엇갈리게
    return () => action.stop();
  }, [actions, names]);

  return (
    <group {...props}>
      <group ref={group} scale={scale}>
        <Center>
          <primitive object={model} />
        </Center>
      </group>
    </group>
  );
}

// 구 5개가 지금 화면에서 차지하는 원 (x, y, 반지름 r: 단위 px)
function getCircles(p, camera, size) {
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return OBJECTS.map((o, i) => {
    itemPosition(o, i, p, _v);
    const dist = camera.position.distanceTo(_v);
    const r = (o.size / 2) / (dist * tanHalf) * (size.height / 2);
    _v.project(camera);
    return {
      x: ((_v.x + 1) / 2) * size.width,
      y: ((1 - _v.y) / 2) * size.height,
      r,
      visible: i - p > -1.2 && _v.z < 1,
    };
  });
}

function LyricsMover({ progress, lyricsRef }) {
  const { camera, size } = useThree();
  const offsets = useRef([]);
  const refDist = useRef(null); // REF_AT 깊이까지 거리 (1배 기준)

  useFrame((_, dt) => {
    const box = lyricsRef.current;
    if (!box) return;
    const p = progress.current.value;
    const lines = box.children;
    const n = lines.length;

    if (refDist.current == null) {
      const ref = itemPosition(ANCHOR, REF_AT, 0, new THREE.Vector3());
      refDist.current = camera.position.distanceTo(ref);
    }

    const circles = getCircles(p, camera, size);

    // 줄 폭 먼저 한꺼번에 읽기
    const widths = [];
    for (let i = 0; i < n; i++) widths.push(lines[i].offsetWidth);

    for (let i = 0; i < n; i++) {
      const l = LYRICS[i];
      const el = lines[i];

      // 1) 이 줄의 3D 위치 → 크기 배율 → 화면 좌표
      itemPosition({ x: l.x ?? 0 }, l.at, p, _a);
      const dist = camera.position.distanceTo(_a);
      const s = Math.min(MAX_SCALE, (l.size ?? 1) * refDist.current / dist);
      _a.project(camera);

      // 카메라 뒤로 지나간 줄은 숨기기 (구랑 같은 기준)
      if (l.at - p <= -1.2 || _a.z > 1) {
        el.style.visibility = 'hidden';
        continue;
      }
      el.style.visibility = 'visible';

      const cx = ((_a.x + 1) / 2) * size.width;
      const y = ((1 - _a.y) / 2) * size.height;
      const half = (widths[i] * s) / 2;
      const lineH = LINE_H * s;
      const pad = PAD * s;
      const dir = l.side === 'left' ? -1 : 1;

      // 2) 정해진 방향으로만 구 피하기
      let x = cx;
      let moved = true;
      let guard = 0;
      while (moved && guard++ < 10) {
        moved = false;
        for (const c of circles) {
          if (!c.visible) continue;
          const R = c.r + pad;
          const dy = Math.max(0, Math.abs(y - c.y) - lineH / 2);
          if (dy >= R) continue;
          const chord = Math.sqrt(R * R - dy * dy);
          const left = c.x - chord;
          const right = c.x + chord;
          if (x + half <= left || x - half >= right) continue;
          x = dir < 0 ? left - half : right + half;
          moved = true;
        }
      }

      // 3) 부드럽게 따라가서 적용
      const target = x - cx;
      const prev = offsets.current[i] ?? target;
      const off = THREE.MathUtils.damp(prev, target, 12, dt);
      offsets.current[i] = off;

      el.style.transform =
        `translate(${cx + off - half}px, ${y - lineH / 2}px) scale(${s})`;
    }
  });
  return null;
}

function PointSphere({ size = 2, count = 4000 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const r = size / 2;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2; // 위(1)에서 아래(-1)까지
      const ring = Math.sqrt(1 - y * y); // 그 높이에서의 둘레 반지름
      const th = golden * i; // 황금각만큼씩 돌기
      const jitter = r * (0.97 + Math.random() * 0.06); // 살짝 울퉁불퉁하게
      arr[i * 3]     = Math.cos(th) * ring * jitter;
      arr[i * 3 + 1] = y * jitter;
      arr[i * 3 + 2] = Math.sin(th) * ring * jitter;
    }
    return arr;
  }, [size, count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.035} sizeAttenuation />
    </points>
  );
}

// 스크롤 목표값을 부드럽게 따라가기
function ScrollDamper({ progress }) {
  const events = useThree((s) => s.events);
  useFrame((_, dt) => {
    const p = progress.current;
    const before = p.value;
    p.value = THREE.MathUtils.damp(p.value, p.target, 4, dt);
    if (Math.abs(p.value - before) > 1e-4) events.update?.();
  });
  return null;
}

// 구 i번 위치 (Item+가사 같이 씀)
function itemPosition(o, i, p, out) {
  const t = i - p;
  const spread = Math.exp(-t * SPREAD);
  return out.set(o.x * spread, START_Y + t * GAP_Y, START_Z - t * GAP_Z);
}

// 오브제 하나: 스크롤 위치에 따라 매 프레임 자리 계산
function Item({ o, i, progress, onHover }) {
  const ref = useRef();
  useFrame((_, dt) => {
    const t = i - progress.current.value;
    itemPosition(o, i, progress.current.value, ref.current.position); // ← 이 줄로 교체
    ref.current.rotation.y += dt * 0.15;
    ref.current.visible = t > -1.2;
  });
  return (
    <group ref={ref} rotation={[0, o.rotY, 0]}>
      <PointSphere size={o.size} />
      {/* 마우스 판정용 투명 구 */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); onHover(o); }}
        onPointerOut={() => onHover((h) => (h?.id === o.id ? null : h))}
      >
        <sphereGeometry args={[o.size / 2, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function Album01() {
  const progress = useRef({ target: 0, value: 0 });
  const lyricsRef = useRef(null);
  const debugRef = useRef(null);
  const touchY = useRef(null);
  const [hovered, setHovered] = useState(null);
  const lastShown = useRef(null);
  if (hovered) lastShown.current = hovered;
  const shown = hovered ?? lastShown.current;

  const move = (dy) => {
    const p = progress.current;
    p.target = THREE.MathUtils.clamp(p.target + dy / STEP_PX, 0, OBJECTS.length - 1);
  };

  return (
    <main
      className="album"
      style={{ cursor: hovered ? 'pointer' : 'default' }}
      onWheel={(e) => move(-e.deltaY)}
      onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
      onTouchMove={(e) => {
        const y = e.touches[0].clientY;
        move((y - touchY.current) * 2);
        touchY.current = y;
      }}
    >
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 6]} intensity={2} />
        <ScrollDamper progress={progress} />
        <LyricsMover progress={progress} lyricsRef={lyricsRef} debugRef={debugRef} />
        <Suspense fallback={null}>
          {OBJECTS.map((o, i) => (
            <Item key={o.id} o={o} i={i} progress={progress} onHover={setHovered} />
          ))}
        </Suspense>
      </Canvas>

      <div className="album-lyrics" ref={lyricsRef}>
        {LYRICS.map((l, i) => (
          <p key={i}>{l.text || '\u00A0'}</p>
        ))}
      </div>

      <div className="album-debug" ref={debugRef}>
        {OBJECTS.map((o) => <span key={o.id} />)}
      </div>

      <p className={`album-label ${hovered ? 'is-on' : ''}`}>
        <span className="album-label-artist">{shown?.artist}</span>
        <span>{shown?.title}</span>
      </p>
    </main>
  );
}