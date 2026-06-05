'use strict';

// ─── Icons ───────────────────────────────────────────────────────────────────

const ICON_TRASH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;

// ─── i18n ────────────────────────────────────────────────────────────────────

const T = {
  en: {
    appTitle:        'Family App',
    authSubtitle:    'Sign in to continue',
    shopping:        'Shopping',
    vouchers:        'Vouchers',
    addItem:         'Add item…',
    clearAll:        'Clear all',
    refreshBalances: 'Refresh balances',
    addVoucher:      '+ Add voucher',
    provider:        'Provider',
    voucherNumber:   'Voucher number',
    amount:          'Amount (₪)',
    vendor:          'Vendor (optional)',
    remarks:         'Remarks (optional)',
    save:            'Save',
    cancel:          'Cancel',
    confirm:         'Confirm',
    noItems:         'List is empty 🏠',
    noVouchers:      'No active vouchers 💸',
    refreshing:      'Refreshing…',
    confirmClear:    'Clear the entire shopping list?',
    confirmDelete:   'Remove this item?',
    confirmDelVoucher: 'Delete this voucher?',
    daysLeft:        (n) => `${n}d left`,
    expires:         (d) => `Expires ${d}`,
  },
  he: {
    appTitle:        'אפליקציה משפחתית',
    authSubtitle:    'התחבר להמשיך',
    shopping:        'קניות',
    vouchers:        'שוברים',
    addItem:         'הוסף פריט…',
    clearAll:        'נקה הכל',
    refreshBalances: 'רענן יתרות',
    addVoucher:      '+ הוסף שובר',
    provider:        'ספק',
    voucherNumber:   'מספר שובר',
    amount:          'סכום (₪)',
    vendor:          'חנות (אופציונלי)',
    remarks:         'הערות (אופציונלי)',
    save:            'שמור',
    cancel:          'ביטול',
    confirm:         'אישור',
    noItems:         'הרשימה ריקה 🏠',
    noVouchers:      'אין שוברים פעילים 💸',
    refreshing:      'מרענן…',
    confirmClear:    'לנקות את רשימת הקניות?',
    confirmDelete:   'להסיר פריט זה?',
    confirmDelVoucher: 'למחוק שובר זה?',
    daysLeft:        (n) => `${n} ימים`,
    expires:         (d) => `תפוגה ${d}`,
  },
};

let lang = localStorage.getItem('lang') || 'en';

function t(key, ...args) {
  const val = T[lang][key];
  return typeof val === 'function' ? val(...args) : (val ?? key);
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  document.getElementById('lang-btn').textContent = lang === 'en' ? 'עב' : 'EN';
  document.getElementById('header-title').textContent = t('appTitle');
  document.getElementById('auth-title').textContent = t('appTitle');
  document.getElementById('auth-subtitle').textContent = t('authSubtitle');
  document.getElementById('item-input').placeholder = t('addItem');
  document.getElementById('clear-btn').textContent = t('clearAll');

  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    if (T[lang][key] && typeof T[lang][key] !== 'function') el.textContent = T[lang][key];
  });
  document.querySelectorAll('[data-placeholder-key]').forEach(el => {
    const key = el.dataset.placeholderKey;
    if (T[lang][key] && typeof T[lang][key] !== 'function') el.placeholder = T[lang][key];
  });
}

// ─── State ───────────────────────────────────────────────────────────────────

let currentUser = null;
let googleClientId = '';
let currentTab = 'shopping';

// ─── API helpers ─────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  if (res.status === 401) { showAuth(); return null; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── Toast ───────────────────────────────────────────────────────────────────

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

// ─── Confirm dialog ──────────────────────────────────────────────────────────

