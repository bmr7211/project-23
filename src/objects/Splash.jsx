import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeRandom } from './random';
import { useAudioLevel } from '../lib/audioLevel';

// ── 조절용 숫자 (길이는 size 배율) ──────────────
// 드럼 감지
const SENS = 1.35;          // 평소 소리보다 몇 배 커지면 '쿵'으로 볼지 (작을수록 예민)
const MIN_GAP = 0.12;       // 쿵 사이 최소 간격(초)

// 왕관(크라운): 쿵 하면 액체 벽이 둥글게 솟았다가 무너짐
const CROWN_H = 0.95;       // 왕관 벽 최대 높이
const CROWN_R = 0.14;       // 왕관 시작 반지름
const CROWN_SPREAD = 0.25;  // 위로 갈수록 바깥으로 벌어지는 양
const CROWN_TIPS = [7, 11]; // 테두리 뾰족한 끝 개수 (최소, 최대)
const CROWN_LIFE = 0.9;     // 솟았다 무너지는 시간(초)

// 튀는 방울
const DROPS_PER_HIT = 26;   // 쿵 한 번에 바닥에서 튀는 방울 수
const SPLASH_UP = 1.9;      // 위로 튀는 힘
const SPLASH_OUT = 0.7;     // 옆으로 퍼지는 힘
const GRAVITY = 3.4;        // 떨어지는 힘
const DROP_SIZE = 0.012;     // 방울 크기
const STRETCH = 0.35;       // 빠를수록 길쭉해지는 정도

// 가운데 물기둥: 센 쿵이면 왕관이 무너질 때 가운데서 솟음
const JET_POWER = 0.45;     // 이 세기(0~1)보다 센 쿵에만
const JET_UP = 2.3;         // 솟는 힘
const JET_DELAY = 0.22;     // 쿵 뒤 몇 초 후에 솟을지

// 바닥 액체
const POOL_R = 0.62;        // 반지름 (가장자리는 투명하게 사라짐)
const WAVE = 0.032;         // 늘 일렁이는 물결 높이
const WAVE_SPEED = 1;       // 일렁이는 빠르기
const RIPPLE = 0.035;       // 쿵 할 때 퍼지는 물결 높이

// 투명도 (0 투명 ~ 1 불투명)
const OPACITY = 0.45;       // 왕관
const DROP_OPACITY = 0.65;  // 방울
const POOL_OPACITY = 0.55;  // 바닥

const TILT = 0.3;           // 액체 면이 보이게 앞으로 기울이는 각도
const IDLE_EVERY = [1.4, 2.6]; // 앨범 목록 화면: 소리 없이 가끔 튀는 간격(초)

const MAX_DROPS = 320;
const MAX_RIPPLES = 6;
const CROWN_COUNT = 3;       // 동시에 보일 수 있는 왕관 수

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);

