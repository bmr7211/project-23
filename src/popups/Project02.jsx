import { useState } from 'react';
import { project } from '../data/project';
import './Project02.css';

export default function Project02() {
  const { videoId, thumb } = project;
  const [playing, setPlaying] = useState(false);

  const ytThumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const embedSrc =
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    `?autoplay=1&rel=0&playsinline=1`;

  // 재생 화면
  if (playing) {
    return (
      <div className="project">
        <iframe
          className="project-player"
          src={embedSrc}
          title="23 Grams project"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  // 썸네일 화면
  return (
    <div className="project">
      <button
        className="project-thumb"
        aria-label="영상 재생"
        onClick={() => setPlaying(true)}
      >
        <img
          src={thumb ?? ytThumb}
          alt=""
          onError={(e) => {
            const fallback = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
          }}
        />
      </button>
    </div>
  );
}