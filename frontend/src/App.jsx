import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { api, setUnauthorizedHandler } from './api.js';
import { translate } from './i18n.js';
import AuthScreen    from './components/AuthScreen.jsx';
import Header        from './components/Header.jsx';
import TabBar        from './components/TabBar.jsx';
import ItemListPane  from './components/ItemListPane.jsx';
import VouchersPane  from './components/VouchersPane.jsx';
import ProfileModal  from './components/ProfileModal.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import Toast         from './components/Toast.jsx';

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export default function App() {
  const [user,          setUser]         = useState(null);
  const [authReady,     setAuthReady]    = useState(false);
  const [tab,           setTab]          = useState('shopping');
  const [lang,          setLang]         = useState(() => localStorage.getItem('lang') || 'en');
  const [googleClientId,setGoogleId]     = useState('');
  const [profileOpen,   setProfileOpen]  = useState(false);
  const [toastMsg,      setToastMsg]     = useState('');
  const [toastKey,      setToastKey]     = useState(0);
  const [confirmState,  setConfirmState] = useState(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setToastKey(k => k + 1);
  }, []);

  const confirm = useCallback((msg) => new Promise(resolve => {
    setConfirmState({ msg, resolve });
  }), []);

  const resolveConfirm = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  const toggleLang = useCallback(() => {
    const next = lang === 'en' ? 'he' : 'en';
    setLang(next);
    localStorage.setItem('lang', next);
    document.documentElement.lang = next;
    document.documentElement.dir  = next === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  const signOut = useCallback(async () => {
    await api('POST', '/api/auth/logout');
    window.google?.accounts.id.disableAutoSelect();
    setUser(null);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    fetch('/api/config').then(r => r.json()).then(c => setGoogleId(c.googleClientId || '')).catch(() => {});
    api('GET', '/api/auth/me', undefined, { silent401: true })
      .then(u => { if (u) setUser(u); })
      .finally(() => setAuthReady(true));
  }, []);

  const t = useCallback((key, ...args) => translate(lang, key, ...args), [lang]);

  const switchTab = useCallback((next) => {
    if (next === 'vouchers' && user?.canViewVouchers === false) return;
    setTab(next);
  }, [user]);

  const ctx = { lang, t, toast, confirm, user };

  if (!authReady) return <div className="splash" />;

  return (
    <AppCtx.Provider value={ctx}>
      {!user ? (
        <AuthScreen googleClientId={googleClientId} onSignIn={setUser} />
      ) : (
        <div className="app-shell">
          <Header
            user={user}
            lang={lang}
            onToggleLang={toggleLang}
            onSignOut={signOut}
            onProfile={() => setProfileOpen(true)}
          />
          <TabBar tab={tab} onTab={switchTab} canVouchers={user.canViewVouchers !== false} />
          <main className="pane-container">
            {tab === 'shopping' && <ItemListPane key="shopping" listKey="grocery" />}
            {tab === 'home'     && <ItemListPane key="home"     listKey="home" />}
            {tab === 'vouchers' && <VouchersPane />}
          </main>
        </div>
      )}

      {profileOpen    && <ProfileModal onClose={() => setProfileOpen(false)} />}
      {confirmState   && <ConfirmDialog msg={confirmState.msg} onResult={resolveConfirm} />}
      <Toast msg={toastMsg} animKey={toastKey} />
    </AppCtx.Provider>
  );
}
