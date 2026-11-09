export const TEST_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r169/examples/models/gltf/Flamingo.glb';

export const OBJECTS = [
  { id: 'o1', type: 'bust', 
    spin: false, x: -1.8, size: 3.8, rotY: 0,  
    title: 'Intro Synth', 
    desc: 'TRACK 01 설명 들어갈 자리', 
    audio: '/audio/intro_synth.mp3' 
  },
  { id: 'o2', type: 'blob', 
    x: 2.4,  size: 3.6, rotY: -0.8,
    title: 'Verse Drums', 
    desc: 'TRACK 02 설명 들어갈 자리', 
    audio: '/audio/verse_drums.mp3' 
  },
  { id: 'o3', type: 'balloons', 
    spin: false, cols: 6, rows: 4, color: '#ffffff',
    x: -1.8, size: 3.0, rotY: 0,  
    title: 'Verse Synth', 
    desc: 'TRACK 03 설명 들어갈 자리', 
    audio: '/audio/verse_synth.mp3' 
  },
  { id: 'o4', type: 'splash', 
    spin: false, color: '#5aa8ff',
    x: 2.6,  size: 2.4, rotY: 0, 
    title: 'Chorus Drums', 
    desc: 'TRACK 04 설명 들어갈 자리', 
    audio: '/audio/chorus_drums.mp3' 
  },
  { id: 'o5', type: 'bars', 
    spin: false, x: -2.4, size: 3.4, rotY: 10,  
    title: 'Chorus Synth', 
    desc: 'TRACK 05 설명 들어갈 자리', 
    audio: '/audio/chorus_synth.mp3' 
  },
  { id: 'o6', type: 'pixels', 
    seed: 'o4', // 예전 o4 픽셀 무늬 그대로 쓰기
    x: 1.8, size: 2.4, rotY: -2.0,
    title: 'FX', 
    desc: 'TRACK 06 설명 들어갈 자리', 
    audio: '/audio/fx.mp3' 
  },
  { id: 'o7', type: 'wave',
    spin: false, x: -2.3, size: 4.0, rotY: -0.5,
    title: 'Bridge Drums', 
    desc: 'TRACK 07 설명 들어갈 자리', 
    audio: '/audio/bridge_drums.mp3' 
  },
  { id: 'o8', type: 'wire', 
    shape: 'ico',
    x: 2.0, size: 4.0, rotY: 0,
    title: 'Bridge Synth', 
    desc: 'TRACK 08 설명 들어갈 자리', 
    audio: '/audio/track01.mp3' 
  },
  { id: 'o9', type: 'morph',
    x: -2.2, size: 3.2, rotY: 0,
    title: 'Suno Vocal', 
    desc: 'TRACK 09 설명 들어갈 자리', 
    audio: '/audio/suno_vocal.mp3' 
  },
  { id: 'o10', type: 'swarm', 
    // spin: false, 
    x: 2.5, size: 3.8, rotY: 0,
    title: 'Main Vocal', 
    desc: 'TRACK 10 설명 들어갈 자리', 
    audio: '/audio/main_vocal.mp3' 
  },
];