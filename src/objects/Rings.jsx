import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { makeRandom } from './random';

// 고리 여러 개: count = 고리 수
export default function Rings({ size = 2, count = 5, color = '#005de8', seed }) {
  // 고리마다 크기/기울기/도는 속도 (seed가 같으면 항상 같은 모양)
  const rings = useMemo(() => {
    const rand = makeRandom(seed);
    return Array.from({ length: count }, () => ({
      r: (size / 2) * (0.7 + 0.3 * rand()), // 반지름: 크기 조금씩 다르게
      tilt: [rand() * Math.PI, rand() * Math.PI, 0], // 처음 기울기
      speed: (0.15 + 0.35 * rand()) * (rand() < 0.5 ? -1 : 1), // 도는 속도·방향
    }));
  }, [size, count, seed]);

  const refs = useRef([]);

  // 고리마다 자기 지름을 축으로 천천히 뒤집히기
  useFrame((_, dt) => {
    refs.current.forEach((m, i) => {
      if (m) m.rotation.x += dt * rings[i].speed;
    });
  });

  return (
    <group>
      {rings.map((g, i) => (
        <group key={i} rotation={g.tilt}>
          <mesh ref={(el) => (refs.current[i] = el)}>
            <torusGeometry args={[g.r, size * 0.004, 6, 160]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}