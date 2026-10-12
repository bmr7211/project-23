import { forwardRef, useEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { PAGES } from '../data/archive';
import { panelRect } from '../lib/panel.js';
import './Archive05.css';

const FLIP_MS = 700;
const LIFT = 0.3;

const LAYERS = 8; // 종이 단면 겹 수 (= 최대 두께 px)

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

// t: 0~1 (그쪽에 쌓인 종이 비율), side: 'left' | 'right'
function stackShadow(t, side) {
  const dir = side === 'left' ? -1 : 1;
  const out = [];
  for (let i = 1; i <= LAYERS; i++) {
    const k = i * t;
    const color = i === LAYERS ? '#b9b1a4' : i % 2 ? '#f1ece4' : '#d9d2c7';
    out.push(`${dir * k}px ${k * 0.6}px 0 ${color}`);
  }
  return out.join(', ');
}

// rafRef: 팝업이 닫힐 때 넘기는 애니메이션을 멈추려고 받아둠
function curlFlip(flip, dir, corner, rafRef) {
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
    if (t < 1) rafRef.current = requestAnimationFrame(step);
    else ctrl.stopMove();
  };
  rafRef.current = requestAnimationFrame(step);
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
  const [idx, setIdx] = useState(pageRef.current);
  const curlRaf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(curlRaf.current), []);

  // 넘기기 공통 함수 (클릭·키보드 둘 다 이걸 씀)
  const turn = (dir, corner) => {
    const flip = bookRef.current?.pageFlip();
    if (!flip) return;
    const cur = flip.getCurrentPageIndex();
    if (curlFlip(flip, dir, corner, curlRaf)) {
      const count = flip.getPageCount();
      const next = nextIndex(cur, dir, count);
      setShift(shiftFor(next, count));
      setIdx(next);
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

  let leftT, rightT;
  if (shift === -1) {        // 앞표지: 종이가 전부 오른쪽
    leftT = 0;
    rightT = 1;
  } else if (shift === 1) {  // 뒤표지: 종이가 전부 왼쪽
    leftT = 1;
    rightT = 0;
  } else {                   // 펼침: 양쪽 다 최소 0.2 + 넘긴 만큼
    const r = idx / (PAGES.length - 1);
    leftT = 0.2 + r * 0.6;
    rightT = 0.2 + (1 - r) * 0.6;
  }
    // 직전 shift 기억 (렌더가 끝난 뒤에 갱신됨)
  const prevShift = useRef(shift);
  useEffect(() => {
    prevShift.current = shift;
  }, [shift]);

  // 덮인 상태에서 펼칠 때, 비어 있던 쪽은 넘김이 끝난 뒤에 나타나게
  const leftAppear = prevShift.current === -1 && shift !== -1;  // 앞표지 → 펼침
  const rightAppear = prevShift.current === 1 && shift !== 1;   // 뒤표지 → 펼침

  const stackTransition = (appear) =>
    appear
      ? `box-shadow 300ms ease-out ${FLIP_MS}ms`
      : `box-shadow ${FLIP_MS}ms cubic-bezier(0.45, 0, 0.55, 1)`;

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
      <div
        className="mag-stack"
        style={{ left: 0, width: pageW, height: pageH, boxShadow: stackShadow(leftT, 'left'), transition: stackTransition(leftAppear) }}
      />
      <div
        className="mag-stack"
        style={{ left: pageW, width: pageW, height: pageH, boxShadow: stackShadow(rightT, 'right'), transition: stackTransition(rightAppear) }}
      />
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
            setIdx(e.data);
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