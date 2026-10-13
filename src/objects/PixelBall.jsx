import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { makeRandom } from './random';

// 픽셀 구 : grid = 한 줄에 칸 수 (작을수록 도트가 큼)
export default function PixelBall({ size = 2, grid = 15, color = '#e6e6e6', seed }) {
  const texture = useMemo(() => {
    const rand = makeRandom(seed);
    const c = document.createElement('canvas');
    c.width = c.height = grid;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;

    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const dx = ((x + 0.5) / grid) * 2 - 1;
        const dy = ((y + 0.5) / grid) * 2 - 1;
        const d = Math.sqrt(dx * dx + dy * dy); // 가운데 0 ~ 가장자리 1
        if (d > 1) continue;
        if (rand() > 0.25 + 0.6 * d * d) continue; // 가장자리일수록 빽빽
        ctx.globalAlpha = 0.2 + 0.8 * rand() * (0.4 + 0.6 * d); // 가장자리일수록 진함
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter; // 확대해도 도트가 번지지 않고 각지게
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  }, [grid, color, seed]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}