import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { AppError, toAppError } from './errors';

export const PHOTO_BUCKET = 'escape-photos';
const MAX_EDGE = 1600; // 저장할 사진의 긴 변 최대 픽셀
const JPEG_QUALITY = 0.85;
const UPLOAD_TIMEOUT_MS = 45000;
const URL_TTL_SEC = 60 * 60; // 서명된 주소 유효 시간

const SETUP_MESSAGE = '사진 저장소가 아직 준비되지 않았어요. supabase/002_photos.sql 을 먼저 실행해주세요.';

function toPhotoError(err, fallback) {
  const msg = String(err?.message || '');
  if (/bucket not found/i.test(msg)) return new AppError(SETUP_MESSAGE, { kind: 'db', cause: err });
  if (/row-level security|unauthorized|not allowed/i.test(msg)) {
    return new AppError('사진을 저장할 권한이 없어요. 다시 로그인하거나 사진 설정(002_photos.sql)을 확인해주세요.', { kind: 'auth', cause: err });
  }
  if (/payload too large|exceeded the maximum/i.test(msg)) {
    return new AppError('사진 용량이 너무 커요. 다른 사진을 선택해주세요.', { kind: 'validation', cause: err });
  }
  return toAppError(err, fallback);
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('timed out'), { name: 'TimeoutError' })), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

export function photoSetupError() {
  return new AppError(SETUP_MESSAGE, { kind: 'db' });
}

/** 사진 업로드 → 저장 경로 반환 */
export async function uploadPhoto(userId, blob) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new AppError('인터넷 연결이 끊어져 있어요. 연결을 확인한 뒤 다시 시도해주세요.', { kind: 'network' });
  }
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${id}.jpg`;
  try {
    const { error } = await withTimeout(
      supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' }),
      UPLOAD_TIMEOUT_MS,
    );
    if (error) throw error;
  } catch (err) {
    throw toPhotoError(err, '사진을 업로드하지 못했어요.');
  }
  return path;
}

/** 더 이상 쓰지 않는 사진 삭제 (실패해도 기록에는 영향 없음) */
export async function removePhotos(paths) {
  const list = paths.filter(Boolean);
  if (!list.length) return;
  list.forEach((p) => urlCache.delete(p));
  try {
    await supabase.storage.from(PHOTO_BUCKET).remove(list);
  } catch {
    /* 정리 실패는 무시 */
  }
}

// ── 비공개 사진 보기용 서명 주소 (여러 요청을 모아서 한 번에) ─────────
const urlCache = new Map(); // path -> { url, expires } | { promise }
let pending = new Map(); // path -> [resolve]
let flushTimer = null;

function flush() {
  flushTimer = null;
  const batch = pending;
  pending = new Map();
  const paths = [...batch.keys()];
  supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, URL_TTL_SEC)
    .then(({ data, error }) => {
      const byPath = new Map((error ? [] : data || []).map((d) => [d.path, d.signedUrl]));
      for (const p of paths) {
        const url = byPath.get(p) || null;
        if (url) urlCache.set(p, { url, expires: Date.now() + (URL_TTL_SEC - 120) * 1000 });
        else urlCache.delete(p);
        batch.get(p).forEach((resolve) => resolve(url));
      }
    })
    .catch(() => {
      for (const p of paths) {
        urlCache.delete(p);
        batch.get(p).forEach((resolve) => resolve(null));
      }
    });
}

export function getPhotoUrl(path) {
  if (!path) return Promise.resolve(null);
  const hit = urlCache.get(path);
  if (hit?.url && hit.expires > Date.now()) return Promise.resolve(hit.url);
  if (hit?.promise) return hit.promise;
  const promise = new Promise((resolve) => {
    if (!pending.has(path)) pending.set(path, []);
    pending.get(path).push(resolve);
    if (!flushTimer) flushTimer = setTimeout(flush, 30);
  });
  urlCache.set(path, { promise });
  return promise;
}

/** 사진 경로 → 화면에 보여줄 주소. { url, failed } */
export function usePhotoUrl(path) {
  const cached = path ? urlCache.get(path) : null;
  const [state, setState] = useState(() => ({
    path,
    url: cached?.url && cached.expires > Date.now() ? cached.url : null,
    failed: false,
  }));
  useEffect(() => {
    let active = true;
    if (!path) return undefined;
    getPhotoUrl(path).then((url) => active && setState({ path, url, failed: !url }));
    return () => {
      active = false;
    };
  }, [path]);
  return state.path === path ? state : { path, url: null, failed: false };
}

// ── 이미지 처리 ─────────────────────────────────────────────────────
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new AppError('사진을 열 수 없어요. JPG 또는 PNG 사진을 선택해주세요.', { kind: 'validation' }));
    img.src = src;
  });
}

/**
 * 자르기 결과(원본 기준 픽셀 영역)와 회전값으로 최종 JPEG 를 만든다.
 * rotation 은 0/90/180/270.
 */
export async function renderCroppedPhoto(src, crop, rotation = 0) {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const swap = rotation % 180 !== 0;
  const bw = swap ? img.naturalHeight : img.naturalWidth;
  const bh = swap ? img.naturalWidth : img.naturalHeight;

  // 1) 회전된 전체 이미지
  const rotated = document.createElement('canvas');
  rotated.width = bw;
  rotated.height = bh;
  const rctx = rotated.getContext('2d');
  rctx.translate(bw / 2, bh / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  // 2) 자르기 + 크기 줄이기
  const scale = Math.min(1, MAX_EDGE / Math.max(crop.width, crop.height));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(crop.width * scale));
  out.height = Math.max(1, Math.round(crop.height * scale));
  const octx = out.getContext('2d');
  octx.fillStyle = '#000';
  octx.fillRect(0, 0, out.width, out.height);
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, out.width, out.height);

  const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new AppError('사진을 처리하지 못했어요. 다른 사진으로 시도해주세요.', { kind: 'validation' });
  return blob;
}

const SOURCE_MAX_EDGE = 3000; // 편집용 원본 최대 크기 (휴대폰 캔버스 한도 대비)

/** 보관함에서 고른 파일 → 편집용 이미지 주소 (너무 크면 먼저 줄임) */
export async function prepareSource(file) {
  if (file.type && !file.type.startsWith('image/')) {
    throw new AppError('사진 파일만 선택할 수 있어요.', { kind: 'validation' });
  }
  const original = URL.createObjectURL(file);
  let img;
  try {
    img = await loadImage(original);
  } catch (err) {
    URL.revokeObjectURL(original);
    throw err;
  }
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  if (longEdge <= SOURCE_MAX_EDGE) return original;

  const scale = SOURCE_MAX_EDGE / longEdge;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(original);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new AppError('사진을 처리하지 못했어요. 다른 사진으로 시도해주세요.', { kind: 'validation' });
  return URL.createObjectURL(blob);
}
