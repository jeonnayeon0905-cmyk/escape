import { NavLink } from 'react-router-dom';
import Icon from './Icon';

const ITEMS = [
  { to: '/', label: '홈', icon: 'home', end: true },
  { to: '/records', label: '기록 목록', icon: 'list', end: true },
  { to: '/stats', label: '통계', icon: 'chart', end: true },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="주 메뉴">
      <ul className="bottom-nav__list">
        {ITEMS.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.end} className="bottom-nav__link">
              <Icon name={it.icon} size={24} />
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
