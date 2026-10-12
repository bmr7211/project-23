import { useNavigate } from 'react-router-dom';
import Stage from './Stage.jsx';
import { panelRect } from '../lib/panel.js';

export default function Home({ paused = false }) {
  const navigate = useNavigate();
  return <Stage 
  mode="pigment" loopSeconds={12.9} paused={paused} 
  getPanel={panelRect} onSelect={(c) => navigate(c.href)} />;
}