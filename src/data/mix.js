// 믹싱 공간 데이터
// pan: -1(왼쪽) ~ 0(가운데) ~ 1(오른쪽)
// low, high: 음역대 (Hz)
// vol: 0 ~ 1 (클수록 앞으로)
export const MIX = [
    { name: 'Kick', 
        pan: 0, low: 40, high: 120, vol: 0.9,  
        color: '#ff4a3d' 
    },
    { name: 'Bass', 
        pan: 0, low: 50, high: 400, vol: 0.85, 
        color: '#ff9a3d' 
    },
    { name: 'Snare', 
        pan: 0.05, low: 180, high: 5000, vol: 0.75, 
        color: '#f3e36b' 
    },
    { name: 'Hi-hat', 
        pan: 0.4, 
        low: 6000, high: 16000, vol: 0.5, 
        color: '#bff0ff' 
    },
    { name: 'Vocal', 
        pan: 0, low: 150, high: 8000, vol: 1.0, 
        color: '#ffffff'
    },
    { name: 'Guitar', 
        pan: -0.6, low: 100, high: 5000, vol: 0.6, 
        color: '#8fd18a' 
    },
    { name: 'Pad',
        pan: 0.6, low: 300, high: 6000, vol: 0.45, 
        color: '#b08cff' 
    },
];