import { useEffect, useRef } from "react";
import "./RunwayStage.css";

// 나중에 사람별 파일로 바꾸면 됨
const WALKERS = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  src: "/walkers/human1_walk_loop.webm",
}));

const TRAVERSE_SEC = 30; // 한 명이 화면을 가로지르는 시간

// 진행도(0~1) → 위치·크기 (왼쪽 뒤: 작고 위, 오른쪽 앞: 크고 아래)
function placeAt(p) {
  const x = -10 + p * 120;      // vw
  const bottom = 30 - p * 28;   // vh
  const scale = 0.4 + p * 0.9;
  return { x, bottom, scale };
}

export default function RunwayStage() {
  const refs = useRef([]);

  useEffect(() => {
    let raf;
    const start = performance.now();

    const tick = (now) => {
      const t = (now - start) / 1000;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const p = ((t / TRAVERSE_SEC) + i / WALKERS.length) % 1;
        const { x, bottom, scale } = placeAt(p);
        el.style.transform = `translateX(${x}vw) scale(${scale})`;
        el.style.bottom = `${bottom}vh`;
        el.style.zIndex = Math.round(p * 100); // 가까운 사람이 앞에
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="stage">
      {WALKERS.map((w, i) => (
        <div key={w.id} className="walker" ref={(el) => (refs.current[i] = el)}>
          <video src={w.src} autoPlay muted loop playsInline />
        </div>
      ))}
    </div>
  );
}