import { useState } from 'react';
import { useApp } from '../App.jsx';

function expiryInfo(dateStr) {
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86_400_000);
  if (days <= 7)  return { cls: 'critical', days };
  if (days <= 14) return { cls: 'urgent',   days };
  if (days <= 30) return { cls: 'soon',     days };
  return { cls: '', days };
}

export default function VoucherCard({ voucher: v, onQR, onDelete, onUpdateBalance }) {
  const { t } = useApp();
  const [editing,  setEditing]  = useState(false);
  const [balInput, setBalInput] = useState('');
  const exp = expiryInfo(v.expiryDate);

  const openEdit = (e) => {
    e.stopPropagation();
    setBalInput(v.balance?.toString() ?? '');
    setEditing(true);
  };

  const commitEdit = () => {
    const val = parseFloat(balInput);
    if (isNaN(val) || val < 0) return;
    onUpdateBalance(val);
    setEditing(false);
  };

  const handleCardClick = () => { if (!editing) onQR(); };

  return (
    <div className={`voucher-card ${exp.cls}`} onClick={handleCardClick}>
      <div className="vc-body">
        <div className="vc-top">
          <div className="vc-left">
            <div className="vc-provider">{v.provider}</div>
            {editing ? (
              <div className="vc-bal-edit" onClick={e => e.stopPropagation()}>
                <input
                  className="bal-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={balInput}
                  onChange={e => setBalInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  commitEdit();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  autoFocus
                />
                <button className="bal-save"   onClick={e => { e.stopPropagation(); commitEdit(); }}>✓</button>
                <button className="bal-cancel" onClick={e => { e.stopPropagation(); setEditing(false); }}>✕</button>
              </div>
            ) : (
              <div className="vc-balance-row">
                <span className="vc-balance">₪{v.balance?.toLocaleString() ?? '—'}</span>
                <button className="vc-edit-bal" onClick={openEdit} aria-label="Edit balance">
                  <PencilIcon />
                </button>
              </div>
            )}
            {v.vendor && <div className="vc-vendor">{v.vendor}</div>}
          </div>

          <div className="vc-right">
            <span className={`expiry-badge ${exp.cls}`}>{t('daysLeft', exp.days)}</span>
            <button
              className="vc-delete"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              aria-label="Delete voucher"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        <div className="vc-divider" />
        <div className="vc-meta">
          <span className="vc-date">{t('expires', v.expiryDate)}</span>
          <span className="vc-number">{v.voucherNumber}</span>
          {v.remarks && <span className="vc-remarks">{v.remarks}</span>}
        </div>
      </div>

      <div className="vc-footer">
        <div className="vc-tap-hint">
          <QRIcon /> Tap card for QR code
        </div>
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  );
}

function QRIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="18" width="3" height="3"/>
    </svg>
  );
}
