import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message, { type = 'info', duration } = {}) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-2), { id, message, type }]);
      // 오류는 더 오래 보여준다
      setTimeout(() => dismiss(id), duration ?? (type === 'error' ? 6000 : 2800));
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (m, o) => show(m, { ...o, type: 'success' }),
      error: (m, o) => show(m, { ...o, type: 'error' }),
      info: (m, o) => show(m, { ...o, type: 'info' }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button key={t.id} type="button" className={`toast toast--${t.type}`} onClick={() => dismiss(t.id)}>
            <span className="toast__icon" aria-hidden="true">
              {t.type === 'success' ? '✦' : t.type === 'error' ? '!' : '·'}
            </span>
            <span>{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
