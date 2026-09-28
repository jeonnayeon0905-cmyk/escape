import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import PixelIcon from './PixelIcon';
import { Spinner } from './ui';
import { usePhotoUrl } from '../lib/photos';

/** 저장된 사진 표시. 사진이 없거나 불러오지 못하면 fallback 을 보여준다. */
export function StoredPhoto({ path, alt = '', className = '', fallback = null }) {
  const { url, failed } = usePhotoUrl(path);
  const [broken, setBroken] = useState(false);
  if (!path || failed || broken) return fallback;
  if (!url) return <span className={`photo-loading ${className}`} aria-hidden="true" />;
  return <img src={url} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setBroken(true)} />;
}

/** 사진 크게 보기 */
export function PhotoViewer({ open, src, alt, onClose }) {
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
      className="photo-viewer"
      aria-label="사진 크게 보기"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={onClose}
    >
      {open && src && <img src={src} alt={alt} />}
      <button type="button" className="icon-btn photo-viewer__close" onClick={onClose} aria-label="닫기">
        <Icon name="x" size={22} />
      </button>
    </dialog>
  );
}

/** 상세 화면 대표 사진 (누르면 크게 보기) */
export function DetailPhoto({ path, alt, fallback }) {
  const { url, failed } = usePhotoUrl(path);
  const [open, setOpen] = useState(false);
  if (!path || failed) return fallback;
  return (
    <>
      <button type="button" className="summary-card__thumb summary-card__thumb--photo" onClick={() => url && setOpen(true)} aria-label="사진 크게 보기">
        {url ? <img src={url} alt={alt} /> : <Spinner size={20} />}
      </button>
      <PhotoViewer open={open} src={url} alt={alt} onClose={() => setOpen(false)} />
    </>
  );
}

/** 목록 카드 썸네일용: 사진이 있으면 사진, 없으면 기존 도트 아이콘 */
export function CardThumb({ record }) {
  const ok = record.result === 'success';
  const icon = <PixelIcon name={ok ? 'key' : 'lock'} size={30} />;
  return (
    <span className={`record-card__thumb record-card__thumb--${ok ? 'success' : 'fail'} ${record.photo_path ? 'record-card__thumb--photo' : ''}`} aria-hidden="true">
      {record.photo_path ? <StoredPhoto path={record.photo_path} fallback={icon} /> : icon}
    </span>
  );
}
