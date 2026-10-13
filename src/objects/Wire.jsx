import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 고를 수 있는 모양 (r = 반지름)
const SHAPES = {
  ico:    (r) => new THREE.IcosahedronGeometry(r, 0), // 정이십면체
  octa:   (r) => new THREE.OctahedronGeometry(r, 0), // 정팔면체
  dodeca: (r) => new THREE.DodecahedronGeometry(r, 0), // 정십이면체
  cube:   (r) => new THREE.BoxGeometry(r * 1.2, r * 1.2, r * 1.2), // 정육면체
};

// 선 다면체: 바깥 큰 것 + 안쪽 작은 것
export default function Wire({ size = 2, shape = 'ico', color = '#e8ecf2' }) {
  const outerRef = useRef();
  const innerRef = useRef();

  const { outer, inner } = useMemo(() => {
    const make = SHAPES[shape] ?? SHAPES.ico;
    const g1 = make(size / 2);
    const g2 = make(size / 4);
    const outer = new THREE.EdgesGeometry(g1); // 면은 빼고 모서리 선만
    const inner = new THREE.EdgesGeometry(g2);
    g1.dispose();
    g2.dispose();
    return { outer, inner };
  }, [size, shape]);

  useEffect(() => () => { outer.dispose(); inner.dispose(); }, [outer, inner]);

  // 바깥은 천천히, 안쪽은 반대로 조금 빠르게
  useFrame((_, dt) => {
    outerRef.current.rotation.x += dt * 0.1;
    innerRef.current.rotation.x -= dt * 0.25;
    innerRef.current.rotation.z += dt * 0.15;
  });

  return (
    <group>
      <group ref={outerRef}>
        <lineSegments geometry={outer}>
          <lineBasicMaterial color={color} />
        </lineSegments>
        {/* 꼭짓점 점 */}
        <points geometry={outer}>
          <pointsMaterial color={color} size={size * 0.025} sizeAttenuation />
        </points>
      </group>
      <lineSegments ref={innerRef} geometry={inner}>
        <lineBasicMaterial color={color} transparent opacity={0.4} />
      </lineSegments>
    </group>
  );
}