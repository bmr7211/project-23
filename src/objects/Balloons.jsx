import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeRandom } from './random';
import { useAudioLevel } from '../lib/audioLevel';

// ── 조절용 숫자 ──────────────────────────────
const RISE_SPEED = 0.045; // 신스 소리가 날 때 떠오르는 속도 (클수록 빨리 다 올라감)
const RISE_EACH = 0.35;   // 풍선 하나가 올라가는 데 쓰는 구간 (클수록 여러 개가 겹쳐서 느긋하게)
const FOLLOW = 1.2;       // 움직임이 목표를 따라가는 부드러움 (작을수록 더 천천히·둥실)
const LOUD = 3.5;         // 소리 감도 (클수록 작은 소리에도 잘 떠오름)

// ── 떠 있을 때 둥둥 (size 배율) ──
const FLOAT_X = 0.02;     // 좌우로 흔들리는 폭
const FLOAT_Y = 0.025;    // 위아래로 흔들리는 폭
const FLOAT_SPEED = 0.6;  // 흔들리는 빠르기 (작을수록 느릿느릿)

// ── 배열·간격 (전부 size 배율, size=3이면 0.1 → 0.3) ──
// 위에서 내려다보면 cols × rows 바둑판, 그걸 옆(시선 높이)에서 보는 구도
const COL_GAP = 0.23;     // 가로 간격: 옆 풍선 중심까지 거리 (풍선 지름 ≈ 0.19)
const ROW_GAP = 0.25;     // 앞뒤 간격: 뒷줄 풍선 중심까지 거리
const JITTER = 0.025;     // 가로·앞뒤 불규칙한 정도 (0이면 바둑판처럼 딱 맞춤)
const CEIL_Y = 0.4;       // 풍선이 떠 있는 높이 — 0보다 크면 시선(화면 가운데)보다 위
const CEIL_JITTER = 0.06; // 풍선마다 높이 차이 (0이면 전부 같은 높이)
const GRID_Z = 0;         // 배열 전체를 앞뒤로 미는 양 (맨 앞줄 위치, 음수면 뒤로)
const FLOOR_Y = -0.55;    // 바닥 높이 — 재생 전 풍선이 놓여 있는 곳 (작을수록 화면 아래쪽)


