import { useMemo, useState } from 'react';
import Hero from '../components/Hero';
import RecordList from '../components/RecordList';
import { SearchBar } from '../components/ui';
import { useRecords } from '../context/RecordsContext';
import { filterRecords, sortRecords } from '../lib/stats';

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'success', label: '성공' },
  { value: 'fail', label: '실패' },
];

export default function Records() {
  const { records, status } = useRecords();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('all');
  const [sort, setSort] = useState('latest');

  const list = useMemo(() => {
    const byResult = result === 'all' ? records : records.filter((r) => r.result === result);
    return sortRecords(filterRecords(byResult, query), sort);
  }, [records, query, result, sort]);

  return (
    <>
      <Hero title="기록 목록" subtitle="지금까지 탈출한 모든 방" compact />
      <main className="page">
        <SearchBar value={query} onChange={setQuery} />
        <div className="toolbar">
          <div className="chips" role="radiogroup" aria-label="결과 필터">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={result === f.value}
                className={`chip chip--${f.value} ${result === f.value ? 'is-active' : ''}`}
                onClick={() => setResult(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="select">
            <span className="sr-only">정렬</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="difficulty">난이도순</option>
            </select>
          </label>
        </div>
        {status === 'ready' && <p className="count-text">{list.length}개의 기록</p>}
        <RecordList records={list} query={query} />
      </main>
    </>
  );
}