function confirm(msg) {
  return new Promise(resolve => {
    document.getElementById('dialog-msg').textContent = msg;
    document.getElementById('overlay').classList.remove('hidden');
    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel  = () => { cleanup(); resolve(false); };
    function cleanup() {
      document.getElementById('overlay').classList.add('hidden');
      document.getElementById('dialog-confirm').removeEventListener('click', onConfirm);
      document.getElementById('dialog-cancel').removeEventListener('click', onCancel);
    }
    document.getElementById('dialog-confirm').addEventListener('click', onConfirm);
    document.getElementById('dialog-cancel').addEventListener('click', onCancel);
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function showAuth() {
  currentUser = null;
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
  renderSignInButton();
}

function showApp(user) {
  currentUser = user;
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  const avatar = document.getElementById('user-avatar');
  if (user.picture) { avatar.src = user.picture; avatar.classList.add('visible'); }
  loadCurrentTab();
}

function renderSignInButton() {
  if (!googleClientId || !window.google) return;
  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: onGoogleCredential,
    auto_select: true,
  });
  google.accounts.id.renderButton(document.getElementById('signin-button'), {
    theme: 'outline',
    size: 'large',
    width: 280,
  });
  google.accounts.id.prompt();
}

async function onGoogleCredential(response) {
  try {
    const user = await api('POST', '/api/auth/login', { idToken: response.credential });
    if (user) showApp(user);
  } catch (e) {
    toast('Sign-in failed: ' + e.message);
  }
}

async function checkSession() {
  const user = await api('GET', '/api/auth/me');
  if (user) showApp(user); else showAuth();
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('pane-shopping').classList.toggle('hidden', tab !== 'shopping');
  document.getElementById('pane-vouchers').classList.toggle('hidden', tab !== 'vouchers');
  loadCurrentTab();
}

function loadCurrentTab() {
  if (currentTab === 'shopping') loadShopping();
  else loadVouchers();
}

// ─── Shopping list ─────────────────────────────────────────────────────────────

async function loadShopping() {
  const list = document.getElementById('shopping-list');
  list.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const items = await api('GET', '/api/shopping');
    if (!items) return;
    renderShopping(items);
  } catch (e) { toast(e.message); }
}

function renderShopping(items) {
  const list = document.getElementById('shopping-list');
  if (items.length === 0) {
    list.innerHTML = `<li style="padding:40px 16px;text-align:center;color:var(--muted);font-size:15px;">${t('noItems')}</li>`;
    return;
  }
  list.innerHTML = items.map(item => `
    <li class="item-card">
      <span class="item-name">${esc(item.name)}</span>
      <button class="trash-btn" data-name="${esc(item.name)}" aria-label="Remove ${esc(item.name)}">${ICON_TRASH}</button>
    </li>
  `).join('');
}

async function addItem() {
  const input = document.getElementById('item-input');
  const name = input.value.trim();
  if (!name) return;
  try {
    await api('POST', '/api/shopping', { name });
    input.value = '';
    loadShopping();
  } catch (e) { toast(e.message); }
}

async function removeItem(name) {
  try {
    await api('DELETE', '/api/shopping/' + encodeURIComponent(name));
    loadShopping();
  } catch (e) { toast(e.message); }
}

async function clearList() {
  const ok = await confirm(t('confirmClear'));
  if (!ok) return;
  try {
    await api('DELETE', '/api/shopping');
    loadShopping();
  } catch (e) { toast(e.message); }
}

// ─── Vouchers ─────────────────────────────────────────────────────────────────

async function loadVouchers() {
  const container = document.getElementById('vouchers-list');
  container.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const vouchers = await api('GET', '/api/vouchers');
    if (!vouchers) return;
    renderVouchers(vouchers);
  } catch (e) { toast(e.message); }
}

async function refreshVouchers() {
  const btn = document.getElementById('refresh-btn');
  const icon = document.getElementById('refresh-icon');
  btn.classList.add('loading');
  icon.classList.add('spinning');
  try {
    const vouchers = await api('POST', '/api/vouchers/refresh');
    if (vouchers) renderVouchers(vouchers);
  } catch (e) { toast(e.message); }
  finally { btn.classList.remove('loading'); icon.classList.remove('spinning'); }
}

