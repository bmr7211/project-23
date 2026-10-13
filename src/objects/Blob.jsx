import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// 번진 원: colors = [가운데색, ..., 바깥색] (#rrggbb 형식)
export default function Blob({ size = 2, colors = ['#ff2a1a', '#ec5fa8', '#f3b6ff'] }) {
  const texture = useMemo(() => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    colors.forEach((col, i) => g.addColorStop((i / (colors.length - 1)) * 0.7, col));
    g.addColorStop(1, colors[colors.length - 1] + '00'); // 바깥색이 투명하게 사라짐
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [colors.join()]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}