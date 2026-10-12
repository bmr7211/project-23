import { useLayoutEffect, useRef } from 'react';

const DURATION = 1400; // 전체 시간 (ms)
const OUT_DURATION = 1600; // 빠져나올 때 시간 (ms)
const MAX_ZOOM = 40; // 지구가 최대 몇 배까지 커지는지
const SWIRL = 18; // 소용돌이 회전 각도 (도)
const OPEN_AT = 0.45; // 전체 중 언제부터 사진 창이 열리는지 (0~1)

const easeIn = (t) => t * t * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));

// dir: 'in' = 빨려들어가기, 'out' = 빠져나오기
export default function Dive({ x, y, earthOrigin, photo, earthRef, onDone, dir = 'in' }) {
  const photoRef = useRef(null);

  useLayoutEffect(() => {
    const earth = earthRef.current;
    const ph = photoRef.current;
    const box = ph.parentElement.getBoundingClientRect();
    const R = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
    const duration = dir === 'out' ? OUT_DURATION : DURATION;

    earth.style.transform = '';
    const base = getComputedStyle(earth).transform;
    const baseT = base === 'none' ? '' : base;

    earth.style.transformOrigin = earthOrigin;
    ph.style.transformOrigin = `${x}px ${y}px`;

    const t0 = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const t = dir === 'out' ? 1 - p : p; // 빠져나올 땐 거꾸로

      const k = easeIn(t);
      earth.style.transform = `${baseT} rotate(${k * SWIRL}deg) scale(${Math.pow(MAX_ZOOM, k)})`;
      earth.style.filter = `blur(${k * k * 14}px) brightness(${1 - k * 0.7})`;

      const o = seg(t, OPEN_AT, 1);
      ph.style.clipPath = `circle(${easeInOut(o) * R}px at ${x}px ${y}px)`;

      const land = 1 - easeOut(o);
      ph.style.transform = `rotate(${-land * SWIRL}deg) scale(${1 + land * 1.2})`;
      ph.style.filter = `blur(${land * 10}px)`;

      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        if (dir === 'out') {
          // 지구를 CSS 원래 상태로 되돌리기
          earth.style.transform = '';
          earth.style.filter = '';
        }
        onDone?.();
      }
    };
    step(t0); // 첫 화면을 바로 그려서 깜빡임 방지
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <img ref={photoRef} className="loc-dive" src={photo} alt="" draggable={false} />;
}