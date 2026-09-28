const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n) => String(n).padStart(2, '0');

/** 로컬 시간 기준 YYYY-MM-DD */
export function toISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' → 로컬 Date (시간대 밀림 방지) */
export function parseISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** 2026.09.14 */
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return `${y}.${m}.${d}`;
}

/** 2026.09.14 (일) */
export function formatDateWithDay(iso) {
  if (!iso) return '';
  return `${formatDate(iso)} (${WEEKDAYS[parseISODate(iso).getDay()]})`;
}

export function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
