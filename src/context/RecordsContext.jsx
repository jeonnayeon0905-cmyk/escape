import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../lib/records';
import { sortRecords } from '../lib/stats';

const RecordsContext = createContext(null);

export function RecordsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const reqRef = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!userId) return;
      const req = ++reqRef.current;
      if (!silent) setStatus((s) => (s === 'ready' ? 'ready' : 'loading'));
      try {
        const rows = await api.fetchRecords(userId);
        if (req !== reqRef.current) return;
        setRecords(rows);
        setError(null);
        setStatus('ready');
      } catch (err) {
        if (req !== reqRef.current) return;
        setError(err);
        // 이미 불러온 기록이 있으면 그대로 보여주고, 오류만 알린다
        setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
      }
    },
    [userId],
  );

  // 사용자가 바뀌면 이전 사용자의 데이터를 즉시 비운다
  useEffect(() => {
    reqRef.current++;
    setRecords([]);
    setError(null);
    setStatus(userId ? 'loading' : 'idle');
    if (userId) load();
  }, [userId, load]);

  // 다른 기기에서 바뀐 내용 반영: 앱으로 돌아오거나 인터넷이 다시 연결되면 조용히 새로고침
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => document.visibilityState === 'visible' && load({ silent: true });
    const onOnline = () => load({ silent: true });
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [userId, load]);

  // 아래 함수들은 DB 저장이 성공한 뒤에만 화면 상태를 바꾼다
  const create = useCallback(
    async (form) => {
      const row = await api.createRecord(userId, api.toPayload(form));
      setRecords((list) => [row, ...list.filter((r) => r.id !== row.id)]);
      return row;
    },
    [userId],
  );

  const update = useCallback(
    async (original, form) => {
      try {
        const row = await api.updateRecord(userId, original, api.toPayload(form));
        setRecords((list) => list.map((r) => (r.id === row.id ? row : r)));
        return row;
      } catch (err) {
        if (err.kind === 'conflict') load({ silent: true });
        throw err;
      }
    },
    [userId, load],
  );

  const remove = useCallback(
    async (id) => {
      try {
        await api.deleteRecord(userId, id);
      } catch (err) {
        if (err.kind === 'not_found') setRecords((list) => list.filter((r) => r.id !== id));
        throw err;
      }
      setRecords((list) => list.filter((r) => r.id !== id));
    },
    [userId],
  );

  const sorted = useMemo(() => sortRecords(records, 'latest'), [records]);
  const getById = useCallback((id) => records.find((r) => r.id === id) || null, [records]);

  const value = useMemo(
    () => ({ records: sorted, status, error, reload: load, create, update, remove, getById }),
    [sorted, status, error, load, create, update, remove, getById],
  );
  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export const useRecords = () => useContext(RecordsContext);
