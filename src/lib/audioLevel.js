import { useCallback, useEffect, useRef } from 'react';

// 사이트 전체에서 AudioContext는 하나만 씀
let ctx = null;
// audio 요소마다 analyser 하나 (같은 요소를 두 번 연결하면 에러가 나서 기억해둠)
const analysers = new WeakMap();

function getAnalyser(audio) {
  if (analysers.has(audio)) return analysers.get(audio);
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  analyser.connect(ctx.destination); // 스피커로도 계속 나가게
  const entry = { analyser, data: new Uint8Array(analyser.fftSize) };
  analysers.set(audio, entry);
  return entry;
}

// audioRef의 현재 소리 크기(0~1 정도)를 읽는 함수를 돌려줌 → useFrame 안에서 매 프레임 호출
export function useAudioLevel(audioRef) {
  const entryRef = useRef(null);
  const attachedRef = useRef(null);

  const onPlay = useCallback(() => {
    const audio = attachedRef.current;
    if (!audio) return;
    try {
      entryRef.current = getAnalyser(audio);
      if (ctx.state === 'suspended') ctx.resume();
    } catch {
      // 연결 실패해도 음악 재생은 그대로
    }
  }, []);

  // 화면에서 빠질 때 이벤트 정리
  useEffect(() => () => attachedRef.current?.removeEventListener('play', onPlay), [onPlay]);

  return useCallback(() => {
    const audio = audioRef?.current;
    if (!audio) return 0;
    // audio 요소를 처음 만나면 재생 시작 순간에 연결되도록 등록
    if (attachedRef.current !== audio) {
      attachedRef.current?.removeEventListener('play', onPlay);
      attachedRef.current = audio;
      audio.addEventListener('play', onPlay);
      if (!audio.paused) onPlay();
    }
    const e = entryRef.current;
    if (!e || audio.paused) return 0;
    e.analyser.getByteTimeDomainData(e.data);
    let sum = 0;
    for (let i = 0; i < e.data.length; i++) {
      const v = (e.data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / e.data.length);
  }, [audioRef, onPlay]);
}