// 천장에 모인 풍선들 — 위에서 보면 cols × rows 배열, 신스 소리에 맞춰 바닥에서 천천히 떠오름
export default function Balloons({
  size = 3, cols = 6, rows = 4, color = '#ffffff', seed, audioRef, view = 'track',
}) {
  const isAlbum = view === 'album'; // 목록 화면: 소리 없이 다 떠오른 상태로 보여주기
  const count = cols * rows;

  const balloons = useMemo(() => {
    const rand = makeRandom(seed);
    const jit = () => (rand() * 2 - 1) * size * JITTER; // -JITTER ~ +JITTER
    const baseZ = isAlbum ? 0 : size * GRID_Z;
    const list = [];

    for (let row = 0; row < rows; row++) {       // row 0 = 맨 앞줄
      for (let col = 0; col < cols; col++) {
        const x = (col - (cols - 1) / 2) * size * COL_GAP + jit();
        const z = baseZ - row * size * ROW_GAP + jit();
        const ceil = size * (CEIL_Y + (rand() * 2 - 1) * CEIL_JITTER);
        const r = size * (0.09 + rand() * 0.008);
        list.push({
          x, z, r, ceil,
          // 출발 높이: 바닥에 풍선 아랫면이 닿게
          floor: size * FLOOR_Y + r * 1.15,
          delay: rand(),           // 언제부터 올라갈지 (0 = 제일 먼저)
          phase: rand() * Math.PI * 2,
          // 풍선마다 흔들리는 빠르기를 조금씩 다르게 (다 같이 움직이지 않게)
          fx: 0.7 + rand() * 0.6,
          fy: 0.7 + rand() * 0.6,
          tilt: (rand() - 0.5) * 0.25,
          stringLen: size * (0.22 + rand() * 0.2),
        });
      }
    }
    return list;
  }, [size, cols, rows, seed, isAlbum]);

  // 모든 풍선이 같이 쓰는 모양·재질
  const geo = useMemo(() => ({
    body: new THREE.SphereGeometry(1, 32, 24),
    knot: new THREE.ConeGeometry(1, 1, 12),
    string: new THREE.CylinderGeometry(1, 1, 1, 4),
  }), []);
  const mat = useMemo(() => ({
    // 라텍스: 반무광 바탕 + 얇은 코팅(작고 쨍한 하이라이트) + 가장자리 은은한 빛
    body: new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.45,          // 바탕 광택 (클수록 무광, 빛이 넓고 흐리게 퍼짐)
      clearcoat: 1,             // 표면 코팅 세기 (0이면 코팅 없음)
      clearcoatRoughness: 0.1,  // 코팅 하이라이트 크기 (작을수록 작고 쨍한 점)
      sheen: 0.6,               // 가장자리가 밝아지는 정도 (얇은 고무막 느낌)
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#ffffff'),
    }),
    string: new THREE.MeshBasicMaterial({ color: '#f3e6ea', transparent: true, opacity: 0.5 }),
  }), [color]);

  const refs = useRef([]);
  const stringRefs = useRef([]);
  const lift = useRef(isAlbum ? 1 : 0);        // 전체 진행도 0~1 (신스가 울린 만큼 쌓임)
  // 풍선마다 실제 보이는 진행도 (useFrame에서 직접 바꿔 씀)
  const shown = useMemo(() => new Float32Array(count).fill(isAlbum ? 1 : 0), [count, isAlbum]);
  const level = useRef(0);
  const readLevel = useAudioLevel(audioRef);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.1);

    // 소리 크기 → 부드럽게
    const raw = Math.min(1, readLevel() * LOUD);
    level.current = THREE.MathUtils.damp(level.current, raw, 6, d);

    // 신스가 울리는 동안만 진행도가 올라감 (멈추면 그 자리에 둥실)
    if (!isAlbum) lift.current = Math.min(1, lift.current + d * RISE_SPEED * level.current);

    balloons.forEach((b, i) => {
      const m = refs.current[i];
      if (!m) return;

      const target = THREE.MathUtils.clamp((lift.current * (1 + RISE_EACH) - b.delay) / RISE_EACH, 0, 1);
      shown[i] = THREE.MathUtils.damp(shown[i], target, FOLLOW, d);
      const p = shown[i];
      const e = p * p * (3 - 2 * p);           // 출발·도착을 부드럽게
      const midway = Math.sin(e * Math.PI);    // 올라가는 중간에 제일 크게 흔들림

      const sway = size * 0.04 * midway;      // 올라가는 중 흔들림

      // 떠 있을 때 제자리 둥둥: 사인 두 개를 섞어서 규칙적이지 않게 (바닥에선 0)
      const ft = t * FLOAT_SPEED;
      const floatX = (Math.sin(ft * b.fx + b.phase) * 0.7 + Math.sin(ft * b.fx * 1.9 + b.phase * 2) * 0.3) * size * FLOAT_X * e;
      const floatY = (Math.sin(ft * b.fy + b.phase * 1.3) * 0.7 + Math.sin(ft * b.fy * 2.3 + b.phase) * 0.3) * size * (FLOAT_Y + 0.01 * level.current) * e;

      m.position.set(
        b.x + Math.sin(t * 0.6 + b.phase) * sway + floatX,
        THREE.MathUtils.lerp(b.floor, b.ceil, e) + floatY,
        b.z + Math.cos(t * 0.5 + b.phase) * sway * 0.6,
      );
      m.rotation.z = b.tilt * e + Math.sin(t * 0.7 + b.phase) * 0.08 * midway;

      // 줄은 바닥에선 안 보이다가 떠오르는 만큼 아래로 늘어짐 (바닥을 뚫지 않게)
      const sr = stringRefs.current[i];
      if (sr) sr.scale.y = Math.max(0.001, e);
    });
  });

  return (
    // 목록 화면에선 덩어리를 가운데로 내려서 다른 오브제와 높이 맞추기
    <group position={[0, isAlbum ? -size * CEIL_Y : 0, isAlbum ? size * ((rows - 1) / 2) * ROW_GAP : 0]}>
      {balloons.map((b, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          {/* 몸통: 세로로 살짝 긴 구 */}
          <mesh geometry={geo.body} material={mat.body} scale={[b.r, b.r * 1.15, b.r]} />
          {/* 매듭 */}
          <mesh
            geometry={geo.knot} material={mat.body}
            position={[0, -b.r * 1.17, 0]}
            scale={[b.r * 0.13, b.r * 0.18, b.r * 0.13]}
          />
          {/* 늘어진 줄: 매듭에 붙은 group을 세로로 늘였다 줄였다 */}
          <group position={[0, -b.r * 1.25, 0]} ref={(el) => (stringRefs.current[i] = el)}>
            <mesh
              geometry={geo.string} material={mat.string}
              position={[0, -b.stringLen / 2, 0]}
              scale={[size * 0.0015, b.stringLen, size * 0.0015]}
            />
          </group>
        </group>
      ))}
    </group>
  );
}
