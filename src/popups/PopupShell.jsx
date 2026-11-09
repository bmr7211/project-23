import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { nav } from '../lib/panel.js';
import './PopupShell.css';

const LEATHERS = [
  '/leathers/leather_album.png',
  '/leathers/leather_project.png',
  '/leathers/leather_location.png', 
  '/leathers/leather_lookbook.png',
  '/leathers/leather_archive.png',
];

export default function PopupShell({ leather, bare, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // 사이트 안에서 클릭해서 왔으면 뒤로가기, 주소로 바로 들어왔으면 홈으로
  const close = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/', { replace: true });
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      nav.fromStage = false;
    };
  }, []);

  const direct = !nav.fromStage;
  const bg = direct && leather != null && !bare
    ? { backgroundImage: `url(${LEATHERS[leather]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <div className="popup-backdrop" onClick={close}>
      <div
        className={`popup-panel ${bare ? 'is-bare' : ''}`}
        style={bg}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="popup-close" onClick={close} aria-label="닫기"></button>
        <div className="popup-content">{children}</div>
      </div>
    </div>
  );
}