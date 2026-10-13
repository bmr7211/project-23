import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import AlbumShape from './AlbumShape';
import './AlbumTrack.css';

const SIZE = 3; // 가운데 구 지름

// 천천히 돌리기
function Spin({ on = true, children }) {
  const ref = useRef();
  useFrame((_, dt) => { if (on) ref.current.rotation.y += dt * 0.2; });
  return <group ref={ref}>{children}</group>;
}

// 초 : 00:49 형식
const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function AlbumTrack({ track, onBack }) {
  const audioRef = useRef(null);
  const [time, setTime] = useState(0);
  const [hover, setHover] = useState(false);

  // 페이지 닫을 때 음악 끄기
  useEffect(() => () => audioRef.current?.pause(), []);

  // 구 클릭 : 재생/정지
  const toggle = () => {
    const a = audioRef.current;
    if (a.paused) a.play().catch(() => {}); // 파일 없으면 무시
    else a.pause();
  };

  const stop = () => {
    const a = audioRef.current;
    a.pause();
    a.currentTime = 0;
    setTime(0);
  };

  return (
    <section className="album-track" style={{ cursor: hover ? 'pointer' : 'default' }}>
        <div className="album-track-stage">
            {/* onPointerMissed : 구가 아닌 곳(배경)을 클릭하면 나가기 */}
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ alpha: true }} onPointerMissed={onBack}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 5, 6]} intensity={2} />     
            <Suspense fallback={null}>
                <Spin on={track.spin !== false}>
                    <AlbumShape o={{ ...track, size: SIZE }} />
                    {/* 클릭 판정용 투명 구 */}
                    <mesh
                    onClick={toggle}
                    onPointerOver={() => setHover(true)}
                    onPointerOut={() => setHover(false)}
                    >
                    <sphereGeometry args={[SIZE / 2, 16, 16]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                </Spin>
            </Suspense>
            </Canvas>
        </div>

      <p className="album-track-title">{track.title}</p>
      <span className="album-track-time">{fmt(time)}</span>

      <audio
        ref={audioRef}
        src={track.audio}
        preload="none"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      />
    </section>
  );
}