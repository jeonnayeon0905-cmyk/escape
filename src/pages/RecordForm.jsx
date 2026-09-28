import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import Hero from '../components/Hero';
import Icon from '../components/Icon';
import PixelIcon from '../components/PixelIcon';
import PhotoField from '../components/PhotoField';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRecords } from '../context/RecordsContext';
import { useToast } from '../context/ToastContext';
import { isPhotoSupported, LIMITS, validate } from '../lib/records';
import { formatDateTime, formatDateWithDay, toISODate } from '../lib/date';

const DIFFICULTY_TEXT = ['', '쉬움', '무난함', '보통', '어려움', '매우 어려움'];
const REVIEW_MAX = 2000; // 화면에서 권장하는 길이 (DB 한도는 LIMITS.review)

const emptyForm = () => ({
  escape_date: toISODate(),
  cafe_name: '',
  theme_name: '',
  result: '',
  companions: '',
  difficulty: 0,
  review: '',
});

const fromRecord = (r) => ({
  escape_date: r.escape_date,
  cafe_name: r.cafe_name,
  theme_name: r.theme_name,
  result: r.result,
  companions: r.companions || '',
  difficulty: r.difficulty,
  review: r.review || '',
});

const sameForm = (a, b) => Object.keys(a).every((k) => String(a[k]) === String(b[k]));

// ── 임시저장 (새 기록 작성 중에만, 이 기기에만 저장) ─────────────────
const draftKey = (userId) => `escape-log:draft:${userId}`;
function readDraft(userId) {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? { ...emptyForm(), ...parsed } : null;
  } catch {
    return null;
  }
}
function writeDraft(userId, form) {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(form));
  } catch {
    /* 저장 공간이 없거나 막혀 있어도 작성은 계속 가능 */
  }
}
function clearDraft(userId) {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    /* noop */
  }
}

export default function RecordForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { status, error, reload, getById } = useRecords();
  const record = isEdit ? getById(id) : null;

  if (isEdit) {
    if (status === 'loading' || status === 'idle') return <FormShell isEdit><LoadingState /></FormShell>;
    if (status === 'error') return <FormShell isEdit><ErrorState error={error} onRetry={() => reload()} /></FormShell>;
    if (!record) {
      return (
        <FormShell isEdit>
          <EmptyState title="기록을 찾을 수 없어요" text="삭제되었거나 존재하지 않는 기록이에요." />
        </FormShell>
      );
    }
  }
  // key: 다른 기록으로 이동하면 폼을 새로 만든다
  return <FormBody key={id || 'new'} isEdit={isEdit} record={record} />;
}

function FormShell({ isEdit, children }) {
  const navigate = useNavigate();
  return (
    <>
      <Hero
        title={isEdit ? '기록 수정' : '기록 추가'}
        compact
        left={
          <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로 가기">
            <Icon name="back" size={22} />
          </button>
        }
      />
      <main className="page page--form">{children}</main>
    </>
  );
}

