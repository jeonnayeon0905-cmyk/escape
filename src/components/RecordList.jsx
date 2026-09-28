import { Link } from 'react-router-dom';
import RecordCard from './RecordCard';
import { EmptyState, ErrorState, LoadingState } from './ui';
import { useRecords } from '../context/RecordsContext';
import { useState } from 'react';

/** 불러오기 상태(로딩/오류/빈 목록)까지 처리하는 기록 목록 */
export default function RecordList({ records, query }) {
  const { status, error, reload, records: all } = useRecords();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    await reload();
    setRetrying(false);
  };

  if (status === 'loading' || status === 'idle') return <LoadingState />;
  if (status === 'error') return <ErrorState error={error} onRetry={retry} retrying={retrying} />;

  return (
    <>
      {error && (
        <div className="banner banner--warn" role="alert">
          <span>최신 기록을 불러오지 못했어요. {error.message}</span>
          <button type="button" className="banner__action" onClick={retry} disabled={retrying}>
            다시 시도
          </button>
        </div>
      )}
      {all.length === 0 ? (
        <EmptyState title="아직 기록이 없어요" text="첫 번째 방탈출 기록을 남겨보세요!">
          <Link to="/records/new" className="btn btn--secondary btn--sm">기록 추가하기</Link>
        </EmptyState>
      ) : records.length === 0 ? (
        <EmptyState title="검색 결과가 없어요" text={query ? `‘${query.trim()}’ 와 일치하는 카페·테마가 없어요.` : '조건에 맞는 기록이 없어요.'} />
      ) : (
        <ul className="record-list">
          {records.map((r) => (
            <RecordCard key={r.id} record={r} />
          ))}
        </ul>
      )}
    </>
  );
}