function expiryClass(dateStr) {
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (days <= 7)  return { card: 'expiry-critical', badge: 'critical' };
  if (days <= 14) return { card: 'expiry-urgent',   badge: 'urgent' };
  if (days <= 30) return { card: 'expiry-soon',     badge: 'soon' };
  return { card: '', badge: '' };
}

function renderVouchers(vouchers) {
  const container = document.getElementById('vouchers-list');
  if (vouchers.length === 0) {
    container.innerHTML = `<div class="empty-state">${t('noVouchers')}</div>`;
    return;
  }
  container.innerHTML = vouchers.map(v => {
    const cls = expiryClass(v.expiryDate);
    const days = Math.ceil((new Date(v.expiryDate) - new Date()) / 86400000);
    return `
      <div class="voucher-card ${cls.card}">
        <div class="voucher-header">
          <div>
            <div class="voucher-provider">${esc(v.provider)}</div>
            <div class="voucher-balance">₪${v.balance.toLocaleString()}</div>
          </div>
            <div class="voucher-actions">
            <span class="expiry-badge ${cls.badge}">${t('daysLeft', days)}</span>
            <button class="v-trash-btn" data-number="${esc(v.voucherNumber)}" aria-label="Delete voucher">${ICON_TRASH}</button>
          </div>
        </div>
        <div class="voucher-meta">${t('expires', v.expiryDate)}${v.vendor ? ' · ' + esc(v.vendor) : ''}</div>
        <div class="voucher-number">${esc(v.voucherNumber)}</div>
        ${v.remarks ? `<div class="voucher-remarks">${esc(v.remarks)}</div>` : ''}
      </div>
    `;
  }).join('');
}

async function addVoucher(form) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await api('POST', '/api/vouchers', {
      voucherNumber: data.voucherNumber,
      provider:      data.provider,
      amount:        parseFloat(data.amount),
      balance:       null,
      expiryDate:    data.expiryDate,
      vendor:        data.vendor || null,
      remarks:       data.remarks || null,
    });
    form.reset();
    document.getElementById('add-voucher-details').removeAttribute('open');
    loadVouchers();
    toast('Voucher added ✓');
  } catch (e) { toast(e.message); }
}

async function deleteVoucher(number) {
  const ok = await confirm(t('confirmDelVoucher'));
  if (!ok) return;
  try {
    await api('DELETE', '/api/vouchers/' + encodeURIComponent(number));
    loadVouchers();
  } catch (e) { toast(e.message); }
}

// ─── Escape HTML ──────────────────────────────────────────────────────────────

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function initApp() {
  applyLang();

  // Load Google Client ID
  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    googleClientId = cfg.googleClientId || '';
  } catch (_) {}

  // Try existing session
  await checkSession();

  // Wire up events
  document.getElementById('lang-btn').addEventListener('click', () => {
    lang = lang === 'en' ? 'he' : 'en';
    localStorage.setItem('lang', lang);
    applyLang();
    loadCurrentTab();
  });

  document.getElementById('signout-btn').addEventListener('click', async () => {
    await api('POST', '/api/auth/logout');
    if (window.google) google.accounts.id.disableAutoSelect();
    showAuth();
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('add-item-btn').addEventListener('click', addItem);
  document.getElementById('item-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });

  document.getElementById('shopping-list').addEventListener('click', e => {
    const btn = e.target.closest('.trash-btn');
    if (btn) removeItem(btn.dataset.name);
  });

  document.getElementById('clear-btn').addEventListener('click', clearList);

  document.getElementById('refresh-btn').addEventListener('click', refreshVouchers);

  document.getElementById('vouchers-list').addEventListener('click', e => {
    const btn = e.target.closest('.v-trash-btn');
    if (btn) deleteVoucher(btn.dataset.number);
  });

  document.getElementById('add-voucher-form').addEventListener('submit', e => {
    e.preventDefault();
    addVoucher(e.target);
  });

  document.getElementById('dialog-cancel').textContent = t('cancel');
  document.getElementById('dialog-confirm').textContent = t('confirm');
}
