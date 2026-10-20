import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import { MIX } from '../data/mix';
import * as THREE from 'three';

// 공간 크기: 가로(팬) W, 세로(음역대) H, 깊이(볼륨) D
export const W = 6.0, H = 3.8, D = 2;
const F_MIN = 20, F_MAX = 20000;

// 값 → 위치 변환 (3단계에서 악기 놓을 때도 씀)
export const panToX = (pan) => (pan * W) / 2;
export const freqToY = (f) =>
  ((Math.log10(f) - Math.log10(F_MIN)) / (Math.log10(F_MAX) - Math.log10(F_MIN)) - 0.5) * H;
export const volToZ = (vol) => (vol - 0.5) * D;

const COLOR = '#ffffff';
const GRID = [100, 1000, 10000];
const hz = (f) => (f >= 1000 ? `${f / 1000}kHz` : `${f}Hz`);

// 가장자리가 흐린 흰 원 그림 (악기들이 같이 씀, 한 번만 만듦)
let softTex = null;
function getSoftTexture() {
  if (softTex) return softTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  softTex = new THREE.CanvasTexture(c);
  softTex.colorSpace = THREE.SRGBColorSpace;
  return softTex;
}

// 악기 하나: 음역대만큼 세로로 늘린 흐릿한 덩어리
function Instrument({ name, pan, low, high, vol, width, color, index }) {
  const groupRef = useRef();
  const blobRef = useRef();

  const top = freqToY(high);
  const bottom = freqToY(low);
  const h = Math.max(top - bottom, 0.2) * 1.25; // 가장자리가 흐려지는 만큼 조금 크게
  const w = width ?? (0.3 + 0.3 * vol);
  const x = panToX(pan);
  const y = (top + bottom) / 2;
  const z = volToZ(vol);
  const phase = index * 1.7; // 악기마다 박자 엇갈리게

  // 천천히 떠다니고 숨 쉬듯 커졌다 작아지기
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    groupRef.current.position.y = y + Math.sin(t * 0.6 + phase) * 0.05;
    groupRef.current.position.x = x + Math.sin(t * 0.4 + phase * 1.3) * 0.03;
    const k = 1 + Math.sin(t * 0.9 + phase) * 0.05;
    blobRef.current.scale.set(w * k, h * k, 1);
  });

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <sprite ref={blobRef} scale={[w, h, 1]}>
        <spriteMaterial
          map={getSoftTexture()} color={color}
          transparent opacity={0.85} depthWrite={false}
        />
      </sprite>
      <Text position={[w * 0.35 + 0.06, 0, 0]} anchorX="left" fontSize={0.09} color={color}>
        {name}
      </Text>
    </group>
  );
}

export default function MixSpace() {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), []);

  return (
    <group>
        {/* 상자 테두리 */}
        <lineSegments geometry={edges}>
            <lineBasicMaterial color={COLOR} transparent opacity={0.55} />
        </lineSegments>

        {/* 뒷벽: 음역대 가로선 + 라벨 */}
        {GRID.map((f) => (
            <group key={f} position={[0, freqToY(f), -D / 2]}>
            <Line points={[[-W / 2, 0, 0], [W / 2, 0, 0]]} color={COLOR} transparent opacity={0.15} />
            <Text position={[-W / 2 - 0.1, 0, 0]} anchorX="right" fontSize={0.12} color={COLOR}>
                {hz(f)}
            </Text>
            </group>
        ))}

        {/* 뒷벽: 가운데(팬 0) 세로선 */}
        <Line points={[[0, -H / 2, -D / 2], [0, H / 2, -D / 2]]} color={COLOR} transparent opacity={0.15} />

        {/* 바닥 앞: L / R */}
        {/* <Text position={[-W / 2, -H / 2 - 0.2, D / 2]} anchorX="left" fontSize={0.14} color={COLOR}>L</Text>
        <Text position={[W / 2, -H / 2 - 0.2, D / 2]} anchorX="right" fontSize={0.14} color={COLOR}>R</Text> */}

        {/* 악기들 */}
        {MIX.map((m, i) => (
            <Instrument key={m.name} index={i} {...m} />
        ))}
    </group>
  );
}