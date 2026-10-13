import { useMemo } from 'react';

// 점으로 만든 구 (Album 화면 + 트랙 페이지 같이 씀)
export default function PointSphere({ size = 2, count = 4000 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const r = size / 2;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const ring = Math.sqrt(1 - y * y);
      const th = golden * i;
      const jitter = r * (0.97 + Math.random() * 0.06);
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