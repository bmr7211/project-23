import { useEffect, useRef, useState } from "react";
import { locations } from "../data/locations";
import "./Location03.css";

const FLIGHT_TIME = 1200; // 비행 시간 (ms)
const TRAIL_LIFE = 400; // 선이 사라지는 시간 (ms)
const ARC = 0.35; // 아치 높이 (거리 대비 비율)

// 프롬프트에 있던 easeInOutCubic
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function Location03() {
  const [active, setActive] = useState(null);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const planeRef = useRef(null);
  const pointRefs = useRef({});
  const currentRef = useRef("corner");
  const angleRef = useRef(-135);
  const busyRef = useRef(false);
  const rafRef = useRef(0);

  // 위치 id --> 팝업 기준 px 좌표
  const getXY = (id) => {
    const root = rootRef.current.getBoundingClientRect();
    if (id === "corner") return { x: root.width - 40, y: root.height - 40 };
    const r = pointRefs.current[id].getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - root.left,
      y: r.top + r.height / 2 - root.top,
    };
  };

  // plane.svg는 앞코가 왼쪽 위(-135°)를 보고 있어서 +135°로 보정
  const placePlane = (x, y, angle) => {
    planeRef.current.style.transform =
      `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${angle + 135}deg)`;
  };

  // 캔버스 크기 맞추기 + 비행기 제자리에 두기
  useEffect(() => {
    const resize = () => {
      const root = rootRef.current;
      const c = canvasRef.current;
      const d = Math.min(window.devicePixelRatio || 1, 2);
      c.width = root.clientWidth * d;
      c.height = root.clientHeight * d;
      c.getContext("2d").setTransform(d, 0, 0, d, 0, 0);
      if (!busyRef.current) {
        const p = getXY(currentRef.current);
        placePlane(p.x, p.y, angleRef.current);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current); // 팝업 닫히면 애니메이션 정지
    };
  }, []);

  const drawTrail = (ctx, trail, now) => {
    const root = rootRef.current;
    ctx.clearRect(0, 0, root.clientWidth, root.clientHeight);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let i = 1; i < trail.length; i++) {
      const alpha = 1 - (now - trail[i].time) / TRAIL_LIFE; // 오래될수록 흐리게
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
  };

  const fly = (loc) => {
    if (busyRef.current || currentRef.current === loc.id) return;
    busyRef.current = true;
    setActive(null);

    const p0 = getXY(currentRef.current);
    const p2 = getXY(loc.id);

    // 아치를 만드는 제어점: 중간점에서 수직 방향으로 띄우기
    const dx = p2.x - p0.x;
    const dy = p2.y - p0.y;
    const dist = Math.hypot(dx, dy);
    let nx = -dy / dist;
    let ny = dx / dist;
    if (ny > 0) { nx = -nx; ny = -ny; } // 항상 위쪽으로 휘게
    const c = {
      x: (p0.x + p2.x) / 2 + nx * dist * ARC,
      y: (p0.y + p2.y) / 2 + ny * dist * ARC,
    };

    const ctx = canvasRef.current.getContext("2d");
    const trail = [];
    const start = performance.now();
    let arrived = false;

    const frame = (now) => {
      const raw = Math.min((now - start) / FLIGHT_TIME, 1);

      if (!arrived) {
        const t = ease(raw);
        const u = 1 - t;
        // 베지어 곡선 위의 위치
        const x = u * u * p0.x + 2 * u * t * c.x + t * t * p2.x;
        const y = u * u * p0.y + 2 * u * t * c.y + t * t * p2.y;
        // 진행 방향 (접선)
        const tx = 2 * u * (c.x - p0.x) + 2 * t * (p2.x - c.x);
        const ty = 2 * u * (c.y - p0.y) + 2 * t * (p2.y - c.y);
        const angle = (Math.atan2(ty, tx) * 180) / Math.PI;

        placePlane(x, y, angle);
        angleRef.current = angle;
        trail.push({ x, y, time: now });

        if (raw === 1) {
          arrived = true;
          currentRef.current = loc.id;
          setActive(loc);
        }
      }

      // 오래된 점 지우고 다시 그리기
      while (trail.length && now - trail[0].time > TRAIL_LIFE) trail.shift();
      drawTrail(ctx, trail, now);

      if (!arrived || trail.length) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        busyRef.current = false; // 선까지 다 사라지면 다음 클릭 가능
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  return (
    <div className="location" ref={rootRef}>
      <div className="earth">
        <img className="earth-img" src="public/locations/earth.jpg" alt="Earth" />
        {active && (
          <div className="card" key={active.id}>
            <p className="card-city">{active.label}</p>
            <h2 className="card-name">{active.member.name}</h2>
            {active.member.role && <p className="card-role">{active.member.role}</p>}

            <dl className="card-info">
              {active.member.email && (
                <div>
                  <dt>Email</dt>
                  <dd><a href={`mailto:${active.member.email}`}>{active.member.email}</a></dd>
                </div>
              )}
              {active.member.instagram && (
                <div>
                  <dt>Instagram</dt>
                  <dd>
                    <a
                      href={`https://instagram.com/${active.member.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {active.member.instagram}
                    </a>
                  </dd>
                </div>
              )}
              {active.member.phone && (
                <div>
                  <dt>Phone</dt>
                  <dd><a href={`tel:${active.member.phone}`}>{active.member.phone}</a></dd>
                </div>
              )}
            </dl>
          </div>
        )}
        {locations.map((loc) => (
          <button
            key={loc.id}
            ref={(el) => (pointRefs.current[loc.id] = el)}
            className="earth-point"
            style={{ left: `${loc.point.x}%`, top: `${loc.point.y}%` }}
            onClick={() => fly(loc)}
            aria-label={loc.label}
          >
            <span className="earth-point-dot" />
            <span className="earth-point-label">{loc.label}</span>
          </button>
        ))}
      </div>

      <canvas ref={canvasRef} className="flight-canvas" />
      <img ref={planeRef} className="plane" src="public/locations/usagi.svg" alt="" />
    </div>
  );
}