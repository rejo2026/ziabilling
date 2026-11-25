import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

interface Props {
  forced?: boolean; // first login with a temporary password: cannot be dismissed
  onClose: () => void;
  onChanged: () => void;
}

export default function ChangePasswordModal({ forced, onClose, onChanged }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) return setError('New password must be at least 8 characters.');
    if (next !== confirm) return setError('The new passwords do not match.');
    setBusy(true);
    try {
      const res = await fetch('http://localhost:4200/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next })
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Could not change the password.');
      else onChanged();
    } catch {
      setError('Cannot reach the Zia-Billing server.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <KeyRound size={18} className="text-amber-400" />
            {forced ? 'Set a new password' : 'Change password'}
          </div>
          {!forced && (
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
          )}
        </div>
        {forced && (
          <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-lg p-2.5">
            You are using a temporary password. Choose your own password to continue.
          </p>
        )}
        {error && <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-800/50 rounded-lg p-2.5">{error}</p>}
        <div className="space-y-3">
          <input className={input} type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} required autoFocus />
          <input className={input} type="password" placeholder="New password (min 8 characters)" value={next} onChange={e => setNext(e.target.value)} required />
          <input className={input} type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        </div>
        <button disabled={busy} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50">
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
