import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import Icon from '../components/Icon';
import PixelIcon from '../components/PixelIcon';
import StatTiles from '../components/StatTiles';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { useRecords } from '../context/RecordsContext';
import { computeStats } from '../lib/stats';
import { formatDate } from '../lib/date';

export default function Stats() {
  const { records, status, error, reload } = useRecords();
  const s = useMemo(() => computeStats(records), [records]);

  let content;
  if (status === 'loading' || status === 'idle') content = <LoadingState text="통계를 계산하는 중…" />;
  else if (status === 'error') content = <ErrorState error={error} onRetry={() => reload()} />;
  else if (records.length === 0) {
    content = (
      <EmptyState title="아직 통계가 없어요" text="기록을 추가하면 여기에서 여정을 숫자로 돌아볼 수 있어요.">
        <Link to="/records/new" className="btn btn--secondary btn--sm">기록 추가하기</Link>
      </EmptyState>
    );
  } else {
    content = (
      <>
        <StatTiles
          items={[
            { icon: 'book', label: '총', value: s.total, unit: '방' },
            { icon: 'key', label: '성공률', value: s.successRate, unit: '%', tone: 'success' },
            { icon: 'calendar', label: '최근 3개월', value: s.recent3, unit: '방', tone: 'fail' },
          ]}
        />
        <div className="stats-grid">
          <MonthlyChart data={s.monthly} />
          <ResultDonut success={s.success} fail={s.fail} total={s.total} rate={s.successRate} />
        </div>
        <DifficultyChart data={s.difficulty} total={s.total} />
        <Highlights topCafe={s.topCafe} hardest={s.hardestSuccess} />
      </>
    );
  }

  return (
    <>
      <Hero title="통계" subtitle={<>지금까지의 여정을<br />숫자로 돌아보세요</>} compact />
      <main className="page">{content}</main>
    </>
  );
}

function ChartCard({ title, icon = 'chart', aside, children, className = '' }) {
  return (
    <section className={`card chart-card ${className}`}>
      <header className="card__header">
        <h2 className="card__title">
          <Icon name={icon} size={20} /> {title}
        </h2>
        {aside && <span className="card__aside">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

function niceMax(max) {
  if (max <= 4) return 4;
  if (max <= 8) return 8;
  return Math.ceil(max / 5) * 5;
}

function MonthlyChart({ data }) {
  const max = niceMax(Math.max(...data.map((d) => d.count)));
  const ticks = [0, max / 2, max];
  return (
    <ChartCard title="월별 기록" aside="최근 6개월">
      <div className="bar-chart" role="img" aria-label={data.map((d) => `${d.month}월 ${d.count}방`).join(', ')}>
        <div className="bar-chart__grid" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="bar-chart__tick" style={{ bottom: `${(t / max) * 100}%` }}>
              <em>{t}</em>
            </span>
          ))}
        </div>
        <ol className="bar-chart__bars">
          {data.map((d) => (
            <li key={d.key} className="bar-chart__col" title={`${d.year}년 ${d.month}월: ${d.count}방`}>
              <span className="bar-chart__plot">
                <span className="bar-chart__bar" style={{ height: `${(d.count / max) * 100}%` }}>
                  <span className="bar-chart__value">{d.count}</span>
                </span>
              </span>
              <span className="bar-chart__label">{d.month}월</span>
            </li>
          ))}
        </ol>
      </div>
    </ChartCard>
  );
}

function ResultDonut({ success, fail, total, rate }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && success > 0 && fail > 0 ? 3 : 0; // 두 조각 사이 여백
  const successLen = total ? (success / total) * c : 0;
  const failLen = total ? (fail / total) * c : 0;
  return (
    <ChartCard title="성공 / 실패" icon="flag">
      <div className="donut">
        <svg viewBox="0 0 100 100" className="donut__svg" role="img" aria-label={`성공 ${success}방, 실패 ${fail}방`}>
          <circle cx="50" cy="50" r={r} className="donut__track" />
          {success > 0 && (
            <circle
              cx="50" cy="50" r={r}
              className="donut__seg donut__seg--success"
              strokeDasharray={`${Math.max(successLen - gap, 0)} ${c}`}
              transform="rotate(-90 50 50)"
            >
              <title>성공 {success}방</title>
            </circle>
          )}
          {fail > 0 && (
            <circle
              cx="50" cy="50" r={r}
              className="donut__seg donut__seg--fail"
              strokeDasharray={`${Math.max(failLen - gap, 0)} ${c}`}
              strokeDashoffset={-successLen}
              transform="rotate(-90 50 50)"
            >
              <title>실패 {fail}방</title>
            </circle>
          )}
        </svg>
        <div className="donut__center" aria-hidden="true">
          <span>성공률</span>
          <strong>{rate}%</strong>
        </div>
      </div>
      <ul className="legend">
        <li>
          <span className="legend__dot legend__dot--success" /> 성공
          <strong>{success}방</strong>
          <em>({rate}%)</em>
        </li>
        <li>
          <span className="legend__dot legend__dot--fail" /> 실패
          <strong>{fail}방</strong>
          <em>({total ? 100 - rate : 0}%)</em>
        </li>
      </ul>
    </ChartCard>
  );
}

function DifficultyChart({ data, total }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ChartCard title="난이도 분포" icon="star" aside={`총 ${total}방`}>
      <ul className="hbar-list">
        {data.map((d) => {
          const pct = total ? Math.round((d.count / total) * 100) : 0;
          return (
            <li key={d.level} className="hbar" title={`난이도 ${d.level}: ${d.count}방 (${pct}%)`}>
              <span className="hbar__label">난이도 {d.level}</span>
              <span className="hbar__track">
                <span className="hbar__fill" style={{ width: `${(d.count / max) * 100}%`, opacity: 0.55 + d.level * 0.09 }} />
              </span>
              <span className="hbar__value">
                <strong>{d.count}방</strong> <em>({pct}%)</em>
              </span>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}

function Highlights({ topCafe, hardest }) {
  return (
    <section className="card chart-card">
      <header className="card__header">
        <h2 className="card__title">
          <PixelIcon name="trophy" size={20} /> 주요 기록
        </h2>
      </header>
      <div className="highlights">
        <div className="highlight">
          <span className="highlight__label">가장 많이 간 카페</span>
          {topCafe ? (
            <>
              <strong className="highlight__title">{topCafe.name}</strong>
              <span className="highlight__sub">총 {topCafe.count}방 방문</span>
            </>
          ) : (
            <span className="highlight__sub">기록 없음</span>
          )}
        </div>
        {hardest ? (
          <Link to={`/records/${hardest.id}`} className="highlight highlight--link">
            <span className="highlight__label">가장 높은 난이도 성공</span>
            <strong className="highlight__title">{hardest.theme_name}</strong>
            <span className="highlight__sub highlight__sub--accent">
              난이도 {hardest.difficulty} · {formatDate(hardest.escape_date)}
            </span>
            <Icon name="chevronRight" size={18} className="highlight__chevron" />
          </Link>
        ) : (
          <div className="highlight">
            <span className="highlight__label">가장 높은 난이도 성공</span>
            <span className="highlight__sub">아직 성공한 기록이 없어요</span>
          </div>
        )}
      </div>
    </section>
  );
}
