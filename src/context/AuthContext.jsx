import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // OAuth 리다이렉트 실패 시 URL 에 오류가 담겨 돌아온다
    const params = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, '&'));
    const urlError = params.get('error_description') || params.get('error');
    if (urlError) setAuthError(`로그인에 실패했어요: ${decodeURIComponent(urlError.replace(/\+/g, ' '))}`);

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(toAppError(error).message);
        setSession(data?.session ?? null);
      })
      .finally(() => active && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      const msg = toAppError(error, '로그인을 시작하지 못했어요.').message;
      setAuthError(msg);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw toAppError(error, '로그아웃하지 못했어요.');
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading, authError, signInWithGoogle, signOut }),
    [session, loading, authError, signInWithGoogle, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
