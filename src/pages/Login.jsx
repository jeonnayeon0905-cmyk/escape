import { useState } from 'react';
import Hero from '../components/Hero';
import PixelIcon from '../components/PixelIcon';
import { Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function Login() {
  const { signInWithGoogle, authError } = useAuth();
  const [busy, setBusy] = useState(false);

  const onLogin = async () => {
    setBusy(true);
    try {
      await signInWithGoogle(); // 성공하면 Google 로그인 페이지로 이동
    } catch {
      setBusy(false);
    }
  };

  return (
    <>
      <Hero title="방탈출 기록" subtitle={<>우리가 풀어낸<br />또 하나의 이야기</>} />
      <main className="page">
        <section className="card login-card">
          <div className="login-card__icons" aria-hidden="true">
            <PixelIcon name="book" size={36} />
            <PixelIcon name="key" size={36} />
            <PixelIcon name="lock" size={36} />
          </div>
          <h2 className="login-card__title">나만의 방탈출 기록장</h2>
          <p className="login-card__text">
            다녀온 방탈출을 기록하고 통계로 돌아보세요.
            <br />
            기록은 클라우드에 저장되어 휴대폰을 바꿔도 그대로 남아요.
          </p>
          <button type="button" className="btn btn--google btn--lg" onClick={onLogin} disabled={busy}>
            {busy ? <Spinner size={18} /> : <GoogleLogo />}
            Google로 로그인
          </button>
          {authError && (
            <p className="banner banner--error" role="alert">
              {authError}
            </p>
          )}
          <p className="login-card__fine">한 번 로그인하면 이 기기에서 로그인 상태가 유지돼요.</p>
        </section>
      </main>
    </>
  );
}
