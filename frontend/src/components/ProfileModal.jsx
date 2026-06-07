import { useState, useEffect } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';

export default function ProfileModal({ onClose }) {
  const { t, toast } = useApp();
  const [alias, setAlias] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    api('GET', '/api/users/me')
      .then(p => { if (p) { setAlias(p.alias || ''); setPhone(p.phoneNumber || ''); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    if (!alias.trim()) { toast('Display name cannot be empty'); return; }
    try {
      await api('PATCH', '/api/users/me', { alias: alias.trim(), phoneNumber: phone.trim() || null });
      toast(t('profileSaved'));
      onClose();
    } catch (e) { toast(e.message); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-header">
          <span className="modal-title">{t('profileTitle')}</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <label className="field-label">{t('aliasLabel')}</label>
          <input
            className="modal-input"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            autoComplete="off"
          />
          <label className="field-label">{t('phoneLabel')}</label>
          <input
            className="modal-input"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+972501234567"
          />
          <p className="field-hint">{t('phoneHint')}</p>
          <button className="primary-btn" style={{ flex: 'none' }} onClick={save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
