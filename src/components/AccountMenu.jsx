import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { Spinner } from './ui';
import { useAuth } from '../context/AuthContext';
import { useRecords } from '../context/RecordsContext';
import { useToast } from '../context/ToastContext';
import { toISODate } from '../lib/date';

/** 우측 상단 프로필 버튼 → 계정 시트 (백업 다운로드, 로그아웃) */
export default function AccountMenu() {
  const { user, signOut } = useAuth();
  const { records } = useRecords();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  const meta = user?.user_metadata || {};
  const name = meta.full_name || meta.name || user?.email || '사용자';
  const avatar = meta.avatar_url || meta.picture;

  const downloadBackup = () => {
    const data = records.map(({ user_id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), records: data }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `방탈출기록_백업_${toISODate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast.success(`${data.length}개의 기록을 백업 파일로 저장했어요.`);
  };

  const logout = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="avatar-btn" onClick={() => setOpen(true)} aria-label="계정 메뉴 열기">
        {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <span>{name.slice(0, 1)}</span>}
      </button>
      <dialog
        ref={ref}
        className="dialog dialog--sheet"
        aria-label="계정"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => e.target === ref.current && setOpen(false)}
      >
        <div className="dialog__body">
          <div className="account">
            <span className="avatar-btn avatar-btn--lg" aria-hidden="true">
              {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <span>{name.slice(0, 1)}</span>}
            </span>
            <div className="account__text">
              <p className="account__name">{name}</p>
              <p className="account__email">{user?.email}</p>
            </div>
          </div>
          <p className="account__note">기록은 Google 계정에 연결된 클라우드에 안전하게 저장돼요. 다른 기기에서도 같은 계정으로 로그인하면 그대로 볼 수 있어요.</p>
          <div className="account__actions">
            <button type="button" className="btn btn--secondary" onClick={downloadBackup} disabled={records.length === 0}>
              <Icon name="download" size={18} /> 백업 파일 받기 (JSON)
            </button>
            <button type="button" className="btn btn--ghost" onClick={logout} disabled={busy}>
              {busy ? <Spinner size={16} /> : <Icon name="logout" size={18} />} 로그아웃
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
