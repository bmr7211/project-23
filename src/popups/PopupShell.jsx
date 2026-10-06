import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PopupShell.css';
import LeatherBg from '../components/LeatherBg';

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
    };
  }, []);

  return (
    <div className="popup-backdrop" onClick={close}>
      <div
        className={`popup-panel ${bare ? 'is-bare' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {!bare && leather != null && <LeatherBg index={leather} />}
        <button className="popup-close" onClick={close} aria-label="닫기">x</button>
        <div className="popup-content">{children}</div>
      </div>
    </div>
  );
}