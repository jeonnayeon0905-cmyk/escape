import { useRef, useState } from 'react';
import Icon from './Icon';
import PhotoEditor from './PhotoEditor';
import { StoredPhoto } from './Photo';
import { Spinner } from './ui';
import { getPhotoUrl, prepareSource } from '../lib/photos';

/**
 * 기록 폼의 사진 입력.
 * value: null (변경 없음) | { blob, preview, source } (새 사진) | { remove: true } (사진 삭제)
 */
export default function PhotoField({ id, existingPath, value, onChange, disabled, supported = true }) {
  const inputRef = useRef(null);
  const [editorSrc, setEditorSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasNew = Boolean(value?.blob);
  const showExisting = !hasNew && !value?.remove && Boolean(existingPath);
  const hasPhoto = hasNew || showExisting;

  const pick = () => {
    setError('');
    inputRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 사진을 다시 골라도 동작하도록
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      setEditorSrc(await prepareSource(file)); // 고르자마자 자르기 화면 열기
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const recrop = async () => {
    setError('');
    if (hasNew) {
      setEditorSrc(value.source);
      return;
    }
    setLoading(true);
    const url = await getPhotoUrl(existingPath);
    setLoading(false);
    if (url) setEditorSrc(url);
    else setError('사진을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
  };

  const onDone = (blob) => {
    if (hasNew && value.preview) URL.revokeObjectURL(value.preview);
    onChange({ blob, preview: URL.createObjectURL(blob), source: editorSrc });
    setEditorSrc(null);
  };

  const removePhoto = () => {
    if (hasNew && value.preview) URL.revokeObjectURL(value.preview);
    onChange(existingPath ? { remove: true } : null);
  };

  if (!supported) {
    return (
      <p className="field__hint photo-field__notice">
        사진 기능을 쓰려면 Supabase 에서 <code>supabase/002_photos.sql</code> 을 한 번 실행해주세요.
      </p>
    );
  }

  return (
    <div className="photo-field">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onFile}
        disabled={disabled}
        tabIndex={-1}
      />

      {hasPhoto ? (
        <>
          <div className="photo-field__preview">
            {hasNew ? (
              <img src={value.preview} alt="선택한 사진 미리보기" />
            ) : (
              <StoredPhoto path={existingPath} alt="저장된 사진" fallback={<span className="photo-field__missing">사진을 불러오지 못했어요</span>} />
            )}
            {loading && (
              <span className="photo-field__busy">
                <Spinner size={24} />
              </span>
            )}
          </div>
          <div className="photo-field__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={recrop} disabled={disabled || loading}>
              <Icon name="crop" size={17} /> 자르기·조정
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={pick} disabled={disabled || loading}>
              <Icon name="image" size={17} /> 사진 변경
            </button>
            <button type="button" className="btn btn--danger-outline btn--sm" onClick={removePhoto} disabled={disabled || loading}>
              <Icon name="trash" size={17} /> 삭제
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="photo-field__picker" onClick={pick} disabled={disabled || loading}>
          {loading ? <Spinner size={26} /> : <Icon name="image" size={30} />}
          <strong>{loading ? '사진을 여는 중…' : '사진 추가'}</strong>
          <span>보관함에서 사진을 고르면 바로 자르고 조정할 수 있어요</span>
        </button>
      )}

      {value?.remove && (
        <p className="field__hint">저장하면 기존 사진이 삭제돼요.</p>
      )}
      {error && <p className="field__error" role="alert">{error}</p>}

      <PhotoEditor
        open={Boolean(editorSrc)}
        src={editorSrc}
        onCancel={() => setEditorSrc(null)}
        onDone={onDone}
      />
    </div>
  );
}
