import { MAG } from '../data/archive';

// 공통 틀: 머리말 + 쪽 번호
function Frame({ index, tone, bare, children }) {
    const side = index % 2 === 1 ? 'left' : 'right'; // 홀수 쪽 = 왼쪽 페이지
    return (
        <div className={`mp mp--${side} mp--${tone}`}>
        <div className="mp-body">{children}</div>
        {!bare && (
            <>
            <header className="mp-head">
                <span>{side === 'left' ? MAG.title : MAG.issue}</span>
            </header>
            <span className="mp-folio">{String(index).padStart(2, '0')}</span>
            </>
        )}
        </div>
    );
}

// 레이아웃
function ImageLayout({ page }) {
    return <img className="mp-fill" src={page.src} alt="" draggable={false} />;
}

function CoverLayout({ page }) {
  return (
    <>
      <img className="mp-fill" src={page.src} alt="" draggable={false} />
      <div className="lay-cover">
        <h1
          className="cover-title"
          style={page.titleSize ? { '--size': page.titleSize } : undefined}
        >
          {page.title ?? MAG.title}
        </h1>

        {page.issue && <p className="cover-issue">{page.issue}</p>}
        {page.script && <p className="mag-script cover-script">{page.script}</p>}

        {page.lines && (
          <ul className="cover-lines">
            {page.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function StoryLayout({ page }) {
  const body = [].concat(page.body ?? []); // 글 개수 상관없게

  return (
    <div className="lay-story">
      {page.kicker && <p className="story-kicker">{page.kicker}</p>}
      <h2 className="mag-h">{page.title}</h2>
      {page.script && <p className="mag-script story-script">{page.script}</p>}

      <div className="story-body">
        {body.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>

      {page.src && (
        <figure className="story-photo">
          <img src={page.src} alt="" draggable={false} />
          {page.caption && <figcaption>{page.caption}</figcaption>}
        </figure>
      )}
    </div>
  );
}

function PhotosLayout({ page }) {
  const photos = (page.photos ?? []).slice(0, 2);

  return (
    <div className="lay-photos" style={{ '--split': page.split ?? 0.5 }}>
      {photos.map((p, i) => (
        <figure className="photos-item" key={i}>
          <img src={p.src} alt="" draggable={false} />
          {p.caption && (
            <figcaption>
              <span className="photos-no">{String(i + 1).padStart(2, '0')}</span>
              {p.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

function FullLayout({ page }) {
  const [x, y] = page.at ?? [50, 70];

  return (
    <>
      <img className="mp-fill" src={page.src} alt="" draggable={false} />

      {page.script && (
        <p
          className="mag-script full-script"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            '--size': page.scriptSize ?? 20,
            color: page.scriptColor, // 안 적으면 기본 빨강
          }}
        >
          {page.script}
        </p>
      )}

      {page.caption && <p className="full-caption">{page.caption}</p>}
    </>
  );
}

// 글 하나(문자열)든 여러 개(배열)든 <p>로 바꿔주기
const toParas = (text) =>
  [].concat(text ?? []).map((t, i) => <p key={i}>{t}</p>);

function TextLayout({ page }) {
  const ph = page.photo;
  const col = ph?.col ?? 'right';
  const pos = ph?.pos ?? 'top';

  const photo = ph && (
    <figure className={`text-photo text-photo--${pos}`} style={{ '--h': ph.h ?? 35 }}>
      <img src={ph.src} alt="" draggable={false} />
      {ph.caption && <figcaption>{ph.caption}</figcaption>}
    </figure>
  );

  return (
    <div className="lay-text">
      {page.kicker && <p className="story-kicker">{page.kicker}</p>}
      {page.title && <h2 className="text-title">{page.title}</h2>}

      <div className="text-cols">
        {['left', 'right'].map((side, i) => (
          <div className="text-col" key={side}>
            {col === side && pos === 'top' && photo}
            {toParas(page.body?.[i])}
            {col === side && pos === 'bottom' && photo}
          </div>
        ))}
      </div>
    </div>
  );
}

function LetterLayout({ page }) {
  return (
    <div className="lay-letter">
      <span
        className="letter-big"
        style={page.letterSize ? { '--size': page.letterSize } : undefined}
      >
        {page.letter}
      </span>
      {page.kicker && <p className="story-kicker">{page.kicker}</p>}
      {page.title && <h2 className="letter-title">{page.title}</h2>}
      {toParas(page.body)}
    </div>
  );
}

function GridLayout({ page }) {
  const photos = page.photos ?? [];
  const cols = page.cols ?? 3;
  // 사진들이 차지하는 칸 수를 다 더해서 줄 수 계산
  const cells = photos.reduce((n, p) => n + (p.w ?? 1) * (p.h ?? 1), 0);
  const rows = page.rows ?? Math.ceil(cells / cols);

  return (
    <div className="lay-grid">
      {page.kicker && <p className="story-kicker">{page.kicker}</p>}
      {page.title && <h2 className="text-title">{page.title}</h2>}

      <div className="grid-box" style={{ '--cols': cols, '--rows': rows }}>
        {photos.map((p, i) => (
          <figure
            key={i}
            className="grid-item"
            style={{ gridColumn: `span ${p.w ?? 1}`, gridRow: `span ${p.h ?? 1}` }}
          >
            <img src={p.src} alt="" draggable={false} />
            <span className="grid-no">{String(i + 1).padStart(2, '0')}</span>
          </figure>
        ))}
      </div>

      {page.note && <p className="grid-note">{page.note}</p>}
    </div>
  );
}

function TestLayout({ page }) {
    return (
        <div className="mp-test">
        <h2 className="mag-h">{page.title}</h2>
        <p className="mag-script">archive</p>
        <p className="mag-text">
            작업 과정을 기록한 페이지야. 창 크기를 바꾸면 이 글자도 페이지에 맞춰
            같이 커지고 작아져야 해. The quick brown fox jumps over the lazy dog.
        </p>
        </div>
    );
}

const LAYOUTS = {
    image: ImageLayout,
    cover: CoverLayout,
    story: StoryLayout,
    photos: PhotosLayout,
    full: FullLayout,
    text: TextLayout,
    letter: LetterLayout,
    grid: GridLayout,
    test: TestLayout,
};

export function MagPage({ page, index, total }) {
    const Layout = LAYOUTS[page.type] ?? ImageLayout;
    const bare = page.bare || index === 0 || index === total - 1; // 표지엔 머리말 없음
    const LIGHT = ['image', 'cover', 'full']; // 사진 위라서 흰 글자를 쓰는 틀
    const tone = page.tone ?? (LIGHT.includes(page.type) ? 'light' : 'dark');

    return (
        <Frame index={index} tone={tone} bare={bare}>
        <Layout page={page} />
        </Frame>
    );
}