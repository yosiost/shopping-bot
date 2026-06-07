import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import VoucherCard from './VoucherCard.jsx';
import QRModal from './QRModal.jsx';

export default function VouchersPane() {
  const { t, toast, confirm } = useApp();
  const [vouchers,   setVouchers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen,    setAddOpen]    = useState(false);
  const [qrVoucher,  setQrVoucher]  = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api('GET', '/api/vouchers');
      if (data !== null) setVouchers(data);
    } catch (e) { toast(e.message); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api('POST', '/api/vouchers/refresh');
      if (data) setVouchers(data);
    } catch (e) { toast(e.message); }
    finally { setRefreshing(false); }
  }, [toast]);

  const updateBalance = useCallback(async (number, balance) => {
    setVouchers(prev => prev.map(v => v.voucherNumber === number ? { ...v, balance } : v));
    // Keep QR modal in sync if open
    setQrVoucher(prev => prev?.voucherNumber === number ? { ...prev, balance } : prev);
    api('PATCH', `/api/vouchers/${encodeURIComponent(number)}/balance`, { balance })
      .catch(e => { toast(e.message); load(); });
  }, [toast, load]);

  const deleteVoucher = useCallback(async (number) => {
    const ok = await confirm(t('confirmDelVoucher'));
    if (!ok) return;
    setVouchers(prev => prev.filter(v => v.voucherNumber !== number));
    api('DELETE', `/api/vouchers/${encodeURIComponent(number)}`)
      .catch(e => { toast(e.message); load(); });
  }, [confirm, t, toast, load]);

  const addVoucher = useCallback(async (formData) => {
    try {
      await api('POST', '/api/vouchers', {
        voucherNumber: formData.voucherNumber,
        provider:      formData.provider,
        amount:        parseFloat(formData.amount),
        balance:       null,
        expiryDate:    formData.expiryDate,
        vendor:        formData.vendor  || null,
        remarks:       formData.remarks || null,
      });
      setAddOpen(false);
      toast('Voucher added ✓');
      load();
    } catch (e) { toast(e.message); }
  }, [toast, load]);

  return (
    <div className="vouchers-pane">
      <div className="voucher-toolbar">
        <button
          className={`add-voucher-btn${addOpen ? ' open' : ''}`}
          onClick={() => setAddOpen(v => !v)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('addVoucher')}
        </button>
        <button
          className={`refresh-btn${refreshing ? ' spinning' : ''}`}
          onClick={refresh}
          disabled={refreshing}
          title="Refresh balances"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>

      {addOpen && <AddVoucherForm t={t} onSubmit={addVoucher} onCancel={() => setAddOpen(false)} />}

      {loading ? null : vouchers.length === 0 ? (
        <div className="list-empty">{t('noVouchers')}</div>
      ) : (
        <div className="vouchers-list">
          {vouchers.map(v => (
            <VoucherCard
              key={v.voucherNumber}
              voucher={v}
              onQR={() => setQrVoucher(v)}
              onDelete={() => deleteVoucher(v.voucherNumber)}
              onUpdateBalance={(bal) => updateBalance(v.voucherNumber, bal)}
            />
          ))}
        </div>
      )}

      {qrVoucher && <QRModal voucher={qrVoucher} onClose={() => setQrVoucher(null)} />}
    </div>
  );
}

function AddVoucherForm({ t, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    provider: '', voucherNumber: '', amount: '', expiryDate: '', vendor: '', remarks: '',
  });
  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="add-voucher-card">
      <form className="voucher-form" onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
        <input required      placeholder={t('provider')}      value={form.provider}      onChange={set('provider')} />
        <input required      placeholder={t('voucherNumber')} value={form.voucherNumber} onChange={set('voucherNumber')} />
        <input required type="number" step="0.01" placeholder={t('amount')} value={form.amount} onChange={set('amount')} />
        <input required type="date"   value={form.expiryDate} onChange={set('expiryDate')} />
        <input              placeholder={t('vendor')}         value={form.vendor}        onChange={set('vendor')} />
        <input              placeholder={t('remarks')}        value={form.remarks}       onChange={set('remarks')} />
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>{t('cancel')}</button>
          <button type="submit"  className="primary-btn">{t('save')}</button>
        </div>
      </form>
    </div>
  );
}
