import { supabase } from './supabase';
import { AppError, toAppError } from './errors';

const TABLE = 'escape_records';
const BASE_COLUMNS =
  'id, user_id, escape_date, cafe_name, theme_name, result, companions, difficulty, review, created_at, updated_at';

// 사진 컬럼(photo_path)은 002_photos.sql 실행 후에 생긴다. 없으면 사진 없이 기존대로 동작.
let photoColumn = true;
const cols = () => (photoColumn ? `${BASE_COLUMNS}, photo_path` : BASE_COLUMNS);
export const isPhotoSupported = () => photoColumn;
const isMissingPhotoColumn = (err) => {
  const e = err?.cause || err;
  return (e?.code === '42703' || e?.code === 'PGRST204') && /photo_path/.test(String(e?.message || ''));
};
const TIMEOUT_MS = 15000;

export const LIMITS = { cafe: 100, theme: 100, companions: 200, review: 5000 };

/** 요청이 무한정 걸리지 않도록 타임아웃을 건다 */
async function run(buildQuery) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new AppError('인터넷 연결이 끊어져 있어요. 연결을 확인한 뒤 다시 시도해주세요.', { kind: 'network' });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { data, error } = await buildQuery().abortSignal(controller.signal);
    if (error) throw error;
    return data;
  } catch (err) {
    throw toAppError(err);
  } finally {
    clearTimeout(timer);
  }
}

/** 폼 값 → DB 에 보낼 값 (정리 + 검증) */
export function toPayload(form) {
  const payload = {
    escape_date: form.escape_date,
    cafe_name: form.cafe_name.trim(),
    theme_name: form.theme_name.trim(),
    result: form.result,
    companions: form.companions.trim(),
    difficulty: Number(form.difficulty),
    review: form.review.replace(/\s+$/, ''),
  };
  const errors = validate(payload);
  if (Object.keys(errors).length) {
    throw new AppError('입력하지 않은 항목이 있어요.', { kind: 'validation', cause: errors });
  }
  return payload;
}

export function validate(p) {
  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.escape_date || '')) errors.escape_date = '탈출 날짜를 선택해주세요.';
  if (!p.cafe_name?.trim()) errors.cafe_name = '카페명을 입력해주세요.';
  else if (p.cafe_name.trim().length > LIMITS.cafe) errors.cafe_name = `${LIMITS.cafe}자 이내로 입력해주세요.`;
  if (!p.theme_name?.trim()) errors.theme_name = '테마명을 입력해주세요.';
  else if (p.theme_name.trim().length > LIMITS.theme) errors.theme_name = `${LIMITS.theme}자 이내로 입력해주세요.`;
  if (p.result !== 'success' && p.result !== 'fail') errors.result = '성공 / 실패를 선택해주세요.';
  if ((p.companions || '').length > LIMITS.companions) errors.companions = `${LIMITS.companions}자 이내로 입력해주세요.`;
  const d = Number(p.difficulty);
  if (!Number.isInteger(d) || d < 1 || d > 5) errors.difficulty = '난이도를 선택해주세요.';
  if ((p.review || '').length > LIMITS.review) errors.review = `${LIMITS.review}자 이내로 입력해주세요.`;
  return errors;
}

export async function fetchRecords(userId) {
  try {
    return await selectAll(userId);
  } catch (err) {
    if (!photoColumn || !isMissingPhotoColumn(err)) throw err;
    photoColumn = false;
    return selectAll(userId);
  }
}

function selectAll(userId) {
  return run(() =>
    supabase
      .from(TABLE)
      .select(cols())
      .eq('user_id', userId) // RLS 로 이미 보호되지만 명시적으로 한 번 더 제한
      .order('escape_date', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

export async function createRecord(userId, payload) {
  const row = await run(() =>
    supabase.from(TABLE).insert({ ...payload, user_id: userId }).select(cols()).single(),
  );
  if (!row?.id) throw new AppError('저장 결과를 확인하지 못했어요. 목록을 새로고침해 확인해주세요.', { kind: 'db' });
  return row;
}

/**
 * 기존 기록 수정.
 * updated_at 이 내가 불러온 값과 같을 때만 수정 → 다른 기기에서 먼저 고친 내용을 덮어쓰지 않음.
 */
export async function updateRecord(userId, original, payload) {
  const row = await run(() =>
    supabase
      .from(TABLE)
      .update(payload)
      .eq('id', original.id)
      .eq('user_id', userId)
      .eq('updated_at', original.updated_at)
      .select(cols())
      .maybeSingle(),
  );
  if (!row) {
    throw new AppError(
      '다른 기기에서 먼저 수정되었거나 삭제된 기록이에요. 최신 내용을 불러왔으니 확인 후 다시 수정해주세요.',
      { kind: 'conflict' },
    );
  }
  return row;
}

export async function deleteRecord(userId, id) {
  const rows = await run(() =>
    supabase.from(TABLE).delete().eq('id', id).eq('user_id', userId).select('id'),
  );
  if (!rows || rows.length === 0) {
    throw new AppError('이미 삭제되었거나 찾을 수 없는 기록이에요.', { kind: 'not_found' });
  }
}
