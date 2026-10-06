import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home00 from './components/Home00';
import PopupShell from './popups/PopupShell';
import Bgm from './components/Bgm.jsx';

const Album01 = lazy(() => import('./popups/Album01'));
const Project02  = lazy(() => import('./popups/Project02'));
const Location03 = lazy(() => import('./popups/Location03'));
const Lookbook04 = lazy(() => import('./popups/Lookbook04'));
const Archive05 = lazy(() => import('./popups/Archive05'));

const popup = (Comp, leather, bare = false) => (
  <PopupShell leather={leather} bare={bare}>
    <Suspense fallback={null}><Comp /></Suspense>
  </PopupShell>
);

export default function App() {
  const { pathname } = useLocation();
  const popupOpen = pathname !== '/';

  return (
    <>
      {/* 런웨이는 언마운트 X */}
      <Home00 paused={popupOpen} />

      <Bgm/>
      <Routes>
        <Route path="/" element={null} />
        <Route path="/album" element={popup(Album01, 0)} />
        <Route path="/project" element={popup(Project02, 1)} />
        <Route path="/location/*" element={popup(Location03, null)} />
        <Route path="/lookbook/*" element={popup(Lookbook04, 3)} />
        <Route path="/archive/*" element={popup(Archive05, 4, true)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}