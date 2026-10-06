import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Bgm.css';

export default function Bgm() {
  const audioRef = useRef(null);
  const startedRef = useRef(false); // 입장 시 클릭을 했는지
  const [gate, setGate] = useState('show');

  const { pathname } = useLocation();
  const onProject = pathname.startsWith('/project');

  // 입장 화면 클릭: 음악 시작 + 화면 사라짐
  const enter = () => {
    startedRef.current = true;
    const a = audioRef.current;
    a.volume = 0.5;
    if (!onProject) a.play().catch(() => {});
    setGate('fading');
    setTimeout(() => setGate('gone'), 600); // CSS 페이드 시간과 맞춤
  };

  // Project 열리면 멈춤, 닫히면 이어서 재생
  useEffect(() => {
    const a = audioRef.current;
    if (onProject) a.pause();
    else if (startedRef.current) a.play().catch(() => {});
  }, [onProject]);

  return (
    <>
      <audio ref={audioRef} src="/audio/bgm.mp3" loop preload="auto" />
      {gate !== 'gone' && (
        <div className={`intro ${gate === 'fading' ? 'is-fading' : ''}`} onClick={enter}>
          <p className="intro-title">project-23</p>
        </div>
      )}
    </>
  );
}