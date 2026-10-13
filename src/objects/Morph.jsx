import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 꿀렁이는 덩어리: 구 표면 점들을 물결 섞어서 밀고 당기기
export default function Morph({ size = 2, color = '#03bdb7', detail = 8 }) {
  const { geometry, base } = useMemo(() => {
    const g = new THREE.IcosahedronGeometry((size / 2) * 0.85, detail);
    const base = g.attributes.position.array.slice(); // 원래 위치 저장
    return { geometry: g, base };
  }, [size, detail]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.6; // 꿀렁이는 속도
    const p = geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], y = base[i + 1], z = base[i + 2];
      const len = Math.hypot(x, y, z);
      const nx = x / len, ny = y / len, nz = z / len; // 방향만

      // 큰 물결 + 작은 물결 섞기
      const n =
        Math.sin(nx * 3 + t) * Math.sin(ny * 4 + t * 1.3) * Math.sin(nz * 3.5 - t * 0.8) +
        0.5 * Math.sin(nx * 7 - t * 1.7 + ny * 5);

      const k = 1 + 0.18 * n; // 바깥으로 밀거나 안으로 당기는 정도
      p[i] = x * k;
      p[i + 1] = y * k;
      p[i + 2] = z * k;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals(); // 모양 바뀐 만큼 빛 받는 방향도 다시 계산
  });

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}