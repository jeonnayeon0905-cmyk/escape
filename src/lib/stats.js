import { toISODate } from './date';

export function basicCounts(records) {
  const total = records.length;
  const success = records.filter((r) => r.result === 'success').length;
  return { total, success, fail: total - success };
}

export function computeStats(records, today = new Date()) {
  const { total, success, fail } = basicCounts(records);
  const successRate = total ? Math.round((success / total) * 100) : 0;

  // 최근 3개월: 오늘로부터 3개월 전 같은 날 ~ 오늘
  const from = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
  const fromIso = toISODate(from);
  const todayIso = toISODate(today);
  const recent3 = records.filter((r) => r.escape_date >= fromIso && r.escape_date <= todayIso).length;

  // 월별 (최근 6개월, 이번 달 포함)
  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly.push({ key, year: d.getFullYear(), month: d.getMonth() + 1, count: 0 });
  }
  const byKey = new Map(monthly.map((m) => [m.key, m]));
  for (const r of records) {
    const m = byKey.get(String(r.escape_date).slice(0, 7));
    if (m) m.count += 1;
  }

  // 난이도별
  const difficulty = [1, 2, 3, 4, 5].map((level) => ({
    level,
    count: records.filter((r) => r.difficulty === level).length,
  }));

  // 가장 많이 방문한 카페 (동률이면 가장 최근 방문)
  const cafes = new Map();
  for (const r of records) {
    const name = r.cafe_name.trim();
    const c = cafes.get(name) || { name, count: 0, last: '' };
    c.count += 1;
    if (r.escape_date > c.last) c.last = r.escape_date;
    cafes.set(name, c);
  }
  const topCafe =
    [...cafes.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))[0] || null;

  // 최고 난이도 성공 기록 (동률이면 최근)
  const hardestSuccess =
    records
      .filter((r) => r.result === 'success')
      .sort((a, b) => b.difficulty - a.difficulty || b.escape_date.localeCompare(a.escape_date))[0] || null;

  return { total, success, fail, successRate, recent3, monthly, difficulty, topCafe, hardestSuccess };
}

export function sortRecords(records, mode = 'latest') {
  const list = [...records];
  const byDateDesc = (a, b) =>
    b.escape_date.localeCompare(a.escape_date) || String(b.created_at).localeCompare(String(a.created_at));
  if (mode === 'oldest') return list.sort((a, b) => -byDateDesc(a, b));
  if (mode === 'difficulty') return list.sort((a, b) => b.difficulty - a.difficulty || byDateDesc(a, b));
  return list.sort(byDateDesc);
}

export function filterRecords(records, query) {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return records;
  return records.filter(
    (r) => r.cafe_name.toLowerCase().includes(q) || r.theme_name.toLowerCase().includes(q),
  );
}

