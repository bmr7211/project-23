import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 물결 선 판: rows = 선 줄 수, cols = 한 줄의 점 수(많을수록 매끈)
export default function Wave({ size = 2, rows = 50, cols = 100, color = '#e8ecf2', tilt = 0.6 }) {
  // 줄마다 선 하나씩 만들기 (앞줄일수록 진하게)
  const lines = useMemo(() => Array.from({ length: rows }, (_, r) => {
    const pos = new Float32Array(cols * 3);
    const z = -size / 2 + (r / (rows - 1)) * size;
    for (let c = 0; c < cols; c++) {
      pos[c * 3] = -size / 2 + (c / (cols - 1)) * size; // x: 왼쪽 → 오른쪽
      pos[c * 3 + 2] = z; // z: 이 줄의 앞뒤 위치
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.3 + 0.7 * (r / (rows - 1)),
    });
    const line = new THREE.Line(g, m);
    line.frustumCulled = false; // 물결로 움직여도 화면 밖 판정에 잘리지 않게
    return line;
  }), [size, rows, cols, color]);

  useEffect(() => () => lines.forEach((l) => { l.geometry.dispose(); l.material.dispose(); }), [lines]);

  // 매 프레임 높이(y) 다시 계산
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const amp = size * 0.12;   // 물결 높이
    const width = size * 0.28; // 가운데 솟은 부분 폭
    lines.forEach((l, r) => {
      const p = l.geometry.attributes.position.array;
      for (let c = 0; c < cols; c++) {
        const x = p[c * 3];
        const u = x / size;
        const env = Math.exp(-((x / width) ** 2)); // 가운데 높고 양옆 잔잔하게
        const wave = 1 + 0.6 * Math.sin(u * 12 + t * 1.2 + r * 0.5)
                       + 0.4 * Math.sin(u * 29 - t * 0.9 + r * 1.3);
        p[c * 3 + 1] = amp * env * wave;
      }
      l.geometry.attributes.position.needsUpdate = true;
    });
  });

  return (
    <group rotation={[tilt, 0, 0]}>
      {lines.map((l, i) => <primitive key={i} object={l} />)}
    </group>
  );
}