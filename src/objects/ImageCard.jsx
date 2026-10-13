import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// 사진 카드 : 사진 비율 그대로, 긴 쪽 길이 = size
export default function ImageCard({ size = 2, src }) {
  const texture = useTexture(src, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });
  const { width, height } = texture.image;
  const k = size / Math.max(width, height);

  return (
    <mesh>
      <planeGeometry args={[width * k, height * k]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}