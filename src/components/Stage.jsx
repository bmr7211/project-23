import { useEffect, useRef, useState } from 'react';
import { mount } from '../lib/stage23.js';
import './Stage.css';

const W = 1280, H = 720;

export default function Stage({
    mode = 'pigment',
    loopSeconds = 45,
    healSeconds = 2.5,
    debug = false,
    paused = false,
    getPanel = null,
    onSelect,
}) {
    const stageRef = useRef(null);
    const engineRef = useRef(null);

    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    const pausedRef = useRef(paused);
    pausedRef.current = paused;

    const [scale, setScale] = useState(1);

    useEffect(() => {
        const fit = () => setScale(Math.max(window.innerWidth / W, window.innerHeight / H));
        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, []);

    useEffect(() => {
        const engine = mount(stageRef.current, {
        mode, loopSeconds, healSeconds, debug, getPanel,
        paused: pausedRef.current,
        onSelect: (c) => {
            if (pausedRef.current) return;
            onSelectRef.current?.(c);
        },
        });
        engineRef.current = engine;
        return () => { engine.destroy(); engineRef.current = null; };
    }, [mode]);

    useEffect(() => {
        engineRef.current?.set({ loopSeconds, healSeconds, debug, });
    }, [loopSeconds, healSeconds, debug]);

    useEffect(() => {
        engineRef.current?.set({ paused });
    }, [paused]);

    return (
        <div className="viewport">
        <div ref={stageRef} className="stage" style={{ transform: `scale(${scale})` }}>
            <div data-zone className="zone" />
        </div>
        <div className="logo"></div>
        </div>
    );
}