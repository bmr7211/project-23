import { useState } from "react";
import { looks } from "../data/looks";
import "./Lookbook04.css";

export default function Lookbook04() {
  const [activeLook, setActiveLook] = useState(null);

  // 상세 화면
  if (activeLook) {
    return (
      <div className="lookbook-detail">
        <button className="lookbook-back" onClick={() => setActiveLook(null)}>
          Back
        </button>
        <div className="lookbook-detail-grid">
          {activeLook.photos.map((src, i) => (
            <img key={i} src={src} alt={`Look ${activeLook.id} - ${i + 1}`} />
          ))}
        </div>
      </div>
    );
  }

  // 5장 그리드 (1단계 그대로)
  return (
    <div className="lookbook-grid">
      {looks.map((look) => (
        <button
          key={look.id}
          className="lookbook-thumb"
          onClick={() => setActiveLook(look)}
        >
          <img src={look.thumb} alt={`Look ${look.id}`} />
        </button>
      ))}
    </div>
  );
}