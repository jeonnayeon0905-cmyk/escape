import PixelIcon from './PixelIcon';

/** 상단 요약 숫자 3칸. items: [{ icon, label, value, unit, tone }] */
export default function StatTiles({ items }) {
  return (
    <dl className="stat-tiles">
      {items.map((it) => (
        <div key={it.label} className="stat-tile">
          <PixelIcon name={it.icon} size={30} className="stat-tile__icon" />
          <div className="stat-tile__text">
            <dt className="stat-tile__label">{it.label}</dt>
            <dd className={`stat-tile__value stat-tile__value--${it.tone || 'default'}`}>
              {it.value}
              {it.unit && <span className="stat-tile__unit">{it.unit}</span>}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
