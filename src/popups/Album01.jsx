import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import * as THREE from 'three';
import AlbumShape from './AlbumShape';
import './Album01.css';
import { LYRICS, LYRICS_TITLE } from '../data/lyrics';
import { OBJECTS } from '../data/albumObjects';
import AlbumTrack from './AlbumTrack';
import MixSpace from '../objects/MixSpace';

const ANCHOR = { x: 0 }; // 가사 기준점 (가로 가운데)

// 오브제 사이 간격: 한 칸 갈 때마다 위로 GAP_Y, 뒤로 GAP_Z
const START_Y = -1, START_Z = 2;
const GAP_Y = 1, GAP_Z = 3;

const STEP_PX = 600; // 오브제 한 칸을 넘기는 데 필요한 휠 양 (작을수록 빠름)
const SWIPE_PX = 50; // 좌우로 이만큼 밀어야 페이지 넘김 (작을수록 민감)
const SPREAD = 0.3; // 퍼지는 정도 (0이면 퍼짐 없음, 클수록 많이 벌어짐)
const BEND = 0.7; // 경로 휘는 정도 (0이면 지금처럼 일직선)
const OBJ_SCALE = 0.6; // 오브제 전체 크기 배율 (1이면 원래 크기)

const MIX_LIFT = 1; // 믹싱 공간을 위로 올리는 양 (화면 가운데 맞추기)

// 스크롤
function ScrollDamper({ progress, onMix }) {
  const events = useThree((s) => s.events);
  const wasAtMix = useRef(false);
  useFrame((_, dt) => {
    const p = progress.current;
    const before = p.value;
    p.value = THREE.MathUtils.damp(p.value, p.target, 4, dt);
    if (Math.abs(p.value - before) > 1e-4) events.update?.();

    const atMix = p.value > OBJECTS.length - 0.05; // 마지막 칸에 거의 다 왔으면 도착
    if (atMix !== wasAtMix.current) {
      wasAtMix.current = atMix;
      onMix(atMix);
    }
  });
  return null;
}

// 구 i번 위치 (Item+가사 같이 씀)
function itemPosition(o, i, p, out) {
  const t = i - p;
  const spread = Math.exp(-t * SPREAD);
  const bend = t > 0 ? BEND * t * t : 0; // 멀수록 위로 더 올라가서 곡선이 됨
  return out.set(o.x * spread, START_Y + t * GAP_Y + bend, START_Z - t * GAP_Z);
}

// 오브제 하나: 스크롤 위치에 따라 매 프레임 자리 계산
function Item({ o, i, progress, onHover, onSelect }) {
  const ref = useRef();
  useFrame((_, dt) => {
    const t = i - progress.current.value;
    itemPosition(o, i, progress.current.value, ref.current.position);
    if (o.spin !== false) ref.current.rotation.y += dt * 0.15;
    ref.current.visible = t > -1.2;
  });
  return (
    <group ref={ref} rotation={[0, o.rotY, 0]} scale={OBJ_SCALE}>
      <AlbumShape o={o}  view="album" />
      {/* 마우스 판정용 투명 구 */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); onHover(o); }}
        onPointerOut={() => onHover((h) => (h?.id === o.id ? null : h))}
        onClick={(e) => { e.stopPropagation(); onSelect(o); }}
      >
        <sphereGeometry args={[o.size / 2, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// 믹싱 공간
function MixItem({ progress }) {
  const ref = useRef();
  const i = OBJECTS.length;
  useFrame(() => {
    const t = i - progress.current.value;
    itemPosition(ANCHOR, i, progress.current.value, ref.current.position);
    ref.current.visible = t > -1.2;
  });
  return (
    <group ref={ref}>
      <group position={[0, MIX_LIFT, 0]} rotation={[0, 0, 0]}>
        <MixSpace />
      </group>
    </group>
  );
}

export default function Album01() {
  const progress = useRef({ target: 0, value: 0 });
  const touchY = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [atMix, setAtMix] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const lastShown = useRef(null);
  if (hovered) lastShown.current = hovered;
  const shown = hovered ?? lastShown.current;

  const swipeX = useRef(0); // 이번 스와이프에서 민 양
  const swipeLock = useRef(false); // 한 번 넘겼으면 잠금
  const swipeTimer = useRef(null);

  const move = (dy) => {
    if (selected || lyricsOpen) return;
    const p = progress.current;
        p.target = THREE.MathUtils.clamp(p.target + dy / STEP_PX, 0, OBJECTS.length);
  };

  const swipe = (dx) => {
    if (selected) return;

    // 이벤트가 0.2초 동안 안 들어오면 스와이프 끝난 걸로 보고 초기화
    clearTimeout(swipeTimer.current);
    swipeTimer.current = setTimeout(() => {
      swipeX.current = 0;
      swipeLock.current = false;
    }, 200);

    if (swipeLock.current) return;
    swipeX.current += dx;

    if (swipeX.current > SWIPE_PX && atMix && !lyricsOpen) {
      setLyricsOpen(true);   // 오른쪽 → 왼쪽: 가사 페이지
      swipeLock.current = true;
    } else if (swipeX.current < -SWIPE_PX && lyricsOpen) {
      setLyricsOpen(false);  // 왼쪽 → 오른쪽: 믹싱 공간
      swipeLock.current = true;
    }
  };

  return (
    <main
      className="album"
      style={{ cursor: hovered ? 'pointer' : 'default' }}
      onWheel={(e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) swipe(e.deltaX);
        else move(-e.deltaY);
      }}
      onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
      onTouchMove={(e) => {
        const y = e.touches[0].clientY;
        move((y - touchY.current) * 2);
        touchY.current = y;
      }}
    >
      <div className={`album-slider ${lyricsOpen ? 'is-lyrics' : ''}`}>
        {/* 왼쪽 칸: 오브제 + 믹싱 공간 */}
        <section className="album-pane">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }} gl={{ alpha: true }} dpr={[1, 1.5]}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 5, 6]} intensity={2} />
            <ScrollDamper progress={progress} onMix={setAtMix} />
            <Suspense fallback={null}>
              {OBJECTS.map((o, i) => (
                <Item key={o.id} o={o} i={i} progress={progress} onHover={setHovered} onSelect={setSelected} />
              ))}
              <MixItem progress={progress} />
            </Suspense>
            <Preload all />
          </Canvas>

          <button
            className={`album-arrow ${atMix && !lyricsOpen ? 'is-on' : ''}`}
            onClick={() => setLyricsOpen(true)}
            aria-label="가사 보기"
          >→</button>

          <p className={`album-label ${hovered ? 'is-on' : ''}`}>
            <span className="album-label-artist">{shown?.artist}</span>
            <span>{shown?.title}</span>
          </p>
        </section>

        {/* 오른쪽 칸: 가사 페이지 */}
        <section className="album-pane album-lyrics-page">
          <button
            className={`album-arrow is-left ${lyricsOpen ? 'is-on' : ''}`}
            onClick={() => setLyricsOpen(false)}
            aria-label="믹싱 공간으로"
          >←</button>

          <h2 className="album-lyrics-title">{LYRICS_TITLE}</h2>
          <div className="album-lyrics-body">
            {LYRICS.map((s) => (
              <div className="album-lyrics-part" key={s.part}>
                <h3>{s.part}</h3>
                {s.lines.map((line, i) => <p key={i}>{line}</p>)}
              </div>
            ))}
          </div>
        </section>
      </div>

      {selected && <AlbumTrack track={selected} onBack={() => setSelected(null)} />}
    </main>
  );
}