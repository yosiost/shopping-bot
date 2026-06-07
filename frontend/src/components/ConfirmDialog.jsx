import { useApp } from '../App.jsx';

export default function ConfirmDialog({ msg, onResult }) {
  const { t } = useApp();

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onResult(false); }}>
      <div className="dialog">
        <p className="dialog-msg">{msg}</p>
        <div className="dialog-btns">
          <button className="dialog-cancel"  onClick={() => onResult(false)}>{t('cancel')}</button>
          <button className="dialog-confirm" onClick={() => onResult(true)}>{t('confirm')}</button>
        </div>
      </div>
    </div>
  );
}
