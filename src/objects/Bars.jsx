import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeRandom } from './random';

const TILT = 0.45; // 윗면이 보이게 앞으로 기울이는 각도
const REST = 0.16; // 노래 전 높이
const _m = new THREE.Matrix4();

// 막대 큐브: grid = 한 줄 막대 수
export default function Bars({ 
    size = 2, grid = 16, color = '#e8ecf2', 
    seed, tilt = TILT, spin = true }) {
  const meshRef = useRef();
  const spinRef = useRef();
  const count = grid * grid;

  // 막대마다 높이: 가운데가 높고(볼록) 살짝 들쭉날쭉
  const heights = useMemo(() => {
    const rand = makeRandom(seed);
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = size * (REST + 0.012 * rand());
    }
    return arr;
  }, [size, grid, seed, count]);

  // 막대 위치·크기 배치
  useLayoutEffect(() => {
    const cell = size / grid;
    for (let i = 0; i < count; i++) {
      const h = heights[i];
      _m.makeScale(cell * 0.92, h, cell * 0.92); // 0.92 → 막대 사이 틈
      _m.setPosition(
        -size / 2 + ((i % grid) + 0.5) * cell,
        -size * REST / 2 + h / 2, // 바닥을 맞추고 위로 자라게
        -size / 2 + (Math.floor(i / grid) + 0.5) * cell,
      );
      meshRef.current.setMatrixAt(i, _m);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [heights, size, grid, count]);

  // 기울인 상태에서 제자리 회전
useFrame((_, dt) => { if (spin) spinRef.current.rotation.y += dt * 0.15; });

  return (
    <group rotation={[tilt, 0, 0]}>
        <group ref={spinRef}>
            <instancedMesh key={count} ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={color} roughness={0.6} />
            </instancedMesh>
        </group>
    </group>
  );
}