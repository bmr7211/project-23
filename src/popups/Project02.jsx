import { Link } from 'react-router-dom';
import LeatherBg from '../components/LeatherBg.jsx';

export default function Project02() {
  return (
    <>
    <LeatherBg index={1} />
    <main style={{ /*minHeight: '100vh', background: '#0c0c0d',*/ 
                height: '100%', color: '#f2efea', 
                padding: '28px 32px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        <p style={{ fontSize: 13, letterSpacing: '.18em', fontWeight: 500 }}></p>
        <h1 style={{ fontSize: 260, fontWeight: 300, lineHeight: .8, margin: '80px 0' }}></h1>
        <Link to="/" style={{ color: '#f2efea', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 }}></Link>
    </main>
    </>
  );
}