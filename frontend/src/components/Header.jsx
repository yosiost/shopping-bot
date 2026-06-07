import { useApp } from '../App.jsx';

export default function Header({ user, lang, onToggleLang, onSignOut, onProfile }) {
  const { t } = useApp();

  return (
    <header className="app-header">
      <span className="header-title">{t('appTitle')}</span>
      <div className="header-actions">
        <button className="header-btn" onClick={onToggleLang} aria-label="Toggle language">
          {lang === 'en' ? 'עב' : 'EN'}
        </button>
        {user?.picture && (
          <button className="avatar-btn" onClick={onProfile} aria-label="Profile">
            <img src={user.picture} alt="" className="avatar-img" />
          </button>
        )}
        <button className="header-btn" onClick={onSignOut} aria-label="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
