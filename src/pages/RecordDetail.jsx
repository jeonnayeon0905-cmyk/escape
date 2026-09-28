import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Hero from '../components/Hero';
import Icon from '../components/Icon';
import PixelIcon from '../components/PixelIcon';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, ResultBadge, Stars } from '../components/ui';
import { useRecords } from '../context/RecordsContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, formatDateWithDay } from '../lib/date';

export default function RecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { status, error, reload, getById, remove } = useRecords();
  const record = getById(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));

  const onDelete = async () => {
    setDeleting(true);
    try {
      await remove(id); // DB 삭제 성공 후에만 목록에서 사라진다
      setConfirmOpen(false);
      toast.success('기록을 삭제했어요.');
      navigate('/', { replace: true });
    } catch (err) {
      setDeleting(false);
      setConfirmOpen(false);
      toast.error(`삭제하지 못했어요. ${err.message}`);
      if (err.kind === 'not_found') navigate('/', { replace: true });
    }
  };

  const hero = (
    <Hero
      title="기록 상세"
      compact
      left={
        <button type="button" className="icon-btn" onClick={goBack} aria-label="뒤로 가기">
          <Icon name="back" size={22} />
        </button>
      }
      right={
        record && (
          <Link to={`/records/${id}/edit`} className="icon-btn" aria-label="수정하기">
            <Icon name="pencil" size={20} />
          </Link>
        )
      }
    />
  );

  let content;
  if (status === 'loading' || status === 'idle') content = <LoadingState />;
  else if (status === 'error') content = <ErrorState error={error} onRetry={() => reload()} />;
  else if (!record) {
    content = (
      <EmptyState title="기록을 찾을 수 없어요" text="삭제되었거나 존재하지 않는 기록이에요.">
        <Link to="/" className="btn btn--secondary btn--sm">홈으로</Link>
      </EmptyState>
    );
  } else {
    const ok = record.result === 'success';
    const rows = [
      { icon: 'calendar', label: '탈출 날짜', value: formatDateWithDay(record.escape_date) },
      { icon: 'pin', label: '카페명', value: record.cafe_name },
      { icon: 'key', label: '테마명', value: record.theme_name },
      { icon: 'flag', label: '성공 여부', value: <ResultBadge result={record.result} size="sm" /> },
      { icon: 'people', label: '함께한 사람', value: record.companions || <span className="muted">기록 없음</span> },
      {
        icon: 'chart',
        label: '난이도',
        value: (
          <span className="inline-diff">
            <strong>{record.difficulty}</strong> <Stars value={record.difficulty} size={15} />
          </span>
        ),
      },
    ];
    content = (
      <>
        <section className="summary-card">
          <span className={`summary-card__thumb record-card__thumb--${ok ? 'success' : 'fail'}`} aria-hidden="true">
            <PixelIcon name={ok ? 'key' : 'lock'} size={44} />
          </span>
          <div className="summary-card__text">
            <div className="summary-card__top">
              <time dateTime={record.escape_date} className="summary-card__date">{formatDateWithDay(record.escape_date)}</time>
              <ResultBadge result={record.result} />
            </div>
            <h2 className="summary-card__title">{record.theme_name}</h2>
            <p className="summary-card__cafe">
              <Icon name="pin" size={16} className="record-card__meta-icon--pin" /> {record.cafe_name}
            </p>
          </div>
        </section>

        <section className="card">
          <h2 className="sr-only">상세 정보</h2>
          <dl className="info-list">
            {rows.map((r) => (
              <div key={r.label} className="info-list__row">
                <dt>
                  <Icon name={r.icon} size={19} /> {r.label}
                </dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card review-card" aria-labelledby="review-title">
          <h2 id="review-title" className="card__title">
            <Icon name="note" size={20} /> 후기
          </h2>
          {record.review ? (
            <p className="review-card__text">{record.review}</p>
          ) : (
            <p className="review-card__text muted">작성한 후기가 없어요.</p>
          )}
        </section>

        <p className="meta-text">
          처음 기록 {formatDateTime(record.created_at)}
          {record.updated_at !== record.created_at && <> · 마지막 수정 {formatDateTime(record.updated_at)}</>}
        </p>

        <div className="detail-actions">
          <Link to={`/records/${id}/edit`} className="btn btn--secondary btn--lg">
            <Icon name="pencil" size={20} /> 수정
          </Link>
          <button type="button" className="btn btn--danger-outline btn--lg" onClick={() => setConfirmOpen(true)}>
            <Icon name="trash" size={20} /> 삭제
          </button>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          title="정말 이 기록을 삭제하시겠습니까?"
          message={`‘${record.theme_name}’ 기록이 영구적으로 삭제되며 되돌릴 수 없어요.`}
          confirmLabel={deleting ? '삭제 중…' : '삭제'}
          danger
          busy={deleting}
          onConfirm={onDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      {hero}
      <main className="page">{content}</main>
    </>
  );
}
