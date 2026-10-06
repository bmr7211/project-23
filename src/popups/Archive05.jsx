import { forwardRef, useEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { PAGES } from '../data/archive';
import { panelRect } from '../lib/panel.js';
import './Archive05.css';

const FLIP_MS = 700;
const LIFT = 0.3;

const Page = forwardRef(function Page({ src, index }, ref) {
  return (
    <div ref={ref} className="mag-page">
      <img src={src} alt={`Archive ${index}쪽`} draggable={false} />
    </div>
  );
});

function nextIndex(cur, dir, count) {
  if (dir > 0) return Math.min(count - 1, cur === 0 ? 1 : cur + 2);
  return Math.max(0, cur <= 1 ? 0 : cur - 2);
}

function shiftFor(index, count) {
  if (index === 0) return -1;
  if (index >= count - 1) return 1;
  return 0;
}

function curlFlip(flip, dir, corner) {
  if (flip.getState() !== 'read') return false;

  const cur = flip.getCurrentPageIndex();
  if (dir > 0 && cur >= flip.getPageCount() - 1) return false;
  if (dir < 0 && cur <= 0) return false;

  const ctrl = flip.getFlipController();
  const r = flip.getRender().getRect();
  const top = corner === 'top';

  const y0 = r.top + (top ? 1 : r.height - 1);
  const xs = dir > 0 ? r.left + r.width - 1 : r.left + 1;
  const xe = dir > 0 ? r.left + 2 : r.left + r.width - 2;
  const lift = r.height * LIFT * (top ? 1 : -1);

  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / FLIP_MS);
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    ctrl.fold({
      x: xs + (xe - xs) * e,
      y: y0 + lift * Math.sin(Math.PI * e),
    });
    if (t < 1) requestAnimationFrame(step);
    else ctrl.stopMove();
  };
  requestAnimationFrame(step);
  return true;
}

export default function Archive05() {
  // 창 크기: 팝업 사각형(panelRect)을 기억해두고, 창이 바뀌면 다시 계산
  const [panel, setPanel] = useState(() => panelRect());
  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setPanel(panelRect()), 200); // 다 줄이고 0.2초 뒤에 한 번만
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
    };
  }, []);

  const pageW = Math.round(panel.width / 2); // 펼쳤을 때 두 장 = 팝업 너비
  const pageH = Math.round(panel.height); // 팝업 높이 그대로

  const bookRef = useRef(null);
  const pageRef = useRef(0); // 지금 보는 페이지
  const [shift, setShift] = useState(-1);

  // 넘기기 공통 함수 (클릭·키보드 둘 다 이걸 씀)
  const turn = (dir, corner) => {
    const flip = bookRef.current?.pageFlip();
    if (!flip) return;
    const cur = flip.getCurrentPageIndex();
    if (curlFlip(flip, dir, corner)) {
      const count = flip.getPageCount();
      setShift(shiftFor(nextIndex(cur, dir, count), count));
    }
  };

  const onClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dir = e.clientX < r.left + r.width / 2 ? -1 : 1;
    const corner = e.clientY < r.top + r.height / 2 ? 'top' : 'bottom';
    turn(dir, corner);
  };

  // ② 키보드 화살표
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') turn(1, 'bottom');
      if (e.key === 'ArrowLeft') turn(-1, 'bottom');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="archive">
      <div
        className="mag"
        onClick={onClick}
        style={{
          transform: `translateX(${(shift * pageW) / 2}px)`,
          transition: `transform ${FLIP_MS}ms cubic-bezier(0.45, 0, 0.55, 1)`,
        }}
      >
        <HTMLFlipBook
          key={`${pageW}x${pageH}`}
          startPage={pageRef.current}
          ref={bookRef}
          width={pageW}
          height={pageH}
          size="fixed"
          showCover
          usePortrait={false}
          useMouseEvents={false}
          drawShadow
          maxShadowOpacity={0.5}
          flippingTime={FLIP_MS}
          onInit={() => {
            const f = bookRef.current.pageFlip();
            f.getPage(0).setDensity('soft');
            f.getPage(f.getPageCount() - 1).setDensity('soft');
          }}
          onFlip={(e) => {
            pageRef.current = e.data;
            const count = bookRef.current.pageFlip().getPageCount();
            setShift(shiftFor(e.data, count));
          }}
        >
          {PAGES.map((src, i) => (
            <Page key={i} src={src} index={i} />
          ))}
        </HTMLFlipBook>
      </div>
    </main>
  );
}

/*
src
 - components
   Home00.jsx
   Album01.jsx
   Project02.jsx
   Location03.jsx
   Lookbook04.jsx
   Archive05.jsx
   Stage.css
   Stage.jsx
   LeatherBg.jsx
 - lib
   stage23.js
 App.jsx
 index.css
 main.jsx
*/