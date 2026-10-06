import { useLayoutEffect, useRef } from 'react';
import { mountLeather, CHARS } from '../lib/stage23.js';

export default function LeatherBg({ index }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const leather = mountLeather(ref.current, { index });
    return () => leather.destroy();
  }, [index]);
  return (
    <div
      ref={ref}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    />
  );
}