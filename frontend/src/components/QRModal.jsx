import { useEffect, useRef } from 'react';
import { useApp } from '../App.jsx';
import QRCode from 'qrcode';

export default function QRModal({ voucher, onClose }) {
  const { t } = useApp();
  const canvasRef  = useRef(null);
  const wakeLock   = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, voucher.voucherNumber, {
        width: 260,
        margin: 2,
        color: { dark: '#111827', light: '#ffffff' },
      }).catch(console.error);
    }

    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lk => { wakeLock.current = lk; }).catch(() => {});
    }

    return () => {
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [voucher.voucherNumber]);

  // Close on back-swipe / Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="qr-sheet">
        <div className="qr-header">
          <div>
            <div className="qr-provider">{voucher.provider}</div>
            <div className="qr-balance">₪{voucher.balance?.toLocaleString() ?? '—'}</div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="qr-canvas-wrap">
          <canvas ref={canvasRef} />
        </div>

        <div className="qr-number">{voucher.voucherNumber}</div>
        <p className="qr-hint">{t('scanAtCheckout')}</p>
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
