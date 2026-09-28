import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import StatTiles from '../components/StatTiles';
import RecordList from '../components/RecordList';
import AccountMenu from '../components/AccountMenu';
import Icon from '../components/Icon';
import { SearchBar } from '../components/ui';
import { useRecords } from '../context/RecordsContext';
import { basicCounts, filterRecords } from '../lib/stats';

export default function Home() {
  const { records, status } = useRecords();
  const [query, setQuery] = useState('');
  const counts = useMemo(() => basicCounts(records), [records]);
  const filtered = useMemo(() => filterRecords(records, query), [records, query]);
  const ready = status === 'ready';

  return (
    <>
      <Hero title="방탈출 기록" subtitle={<>우리가 풀어낸<br />또 하나의 이야기</>} right={<AccountMenu />} />
      <main className="page">
        <StatTiles
          items={[
            { icon: 'book', label: '총', value: ready ? counts.total : '–', unit: ready ? '방' : '' },
            { icon: 'key', label: '성공', value: ready ? counts.success : '–', tone: 'success' },
            { icon: 'lock', label: '실패', value: ready ? counts.fail : '–', tone: 'fail' },
          ]}
        />

        <Link to="/records/new" className="btn btn--primary btn--xl cta">
          <Icon name="plus" size={22} strokeWidth={2.4} />
          탈출 기록 추가
        </Link>

        <section aria-labelledby="home-list-title" className="section">
          <h2 id="home-list-title" className="sr-only">방탈출 기록 목록</h2>
          <SearchBar value={query} onChange={setQuery} />
          <RecordList records={filtered} query={query} />
        </section>
      </main>
    </>
  );
}
