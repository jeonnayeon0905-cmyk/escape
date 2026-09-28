/**
 * Supabase / 네트워크 오류를 사용자에게 보여줄 한국어 문구로 바꿉니다.
 */
export class AppError extends Error {
  constructor(message, { kind = 'unknown', cause } = {}) {
    super(message);
    this.kind = kind; // 'network' | 'auth' | 'conflict' | 'not_found' | 'validation' | 'db' | 'unknown'
    this.cause = cause;
  }
}

export function toAppError(err, fallback = '알 수 없는 오류가 발생했어요.') {
  if (err instanceof AppError) return err;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new AppError('인터넷 연결이 끊어져 있어요. 연결을 확인한 뒤 다시 시도해주세요.', { kind: 'network', cause: err });
  }

  const name = err?.name || '';
  const message = String(err?.message || '');
  const code = String(err?.code || '');
  const status = Number(err?.status || 0);

  if (name === 'AbortError' || name === 'TimeoutError' || /timed? ?out/i.test(message)) {
    return new AppError('서버 응답이 너무 늦어요. 잠시 후 다시 시도해주세요.', { kind: 'network', cause: err });
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return new AppError('서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.', { kind: 'network', cause: err });
  }
  if (status === 401 || code === 'PGRST301' || /jwt/i.test(message)) {
    return new AppError('로그인이 만료되었어요. 다시 로그인해주세요.', { kind: 'auth', cause: err });
  }
  if (code === '42501' || status === 403) {
    return new AppError('이 기록에 접근할 권한이 없어요.', { kind: 'auth', cause: err });
  }
  if (code === '23514' || code === '22001' || code === '23502' || code === '22P02') {
    return new AppError('입력값이 올바르지 않아요. 내용을 확인해주세요.', { kind: 'validation', cause: err });
  }
  if (code === '42P01' || code === 'PGRST205') {
    return new AppError('데이터베이스 테이블이 없어요. supabase/schema.sql 을 먼저 실행해주세요.', { kind: 'db', cause: err });
  }
  if (code || status >= 500) {
    return new AppError(`데이터베이스 오류가 발생했어요. (${code || status})`, { kind: 'db', cause: err });
  }
  return new AppError(fallback, { kind: 'unknown', cause: err });
}
