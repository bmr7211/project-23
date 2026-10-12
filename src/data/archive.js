const IMG = Array.from({ length: 10 }, (_, i) =>
  `https://picsum.photos/seed/archive${i}/840/1188`
);

// 머리말
export const MAG = {
  title: '23 GRAMS',
  issue: 'ARCHIVE — ISSUE 01',
};

export const PAGES = [
  { // 앞표지
    type: 'cover',
    src: '/archive/walkers00.jpeg',
    issue: 'VOL.01 — 2026',
    script: '',
    lines: ['Process', 'Sketch & Code', 'Behind the Runway'],
  }, 
  { // 1쪽 확인용
    type: 'story',
    kicker: '01 — Sketch',
    title: 'Plano Geral',
    // script: 'process',
    body: [
      '스트리밍 플랫폼의 확대는 글로벌 아티스트들이 전 세계 팬들과 실시간으로 소통할 수 있는 커다란 인프라를 제공했습니다.',
      '패션 브랜드 간의 협업 프로젝트는 독창적인 굿즈와 비디오 캠페인을 통해 대중의 커다란 호응을 끌어냅니다.',
    ],
    src: '/archive/page01.jpg',
    caption: 'Runway sketch, first draft',
  },
  { // 2쪽 확인용
    type: 'photos',
    split: 0.6, // 위 사진이 60%, 아래 사진이 40%
    photos: [
      { src: '/archive/page02.jpg', caption: 'Fitting day, studio' },
      { src: '/archive/page02_1.jpg', caption: 'Lookbook test shot' },
    ],
  },
  { // 3쪽 확인용
    type: 'full',
    src: '/archive/page03.jpg',
    script: '',
    at: [58, 72], // 필기체 위치: [가로 %, 세로 %] (단어 가운데 기준)
    scriptSize: 22, // 필기체 크기 (안 적으면 20)
    caption: 'Backstage, 2026',
  },
  {
    type: 'text',
    kicker: '02 — Detail',
    title: 'Spirit',
    body: [
      // 왼쪽 단
      [
        '디지털 플랫폼을 채우는 비주얼 아트는 현대 패션과 음악, 그리고 영상의 영역을 유기적으로 연결하며 독창적인 크리에이티브 커뮤니티를 형성하고 있습니다. Fashion is not just about clothes; it is an expressive medium that reflects our personal identity and culture.',
        '최근의 트렌드는 스트릿웨어(Streetwear)의 편안함과 하이 패션(High fashion)의 정교함을 결합하여 완전히 새로운 스타일 스펙트럼을 제시합니다. 런웨이 위를 채우는 사운드트랙은 브랜드의 세계관을 완성하는 핵심 요소로 작동하고 있습니다. Music plays a crucial role in setting the tone for fashion shows, evoking powerful emotions from the audience.',
        '영상 미디어의 비약적인 발전은 스틸 컷 위주의 패션 화보를 넘어 라이브 스크리닝과 디지로그 룩북의 시대를 열었습니다. Visual storytelling has become the primary language for modern storytellers and content creators. 비디오 에디터들은 색보정과 비트 매칭을 활용하여 한 편의 감각적인 신세티크 영상을 완성합니다. 카메라는 단순히 장면을 담아내는 도구를 넘어 창작자의 감정과 철학을 전달하는 프레임입니다.',
        'Vintage aesthetics continue to inspire new generations, blending nostalgic moods with modern cutting-edge technologies. 레트로 사운드의 재해석과 뷰파인더 너머로 보이는 텍스처는 서정적이면서도 세련된 느낌을 물씬 풍깁니다. 디제잉과 프로덕션 테크닉의 고도화는 팝 음악과 신스웨이브의 경계를 모호하게 만들어 주고 있습니다.',
      ],
      // 오른쪽 단
      [
        'The seamless integration of video editing and sound design creates an immersive experience for viewers around the world. 음향 엔지니어들은 사운드 스케이프를 설계하고 시각 편집자들은 이를 시각적으로 형상화하는 작업을 끊임없이 반복합니다. 라이브 콘서트 무대 위의 조명과 LED 연출은 비주얼 아트의 최첨단을 보여주는 대표적인 사례입니다. Fashion trends may come and go, but authentic artistic expression will always resonate with the global audience. 모델들의 디테일한 포즈와 오디오의 강렬한 베이스 드롭이 맞물릴 때 강렬한 몰입감이 탄생합니다.',
        '시네마틱한 컬러 그레이딩은 일상적인 패션 필름에 숨을 불어넣고 극적인 모멘트를 연출합니다.',
      ],
    ],
    photo: {
      src: '/archive/page03_2.jpg',
      caption: 'Leather swatch, side light',
      col: 'right',
      pos: 'top',
      h: 45, // 단 높이의 몇 %
    },
  },
  { // 5쪽 확인용
    type: 'letter',
    letter: '23',
    letterSize: 26,  // 글자 크기 (기본 46)
    kicker: '03 — Code',
    title: 'Code & Craft',
    body: [
      'Sound and vision are two sides of the same coin, elevating each other to create unforgettable artistic moments. 감각적인 연출과 리드미컬한 편집 기술은 사용자가 스크린에서 눈을 떼지 못하게 만드는 핵심 동력입니다. 무대 뒤 라이브 스트리밍과 비하인드 씬 비디오는 단순한 기획을 넘어 브랜드의 인간적인 매력을 전달하는 서사 구조를 갖습니다. Understanding layout balance and typography hierarchy is essential when designing content-heavy web platforms.',
      '웹 페이지 상에서 이와 같은 텍스트 덩어리가 어떻게 시각적으로 정돈되는지 확인하는 것은 UI/UX 설계에서 매우 중요합니다. 영문 폰트와 한글 폰트의 행간 및 자간 조합은 전체적인 가독성과 브랜드 가치를 결정짓는 중요 포인트입니다. This sample text helps you evaluate font pairing, line spacing, and paragraph readability across various screen sizes. 이제 이 텍스트를 복사하여 개발 중인 사이트의 레이아웃과 반응형 그리드 시스템을 철저히 테스트해 보세요.',
      '패션 브랜드의 아이덴티티는 이제 단순한 의류 제작을 넘어 종합적인 시각 콘텐츠와 컬처 테마를 통해 완성됩니다. High fashion and streetwear are merging to create a bold, hybrid aesthetic that appeals to contemporary youth culture. 무대 위의 모델들은 강렬한 조명 아래서 음악의 리듬에 발맞추어 개성 있는 캣워크를 선보입니다. The sound architecture of a runway show defines the dynamic mood, setting the emotional pace for the entire audience.', 
      '동영상 편집 기법의 발달로 단순한 기록용 영상을 넘어 한 편의 예술 영화 같은 패션 필름이 대세로 자리 잡았습니다. 비디오 아티스트들은 시네마틱 카메라와 다채로운 프레임 레이트를 활용하여 섬세한 원단의 텍스처를 담아냅니다. Visuals in the digital age need to capture immediate attention within the first few seconds of playback.',
    ],
  },
  { // 6쪽 확인용
    type: 'grid',
    kicker: '04 — Archive',
    title: 'Contact Sheet',
    cols: 3,
    photos: [
      { src: '/archive/page06_1.jpg', w: 2, h: 2 },
      { src: '/archive/page06_2.jpg' },
      { src: '/archive/page06_3.jpg' },
      { src: '/archive/page06_4.jpg' },
      { src: '/archive/page06_5.jpg' },
      { src: '/archive/page06_6.jpg' },
    ],
    note: 'Selected frames from the lookbook shoot, 2026',
  },
  ...IMG.slice(5).map((src) => ({ type: 'image', src })),
];