import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import Icon from './Icon';
import { Spinner } from './ui';
import { renderCroppedPhoto } from '../lib/photos';

const RATIOS = [
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
];

/**
 * 사진 자르기 / 조정 화면 (전체 화면 대화상자)
 * - 드래그로 위치 이동, 두 손가락(또는 슬라이더)으로 확대
 * - 비율 선택, 90° 회전
 */
export default function PhotoEditor({ open, src, onCancel, onDone }) {
  const ref = useRef(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(RATIOS[0].value);
  const [area, setArea] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  // 새 사진이 열리면 조정값 초기화
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(RATIOS[0].value);
    setError('');
    setBusy(false);
  }, [src]);

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const done = async () => {
    if (!area || busy) return;
    setBusy(true);
    setError('');
    try {
      const blob = await renderCroppedPhoto(src, area, rotation);
      onDone(blob);
    } catch (err) {
      setError(err.message || '사진을 처리하지 못했어요.');
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className="photo-editor"
      aria-label="사진 자르기"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="photo-editor__inner">
        <header className="photo-editor__bar">
          <button type="button" className="photo-editor__text-btn" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <strong className="photo-editor__title">사진 자르기</strong>
          <button type="button" className="photo-editor__text-btn photo-editor__text-btn--primary" onClick={done} disabled={busy || !area}>
            {busy ? <Spinner size={16} /> : '완료'}
          </button>
        </header>

        <div className="photo-editor__stage">
          {open && src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              minZoom={1}
              maxZoom={4}
              zoomSpeed={0.4}
              objectFit="contain"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>

        <div className="photo-editor__controls">
          {error && <p className="field__error" role="alert">{error}</p>}
          <div className="photo-editor__ratios" role="radiogroup" aria-label="자르기 비율">
            {RATIOS.map((r) => (
              <button
                key={r.label}
                type="button"
                role="radio"
                aria-checked={aspect === r.value}
                className={`chip ${aspect === r.value ? 'is-active' : ''}`}
                onClick={() => setAspect(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <label className="photo-editor__zoom">
            <span className="photo-editor__label">확대</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="확대"
            />
          </label>
          <div className="photo-editor__tools">
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setRotation((r) => (r + 270) % 360)}>
              <Icon name="rotateLeft" size={18} /> 왼쪽으로 회전
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
              <Icon name="rotateRight" size={18} /> 오른쪽으로 회전
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
              <Icon name="refresh" size={16} /> 초기화
            </button>
          </div>
          <p className="photo-editor__hint">사진을 끌어서 위치를 옮기고, 두 손가락으로 확대할 수 있어요.</p>
        </div>
      </div>
    </dialog>
  );
}
