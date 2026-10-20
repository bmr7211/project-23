import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Bgm.css';

const BGM_OFF = ['/project', '/album'];

export default function Bgm() {
  const audioRef = useRef(null);
  const startedRef = useRef(false); // 입장 시 클릭을 했는지
  const [gate, setGate] = useState('show');

  const { pathname } = useLocation();
    const bgmOff = BGM_OFF.some((p) => pathname.startsWith(p));

  // 입장 화면 클릭: 음악 시작 + 화면 사라짐
  const enter = () => {
    startedRef.current = true;
    const a = audioRef.current;
    a.volume = 0.5;
    if (!bgmOff) a.play().catch(() => {});
    setGate('fading');
    setTimeout(() => setGate('gone'), 600);
  };

  // Project 열리면 멈춤, 닫히면 이어서 재생
  useEffect(() => {
    const a = audioRef.current;
    if (bgmOff) a.pause();
    else if (startedRef.current) a.play().catch(() => {});
  }, [bgmOff]);

  return (
    <>
      <audio ref={audioRef} src="/audio/audio_23g.mp3" loop preload="auto" />
      {gate !== 'gone' && (
        <div className={`intro ${gate === 'fading' ? 'is-fading' : ''}`} onClick={enter}>
          <p className="intro-title">project-23</p>
        </div>
      )}
    </>
  );
}