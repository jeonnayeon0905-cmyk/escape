import PixelIcon from './PixelIcon';

/** 도트풍 건물 실루엣 (고정 패턴) */
const BUILDINGS = [
  [0, 7, 9], [7, 5, 13], [12, 8, 7], [20, 4, 16], [24, 7, 10], [31, 9, 6], [40, 5, 12],
  [45, 6, 8], [51, 3, 18], [54, 8, 9], [62, 6, 14], [68, 9, 7], [77, 5, 11], [82, 7, 15],
  [89, 6, 8], [95, 4, 19], [99, 8, 10], [107, 6, 13], [113, 7, 8],
];
const SKY_H = 22;

function Skyline() {
  const windows = [];
  BUILDINGS.forEach(([x, w, h], i) => {
    for (let wy = SKY_H - h + 2; wy < SKY_H - 2; wy += 3) {
      for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        if ((wx * 7 + wy * 3 + i) % 5 === 0) windows.push([wx, wy]);
      }
    }
  });
  return (
    <svg className="hero__skyline" viewBox={`0 0 120 ${SKY_H}`} preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      {BUILDINGS.map(([x, w, h]) => (
        <rect key={x} x={x} y={SKY_H - h} width={w} height={h} fill="#0f1440" />
      ))}
      {BUILDINGS.filter(([, , h]) => h >= 15).map(([x, w, h]) => (
        <rect key={`t${x}`} x={x + Math.floor(w / 2) - 0.5} y={SKY_H - h - 3} width={1} height={3} fill="#0f1440" />
      ))}
      {windows.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#ffd166" opacity="0.75" />
      ))}
    </svg>
  );
}

function Planet() {
  return (
    <svg className="hero__planet" viewBox="0 0 64 40" aria-hidden="true">
      <ellipse cx="32" cy="22" rx="30" ry="7" fill="none" stroke="#8f8cff" strokeWidth="2" opacity="0.55" />
      <circle cx="32" cy="20" r="13" fill="#4f57c9" />
      <path d="M21 16c6 2 16 2 22 0M20 22c7 2 17 2 24 0" stroke="#6b73e0" strokeWidth="2" fill="none" />
      <path d="M2 22c0 3.9 13.4 7 30 7s30-3.1 30-7" fill="none" stroke="#a8a6ff" strokeWidth="2" />
    </svg>
  );
}

export default function Hero({ title, subtitle, left, right, compact = false, showCat = true }) {
  return (
    <header className={`hero ${compact ? 'hero--compact' : ''}`}>
      <div className="hero__deco" aria-hidden="true">
        <span className="hero__moon" />
        <Planet />
        <span className="sparkle sparkle--lg" style={{ top: '58%', left: '22%' }} />
        <span className="sparkle" style={{ top: '64%', right: '24%' }} />
        <span className="sparkle" style={{ top: '6%', right: '36%' }} />
        <span className="sparkle sparkle--sm" style={{ top: '52%', left: '12%' }} />
        <span className="sparkle sparkle--sm" style={{ top: '48%', right: '10%' }} />
        <Skyline />
        {showCat && <PixelIcon name="cat" size={20} className="hero__cat" />}
      </div>
      <div className="hero__bar">
        <div className="hero__slot">{left}</div>
        <div className="hero__slot hero__slot--right">{right}</div>
      </div>
      <div className="hero__text">
        <h1 className="hero__title">{title}</h1>
        <div className="hero__rule" aria-hidden="true"><span /></div>
        {subtitle && <p className="hero__subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}