function FormBody({ isEdit, record }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  const { create, update, getById } = useRecords();
  const uid = useId();

  // 수정 기준이 되는 원본 (다른 기기 수정 여부 확인용). 화면을 여는 순간의 값으로 고정.
  const [base, setBase] = useState(record);
  const initial = useMemo(() => (isEdit ? fromRecord(base) : emptyForm()), [isEdit, base]);

  const [restoredDraft] = useState(() => (!isEdit && user ? readDraft(user.id) : null));
  const [form, setForm] = useState(() => (isEdit ? fromRecord(record) : restoredDraft || emptyForm()));
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [draftNotice, setDraftNotice] = useState(Boolean(restoredDraft));
  // 사진: null (변경 없음) | { blob, preview, source } | { remove: true }. 임시저장에는 포함하지 않음
  const [photo, setPhoto] = useState(null);
  const allowLeave = useRef(false);

  const dirty = !sameForm(form, initial) || photo !== null;
  const errors = validate(form);
  const showError = (k) => (submitted || touched[k]) && errors[k];

  // 새 기록: 입력 내용을 이 기기에 자동 임시저장
  useEffect(() => {
    if (isEdit || !user) return;
    const t = setTimeout(() => {
      if (sameForm(form, emptyForm())) clearDraft(user.id);
      else writeDraft(user.id, form);
    }, 400);
    return () => clearTimeout(t);
  }, [form, isEdit, user]);

  // 저장하지 않은 수정 내용이 있을 때 창 닫기/새로고침 경고
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // 앱 안에서 다른 화면으로 이동할 때 확인 (저장 중이거나 저장 완료 후에는 제외)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeave.current && (dirty || saving) && currentLocation.pathname !== nextLocation.pathname,
  );

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaveError(null);
  };
  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return; // 중복 저장 방지
    setSubmitted(true);
    setSaveError(null);
    if (Object.keys(errors).length) {
      const first = ['escape_date', 'cafe_name', 'theme_name', 'result', 'difficulty', 'companions', 'review'].find(
        (k) => errors[k],
      );
      document.getElementById(`${uid}-${first}`)?.focus({ preventScroll: false });
      toast.error('입력하지 않은 항목이 있어요.');
      return;
    }

    setSaving(true);
    try {
      // DB 저장이 성공해야만 아래로 진행된다
      const row = isEdit ? await update(base, form, photo || undefined) : await create(form, photo || undefined);
      if (!isEdit && user) clearDraft(user.id);
      allowLeave.current = true;
      toast.success(isEdit ? '수정한 내용을 저장했어요.' : '기록을 저장했어요!');
      if (isEdit) navigate(`/records/${row.id}`, { replace: true });
      else navigate('/', { replace: true });
    } catch (err) {
      setSaveError(err);
      setSaving(false);
    }
  };

  // 충돌 해결: 최신 내용 불러오기 / 내 내용으로 덮어쓰기
  const latest = isEdit ? getById(base.id) : null;
  const conflict = saveError?.kind === 'conflict';
  const loadLatest = () => {
    if (!latest) return;
    setBase(latest);
    setForm(fromRecord(latest));
    setSaveError(null);
  };
  const keepMine = () => {
    if (!latest) return;
    setBase(latest);
    setSaveError(null);
  };

  const discardDraft = () => {
    if (user) clearDraft(user.id);
    setForm(emptyForm());
    setTouched({});
    setSubmitted(false);
    setDraftNotice(false);
  };

  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate(isEdit ? `/records/${base.id}` : '/');
  };

  return (
    <>
      <Hero
        title={isEdit ? '기록 수정' : '기록 추가'}
        subtitle={isEdit ? '기록을 새롭게 다듬어보세요' : <>다녀온 방탈출의<br />추억을 기록해보세요</>}
        compact
        left={
          <button type="button" className="icon-btn" onClick={goBack} aria-label="뒤로 가기">
            <Icon name="back" size={22} />
          </button>
        }
      />
      <main className="page page--form">
        {draftNotice && (
          <div className="banner banner--info">
            <span>작성 중이던 내용을 불러왔어요.</span>
            <button type="button" className="banner__action" onClick={discardDraft}>
              새로 쓰기
            </button>
          </div>
        )}

        <form className="form-card" onSubmit={onSubmit} noValidate>
          <Field id={`${uid}-photo`} label="사진" icon={<Icon name="image" size={24} className="field__icon--photo" />} stacked>
            <PhotoField
              id={`${uid}-photo`}
              existingPath={isEdit ? base.photo_path : null}
              value={photo}
              onChange={(v) => {
                setPhoto(v);
                setSaveError(null);
              }}
              disabled={saving}
              supported={isPhotoSupported()}
            />
          </Field>

          <Field id={`${uid}-escape_date`} label="탈출 날짜" icon={<PixelIcon name="calendar" size={24} />} error={showError('escape_date')} required>
            <div className="date-input">
              <input
                id={`${uid}-escape_date`}
                type="date"
                className="input"
                value={form.escape_date}
                max="2100-12-31"
                onChange={(e) => set('escape_date', e.target.value)}
                onBlur={() => touch('escape_date')}
                aria-invalid={Boolean(showError('escape_date'))}
                required
              />
              {form.escape_date && <span className="date-input__day">{formatDateWithDay(form.escape_date).slice(-3)}</span>}
            </div>
          </Field>

          <Field id={`${uid}-cafe_name`} label="카페명" icon={<Icon name="pin" size={24} className="field__icon--pin" />} error={showError('cafe_name')} required>
            <input
              id={`${uid}-cafe_name`}
              className="input"
              placeholder="예) 미스터리룸 원주점"
              value={form.cafe_name}
              maxLength={LIMITS.cafe}
              onChange={(e) => set('cafe_name', e.target.value)}
              onBlur={() => touch('cafe_name')}
              aria-invalid={Boolean(showError('cafe_name'))}
              autoComplete="off"
              enterKeyHint="next"
              required
            />
          </Field>

          <Field id={`${uid}-theme_name`} label="테마명" icon={<PixelIcon name="key" size={24} />} error={showError('theme_name')} required>
            <input
              id={`${uid}-theme_name`}
              className="input"
              placeholder="예) 비밀의 실험실"
              value={form.theme_name}
              maxLength={LIMITS.theme}
              onChange={(e) => set('theme_name', e.target.value)}
              onBlur={() => touch('theme_name')}
              aria-invalid={Boolean(showError('theme_name'))}
              autoComplete="off"
              enterKeyHint="next"
              required
            />
          </Field>

          <Field id={`${uid}-result`} label="성공 / 실패" icon={<PixelIcon name="flag" size={24} />} error={showError('result')} required asGroup>
            <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-result-label`}>
              {[
                { v: 'success', label: '성공', icon: 'flag' },
                { v: 'fail', label: '실패', icon: 'x' },
              ].map((o, i) => (
                <button
                  key={o.v}
                  id={i === 0 ? `${uid}-result` : undefined}
                  type="button"
                  role="radio"
                  aria-checked={form.result === o.v}
                  className={`segmented__btn segmented__btn--${o.v} ${form.result === o.v ? 'is-active' : ''}`}
                  onClick={() => {
                    set('result', o.v);
                    touch('result');
                  }}
                >
                  <Icon name={o.icon} size={20} strokeWidth={2.4} />
                  {o.label}
                </button>
              ))}
            </div>
          </Field>

          <Field
            id={`${uid}-companions`}
            label="함께한 사람"
            icon={<Icon name="people" size={24} className="field__icon--people" />}
            error={showError('companions')}
            hint="예) 민지, 수현, 예림 (쉼표로 구분)"
          >
            <input
              id={`${uid}-companions`}
              className="input"
              placeholder="함께한 사람을 입력하세요"
              value={form.companions}
              maxLength={LIMITS.companions}
              onChange={(e) => set('companions', e.target.value)}
              onBlur={() => touch('companions')}
              autoComplete="off"
            />
          </Field>

          <Field id={`${uid}-difficulty`} label="난이도" icon={<Icon name="star" size={24} className="field__icon--star" />} error={showError('difficulty')} required asGroup>
            <div className="star-input">
              <div className="star-input__stars" role="radiogroup" aria-labelledby={`${uid}-difficulty-label`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    id={n === 1 ? `${uid}-difficulty` : undefined}
                    type="button"
                    role="radio"
                    aria-checked={form.difficulty === n}
                    aria-label={`난이도 ${n}`}
                    className={`star-input__btn ${n <= form.difficulty ? 'is-on' : ''}`}
                    onClick={() => {
                      set('difficulty', n);
                      touch('difficulty');
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
                      <path d="m12 3.8 2.5 5.2 5.6.7-4.1 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.7Z" />
                    </svg>
                  </button>
                ))}
              </div>
              <span className="star-input__value">
                <strong>{form.difficulty || '-'}</strong> / 5
                {form.difficulty > 0 && <em>{DIFFICULTY_TEXT[form.difficulty]}</em>}
              </span>
            </div>
          </Field>

          <Field id={`${uid}-review`} label="후기" icon={<Icon name="note" size={24} className="field__icon--note" />} error={showError('review')} stacked>
            <div className="textarea-wrap">
              <textarea
                id={`${uid}-review`}
                className="input textarea"
                placeholder={'이번 방탈출은 어땠나요?\n기억에 남는 순간이나 힌트를 자유롭게 남겨주세요!'}
                value={form.review}
                maxLength={REVIEW_MAX}
                rows={6}
                onChange={(e) => set('review', e.target.value)}
                onBlur={() => touch('review')}
              />
              <span className="textarea-wrap__count">
                {form.review.length} / {REVIEW_MAX}
              </span>
            </div>
          </Field>

          {isEdit && (
            <p className="form-card__meta">
              처음 기록: {formatDateTime(base.created_at)} · 마지막 수정: {formatDateTime(base.updated_at)}
            </p>
          )}

          {saveError && (
            <div className="banner banner--error" role="alert">
              <div>
                <strong>저장하지 못했어요.</strong> {saveError.message}
                {!conflict && <div className="banner__sub">입력한 내용은 그대로 남아 있어요. 다시 저장해주세요.</div>}
              </div>
              {conflict && latest && latest.updated_at !== base.updated_at && (
                <div className="banner__actions">
                  <button type="button" className="banner__action" onClick={loadLatest}>최신 내용 불러오기</button>
                  <button type="button" className="banner__action" onClick={keepMine}>내 수정으로 덮어쓰기</button>
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={goBack} disabled={saving}>
              취소
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving} aria-busy={saving}>
              {saving ? (
                <>
                  <Spinner size={18} /> 저장 중…
                </>
              ) : (
                <>
                  <Icon name="cloud" size={20} /> 저장
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={saving ? '아직 저장 중이에요' : '작성을 그만둘까요?'}
        message={
          saving
            ? '저장이 끝날 때까지 잠시만 기다려주세요.'
            : isEdit
              ? '수정한 내용은 저장되지 않아요.'
              : photo?.blob
                ? '작성 중인 글은 임시저장되지만, 선택한 사진은 저장되지 않아요.'
                : '작성 중인 내용은 이 기기에 임시저장되어 다음에 이어서 쓸 수 있어요.'
        }
        confirmLabel={saving ? '기다리기' : '나가기'}
        cancelLabel={saving ? '닫기' : '계속 작성'}
        danger={!saving && isEdit}
        onConfirm={() => (saving ? blocker.reset?.() : blocker.proceed?.())}
        onCancel={() => blocker.reset?.()}
      />
    </>
  );
}

function Field({ id, label, icon, error, hint, required, asGroup, stacked, children }) {
  const LabelTag = asGroup ? 'span' : 'label';
  return (
    <div className={`field ${stacked ? 'field--stacked' : ''} ${error ? 'has-error' : ''}`}>
      <div className="field__head">
        <span className="field__icon" aria-hidden="true">{icon}</span>
        <LabelTag className="field__label" id={`${id}-label`} {...(asGroup ? {} : { htmlFor: id })}>
          {label}
          {required && <span className="field__req" aria-label="필수">✦</span>}
        </LabelTag>
      </div>
      <div className="field__control">
        {children}
        {error ? (
          <p className="field__error" role="alert">{error}</p>
        ) : (
          hint && <p className="field__hint">{hint}</p>
        )}
      </div>
    </div>
  );
}
