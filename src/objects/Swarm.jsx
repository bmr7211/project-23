import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeRandom } from './random';

// 매듭 곡선 위의 한 점
function knot(u, scale, out) {
  const r = Math.cos(3 * u) + 2;
  return out.set(
    r * Math.cos(2 * u) * scale,
    r * Math.sin(2 * u) * scale,
    -Math.sin(3 * u) * scale,
  );
}

// 흐르는 점 띠: count = 점 개수
export default function Swarm({ size = 2, count = 2500, color = '#a79cad', seed }) {
  const ref = useRef();
  const scale = size / 2 / 3; // 매듭 최대 반지름 3 → size/2에 맞춤

  // 점마다: 출발 위치, 속도, 띠 안에서 벗어난 정도, 밝기
  const { start, speed, offset, positions, colors } = useMemo(() => {
    const rand = makeRandom(seed);
    const start = new Float32Array(count);
    const speed = new Float32Array(count);
    const offset = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const base = new THREE.Color(color);
    const spread = size * 0.1; // 띠 굵기

    for (let i = 0; i < count; i++) {
      start[i] = rand() * Math.PI * 2;
      speed[i] = 0.12 + 0.1 * rand();
      offset[i * 3]     = (rand() - 0.5) * spread;
      offset[i * 3 + 1] = (rand() - 0.5) * spread;
      offset[i * 3 + 2] = (rand() - 0.5) * spread;
      const b = 0.35 + 0.65 * rand(); // 점마다 밝기 다르게
      colors[i * 3]     = base.r * b;
      colors[i * 3 + 1] = base.g * b;
      colors[i * 3 + 2] = base.b * b;
    }
    return { start, speed, offset, positions, colors };
  }, [size, count, color, seed]);

  // 가장자리가 흐린 동그란 점 그림
  const dot = useMemo(() => {
    const S = 32;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }, []);

  useEffect(() => () => dot.dispose(), [dot]);

  const _p = useMemo(() => new THREE.Vector3(), []);

  // 매 프레임 점들을 곡선 따라 앞으로 보내기
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      knot(start[i] + t * speed[i], scale, _p);
      pos.array[i * 3]     = _p.x + offset[i * 3];
      pos.array[i * 3 + 1] = _p.y + offset[i * 3 + 1];
      pos.array[i * 3 + 2] = _p.z + offset[i * 3 + 2];
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={dot} vertexColors size={size * 0.025} sizeAttenuation
        transparent depthWrite={false} blending={THREE.AdditiveBlending}
      />
    </points>
  );
}