// 파란 액체가 드럼 소리에 맞춰 튀는 오브제
export default function Splash({ size = 2.4, color = '#5aa8ff', seed, audioRef, view = 'track' }) {
  const isAlbum = view === 'album';
  const gl = useThree((s) => s.gl);
  const rand = useMemo(() => makeRandom(seed), [seed]);

  // 액체에 비칠 가상의 방 (이 오브제 재질에만 씀 → 다른 오브제 영향 없음)
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return tex;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);

  // 물 재질: 투명 + 매끈한 코팅 + 주변 반사
  const mats = useMemo(() => {
    const make = (opacity, extra = {}) => new THREE.MeshPhysicalMaterial({
      color, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
      envMap: env, envMapIntensity: 1.4,
      transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
      ...extra,
    });
    return {
      drop: make(DROP_OPACITY),
      pool: make(POOL_OPACITY, { vertexColors: true }), // 가장자리 투명하게
      crowns: Array.from({ length: CROWN_COUNT }, () => make(0)),
    };
  }, [color, env]);

  // 바닥 액체: 동심원으로 잘게 나눈 원판 + 가장자리로 갈수록 투명
  const pool = useMemo(() => {
    const geo = new THREE.RingGeometry(0.0001, 1, 96, 32).rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const x = new Float32Array(pos.count);
    const z = new Float32Array(pos.count);
    const r = new Float32Array(pos.count);
    const col = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      x[i] = pos.getX(i); z[i] = pos.getZ(i);
      r[i] = Math.hypot(x[i], z[i]);
      col.set([1, 1, 1, 1 - THREE.MathUtils.smoothstep(r[i], 0.45, 1)], i * 4);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    return { geo, x, z, r };
  }, []);

  // 왕관: 뚜껑 없는 원통을 매 프레임 구부려서 만듦
  const crownBase = useMemo(() => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 72, 10, true);
    const pos = geo.attributes.position;
    const th = new Float32Array(pos.count);
    const v = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      th[i] = Math.atan2(pos.getX(i), pos.getZ(i)); // 둘레 각도
      v[i] = pos.getY(i) + 0.5;                      // 0 = 바닥, 1 = 테두리
    }
    return { geo, th, v };
  }, []);
  const crownGeos = useMemo(
    () => Array.from({ length: CROWN_COUNT }, () => crownBase.geo.clone()),
    [crownBase],
  );

  const dropGeo = useMemo(() => new THREE.SphereGeometry(1, 14, 10), []);

  const state = useRef(null);
  const dropsRef = useRef();
  const poolRef = useRef();
  const crownRefs = useRef([]);
  const readLevel = useAudioLevel(audioRef);

  // 상태 만들기 + 처음엔 방울 숨기기
  useLayoutEffect(() => {
    state.current = {
      drops: Array.from({ length: MAX_DROPS }, () => ({
        alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: 0,
      })),
      crowns: Array.from({ length: CROWN_COUNT }, () => ({
        active: false, t0: 0, life: 1, strength: 0, phase: 0, burst: false,
        tips: [], spike: new Float32Array(crownBase.th.length),
      })),
      ripples: [], jets: [], slow: 0, lastHit: -1, cursor: 0, nextIdle: 0.5,
    };
    for (let i = 0; i < MAX_DROPS; i++) dropsRef.current.setMatrixAt(i, _zero);
    dropsRef.current.instanceMatrix.needsUpdate = true;
  }, [crownBase]);

  // 방울 하나 띄우기
  const spawn = (px, py, pz, vx, vy, vz, r) => {
    const st = state.current;
    const d = st.drops[st.cursor];
    st.cursor = (st.cursor + 1) % MAX_DROPS;
    d.alive = true;
    d.p.set(px, py, pz);
    d.v.set(vx, vy, vz);
    d.r = r;
  };

  // 쿵! (strength 0~1)
  const splash = (strength, t) => {
    const st = state.current;

    // 1) 왕관 시작 — 쉬고 있는 왕관, 없으면 제일 오래된 것
    const c = st.crowns.find((k) => !k.active) ?? st.crowns.reduce((a, b) => (a.t0 < b.t0 ? a : b));
    c.active = true; c.t0 = t; c.burst = false;
    c.strength = 0.5 + strength * 0.5;
    c.life = CROWN_LIFE * (0.8 + strength * 0.4);
    c.phase = rand() * Math.PI * 2;
    const nTips = Math.round(CROWN_TIPS[0] + rand() * (CROWN_TIPS[1] - CROWN_TIPS[0]));
    c.tips = Array.from({ length: nTips }, (_, k) => ({
      th: ((k + rand() * 0.6) / nTips) * Math.PI * 2,
      a: 0.6 + rand() * 0.4,
    }));
    // 꼭짓점마다 뾰족한 끝에 얼마나 가까운지 (테두리가 들쭉날쭉하게)
    for (let j = 0; j < c.spike.length; j++) {
      let sp = 0;
      for (const tip of c.tips) {
        const cos = Math.cos(crownBase.th[j] - tip.th);
        if (cos > 0) sp = Math.max(sp, tip.a * cos ** 40);
      }
      c.spike[j] = sp;
    }

    // 2) 바닥에서 사방으로 튀는 방울
    const n = Math.round(DROPS_PER_HIT * (0.5 + strength));
    for (let i = 0; i < n; i++) {
      const ang = rand() * Math.PI * 2;
      const rad = size * CROWN_R * (0.8 + rand() * 0.5);
      const up = size * SPLASH_UP * (0.4 + rand() * 0.7) * (0.6 + strength * 0.6);
      const out = size * SPLASH_OUT * (0.3 + rand());
      spawn(Math.sin(ang) * rad, 0, Math.cos(ang) * rad,
        Math.sin(ang) * out, up, Math.cos(ang) * out,
        size * DROP_SIZE * (0.5 + rand() * 1.1));
    }

    // 3) 센 쿵이면 조금 뒤 가운데 물기둥
    if (strength > JET_POWER) st.jets.push({ t: t + JET_DELAY, strength });

    // 4) 바닥 물결
    if (st.ripples.length >= MAX_RIPPLES) st.ripples.shift();
    st.ripples.push({ t0: t, amp: strength });
  };

  useFrame((s, dt) => {
    const st = state.current;
    if (!st) return;
    const t = s.clock.elapsedTime;
    const d = Math.min(dt, 0.05);

    // ── 드럼 감지: 지금 소리가 평소 평균보다 확 커지면 쿵 ──
    const raw = readLevel();
    if (raw > 0.03 && raw > st.slow * SENS + 0.015 && t - st.lastHit > MIN_GAP) {
      splash(THREE.MathUtils.clamp(((raw - st.slow) / (st.slow + 0.02)) * 0.6, 0.2, 1), t);
      st.lastHit = t;
    }
    st.slow = THREE.MathUtils.damp(st.slow, raw, 1.5, d);

    if (isAlbum && t > st.nextIdle) {
      splash(0.4 + rand() * 0.4, t);
      st.nextIdle = t + IDLE_EVERY[0] + rand() * (IDLE_EVERY[1] - IDLE_EVERY[0]);
    }

    // ── 가운데 물기둥: 방울 여러 개를 속도만 다르게 쏴서 기둥처럼 ──
    while (st.jets.length && t >= st.jets[0].t) {
      const j = st.jets.shift();
      for (let k = 0; k < 6; k++) {
        spawn((rand() - 0.5) * size * 0.01, 0, (rand() - 0.5) * size * 0.01,
          (rand() - 0.5) * size * 0.08, size * JET_UP * (0.7 + 0.4 * j.strength) * (1 - k * 0.11),
          (rand() - 0.5) * size * 0.08, size * DROP_SIZE * (2.6 - k * 0.3));
      }
    }

    // ── 왕관 ──
    st.crowns.forEach((c, i) => {
      const mesh = crownRefs.current[i];
      if (!mesh) return;
      if (!c.active) { mesh.visible = false; return; }
      const age = t - c.t0;
      const p = age / c.life;
      if (p >= 1) { c.active = false; mesh.visible = false; return; }

      const h = size * CROWN_H * c.strength * Math.sin(Math.PI * p ** 0.6); // 빨리 솟고 천천히 무너짐
      const r0 = size * (CROWN_R + CROWN_SPREAD * 0.4 * Math.sqrt(p)) * (0.7 + 0.5 * c.strength);
      const flare = size * CROWN_SPREAD * c.strength * (0.4 + p);
      const pos = mesh.geometry.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const v = crownBase.v[j];
        const th = crownBase.th[j];
        const y = v * h * (0.55 + 0.9 * c.spike[j]);
        const rad = r0 + flare * v * v + Math.sin(th * 5 + c.phase + age * 6) * size * 0.008;
        pos.setXYZ(j, Math.sin(th) * rad, y, Math.cos(th) * rad);
      }
      pos.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.material.opacity = OPACITY * Math.min(1, p * 12) * (1 - p ** 3);
      mesh.visible = true;

      // 솟아오르는 중간에 뾰족한 끝마다 방울이 떨어져 나감
      if (!c.burst && p > 0.3) {
        c.burst = true;
        for (const tip of c.tips) {
          const rad = r0 + flare;
          const y = h * (0.55 + 0.9 * tip.a);
          for (let k = 0; k < 3; k++) {
            const out = size * SPLASH_OUT * (0.4 + rand() * 0.6);
            spawn(Math.sin(tip.th) * rad, y, Math.cos(tip.th) * rad,
              Math.sin(tip.th) * out, size * SPLASH_UP * (0.25 + rand() * 0.35), Math.cos(tip.th) * out,
              size * DROP_SIZE * (0.5 + rand() * (k === 0 ? 1.2 : 0.6)));
          }
        }
      }
    });

    // ── 방울 ──
    const g = size * GRAVITY;
    const mesh = dropsRef.current;
    for (let i = 0; i < MAX_DROPS; i++) {
      const dr = st.drops[i];
      if (!dr.alive) { mesh.setMatrixAt(i, _zero); continue; }
      dr.v.y -= g * d;
      dr.p.addScaledVector(dr.v, d);
      if (dr.p.y < 0 && dr.v.y < 0) { dr.alive = false; mesh.setMatrixAt(i, _zero); continue; }
      const speed = dr.v.length();
      _dir.copy(dr.v).divideScalar(speed || 1);
      _q.setFromUnitVectors(_up, _dir);
      const stretch = 1 + Math.min((speed / size) * STRETCH, 1.6);
      _s.set(dr.r / Math.sqrt(stretch), dr.r * stretch, dr.r / Math.sqrt(stretch));
      mesh.setMatrixAt(i, _m.compose(_p.copy(dr.p), _q, _s));
    }
    mesh.instanceMatrix.needsUpdate = true;

    // ── 바닥: 늘 일렁이는 물결 + 쿵마다 퍼지는 동심원 ──
    const geom = poolRef.current.geometry;
    const pos = geom.attributes.position;
    const wave = WAVE / POOL_R;   // 원판 반지름이 1이라서 그 비율로
    const amp0 = RIPPLE / POOL_R;
    const T = t * WAVE_SPEED;
    for (let i = 0; i < pos.count; i++) {
      const x = pool.x[i], z = pool.z[i], r = pool.r[i];
      let h = wave * 0.5 * (
        Math.sin(x * 4 + T * 1.3) * Math.cos(z * 3.4 - T * 1.05)
        + 0.6 * Math.sin((x * 0.7 - z) * 6.5 + T * 1.9)
        + 0.4 * Math.cos((x + z * 0.4) * 9 - T * 2.6)
      );
      for (const rp of st.ripples) {
        const age = t - rp.t0;
        const front = age * 1.1;
        if (r > front) continue;
        h += rp.amp * amp0 * Math.exp(-age * 1.6) * Math.sin((r - front) * 18) * (1 - r);
      }
      pos.setY(i, h);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    while (st.ripples.length && t - st.ripples[0].t0 > 3) st.ripples.shift();
  });

  return (
    <group position={[0, -size * 0.3, 0]} rotation={[TILT, 0, 0]}>
      <mesh ref={poolRef} geometry={pool.geo} material={mats.pool} scale={size * POOL_R} renderOrder={0} />
      {crownGeos.map((geo, i) => (
        <mesh
          key={i} ref={(el) => (crownRefs.current[i] = el)}
          geometry={geo} material={mats.crowns[i]} visible={false} renderOrder={1}
        />
      ))}
      <instancedMesh
        ref={dropsRef} args={[dropGeo, mats.drop, MAX_DROPS]}
        frustumCulled={false} renderOrder={2}
      />
    </group>
  );
}
