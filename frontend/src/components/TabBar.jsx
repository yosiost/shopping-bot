import { useApp } from '../App.jsx';

const TABS = [
  {
    key: 'shopping',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
  {
    key: 'home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    key: 'vouchers',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
];

export default function TabBar({ tab, onTab, canVouchers }) {
  const { t } = useApp();
  const tabs = TABS.filter(tb => tb.key !== 'vouchers' || canVouchers);

  return (
    <nav className="tab-bar">
      {tabs.map(tb => (
        <button
          key={tb.key}
          className={`tab-btn ${tab === tb.key ? 'active' : ''}`}
          onClick={() => onTab(tb.key)}
        >
          {tb.icon}
          <span className="tab-label">{t(tb.key)}</span>
        </button>
      ))}
    </nav>
  );
}
