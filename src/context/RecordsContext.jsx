import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../lib/records';
import { photoSetupError, removePhotos, uploadPhoto } from '../lib/photos';
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
  /**
   * photo: undefined (사진 변경 없음) | { blob } (새 사진) | { remove: true } (사진 삭제)
   * 사진은 먼저 업로드하고, DB 저장이 실패하면 방금 올린 사진을 지운다.
   */
  const prepare = useCallback(
    async (form, photo) => {
      const payload = api.toPayload(form);
      let uploaded = null;
      if (photo?.blob || photo?.remove) {
        if (!api.isPhotoSupported()) throw photoSetupError();
        if (photo.blob) uploaded = await uploadPhoto(userId, photo.blob);
        payload.photo_path = uploaded;
      }
      return { payload, uploaded };
    },
    [userId],
  );

  const create = useCallback(
    async (form, photo) => {
      const { payload, uploaded } = await prepare(form, photo);
      let row;
      try {
        row = await api.createRecord(userId, payload);
      } catch (err) {
        removePhotos([uploaded]);
        throw err;
      }
      setRecords((list) => [row, ...list.filter((r) => r.id !== row.id)]);
      return row;
    },
    [userId, prepare],
  );

  const update = useCallback(
    async (original, form, photo) => {
      let prepared;
      try {
        prepared = await prepare(form, photo);
        const row = await api.updateRecord(userId, original, prepared.payload);
        setRecords((list) => list.map((r) => (r.id === row.id ? row : r)));
        // 새 사진으로 바꾸거나 지웠다면, DB 저장 성공 후에 이전 사진 정리
        if ('photo_path' in prepared.payload && original.photo_path && original.photo_path !== row.photo_path) {
          removePhotos([original.photo_path]);
        }
        return row;
      } catch (err) {
        removePhotos([prepared?.uploaded]);
        if (err.kind === 'conflict') load({ silent: true });
        throw err;
      }
    },
    [userId, load, prepare],
  );

  const remove = useCallback(
    async (id) => {
      const photoPath = records.find((r) => r.id === id)?.photo_path;
      try {
        await api.deleteRecord(userId, id);
      } catch (err) {
        if (err.kind === 'not_found') setRecords((list) => list.filter((r) => r.id !== id));
        throw err;
      }
      setRecords((list) => list.filter((r) => r.id !== id));
      removePhotos([photoPath]);
    },
    [userId, records],
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
