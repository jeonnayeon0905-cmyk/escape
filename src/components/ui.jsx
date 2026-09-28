import { useEffect, useRef } from 'react';
import Icon from './Icon';
import PixelIcon from './PixelIcon';

export function Stars({ value, size = 14, label = true }) {
  return (
    <span className="stars" role="img" aria-label={label ? `난이도 ${value} / 5` : undefined} aria-hidden={label ? undefined : 'true'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" className={n <= value ? 'stars__on' : 'stars__off'}>
          <path d="m12 3.8 2.5 5.2 5.6.7-4.1 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.7Z" />
        </svg>
      ))}
    </span>
  );
}

export function ResultBadge({ result, size = 'md' }) {
  const ok = result === 'success';
  return (
    <span className={`badge badge--${ok ? 'success' : 'fail'} badge--${size}`}>
      <Icon name={ok ? 'flag' : 'x'} size={size === 'sm' ? 13 : 15} strokeWidth={2.2} />
      {ok ? '성공' : '실패'}
    </span>
  );
}

export function Spinner({ size = 18, label }) {
  return (
    <span className="spinner" style={{ width: size, height: size }} role={label ? 'status' : undefined} aria-label={label} />
  );
}

export function LoadingState({ text = '기록을 불러오는 중…' }) {
  return (
    <div className="state">
      <Spinner size={28} />
      <p className="state__text">{text}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry, retrying }) {
  return (
    <div className="state state--error" role="alert">
      <PixelIcon name="lock" size={40} />
      <p className="state__title">기록을 불러오지 못했어요</p>
      <p className="state__text">{error?.message || '잠시 후 다시 시도해주세요.'}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry} disabled={retrying}>
          {retrying ? <Spinner size={16} /> : <Icon name="refresh" size={16} />} 다시 시도
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, children }) {
  return (
    <div className="state">
      <PixelIcon name="key" size={40} />
      <p className="state__title">{title}</p>
      {text && <p className="state__text">{text}</p>}
      {children}
    </div>
  );
}

export function SearchBar({ value, onChange }) {
  return (
    <label className="search">
      <Icon name="search" size={20} className="search__icon" />
      <span className="sr-only">카페명, 테마명 검색</span>
      <input
        type="search"
        className="search__input"
        placeholder="카페명, 테마명 검색"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        enterKeyHint="search"
        autoComplete="off"
      />
      {value && (
        <button type="button" className="search__clear" onClick={() => onChange('')} aria-label="검색어 지우기">
          <Icon name="x" size={16} />
        </button>
      )}
    </label>
  );
}

/** 확인 대화상자 (삭제 등 되돌릴 수 없는 작업 전) */
export function ConfirmDialog({ open, title, message, confirmLabel = '확인', cancelLabel = '취소', danger, busy, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel();
      }}
    >
      <div className="dialog__body">
        <p id="dialog-title" className="dialog__title">{title}</p>
        {message && <p className="dialog__text">{message}</p>}
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner size={16} />} {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
