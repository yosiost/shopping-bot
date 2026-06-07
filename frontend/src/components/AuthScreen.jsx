import { useEffect } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';

export default function AuthScreen({ googleClientId, onSignIn }) {
  const { t } = useApp();

  useEffect(() => {
    if (!googleClientId) return;

    const init = () => {
      if (!window.google?.accounts) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const user = await api('POST', '/api/auth/login', { idToken: response.credential });
            if (user) onSignIn(user);
          } catch (e) {
            console.error('Sign-in failed:', e);
          }
        },
        auto_select: true,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('signin-button'),
        { theme: 'outline', size: 'large', width: 280 }
      );
      window.google.accounts.id.prompt();
    };

    if (window.google?.accounts) {
      init();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com"]');
      script?.addEventListener('load', init, { once: true });
    }
  }, [googleClientId, onSignIn]);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-icon">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
        <h1 className="auth-title">{t('appTitle')}</h1>
        <p className="auth-subtitle">{t('authSubtitle')}</p>
        <div id="signin-button" className="signin-btn-wrap" />
      </div>
    </div>
  );
}
