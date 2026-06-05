'use strict';

// ─── Icons ───────────────────────────────────────────────────────────────────

const ICON_TRASH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;
const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

// ─── i18n ────────────────────────────────────────────────────────────────────

const T = {
  en: {
    appTitle:         'Family App',
    authSubtitle:     'Sign in to continue',
    shopping:         'Shopping',
    vouchers:         'Vouchers',
    addItem:          'Add item…',
    clearAll:         'Clear all',
    refreshBalances:  'Refresh balances',
    addVoucher:       '+ Add voucher',
    provider:         'Provider',
    voucherNumber:    'Voucher number',
    amount:           'Amount (₪)',
    vendor:           'Vendor (optional)',
    remarks:          'Remarks (optional)',
    save:             'Save',
    cancel:           'Cancel',
    confirm:          'Confirm',
    noItems:          'List is empty',
    noVouchers:       'No active vouchers',
    refreshing:       'Refreshing…',
    confirmClear:     'Clear the entire shopping list?',
    confirmDelete:    'Remove this item?',
    confirmDelVoucher:'Delete this voucher?',
    scanAtCheckout:   'Show this QR code to the cashier',
    deleteSelected:   'Delete',
    select:           'Select',
    selected:         (n) => `${n} selected`,
    daysLeft:         (n) => `${n}d left`,
    expires:          (d) => `Expires ${d}`,
  },
  he: {
    appTitle:         'אפליקציה משפחתית',
    authSubtitle:     'התחבר להמשיך',
    shopping:         'קניות',
    vouchers:         'שוברים',
    addItem:          'הוסף פריט…',
    clearAll:         'נקה הכל',
    refreshBalances:  'רענן יתרות',
    addVoucher:       '+ הוסף שובר',
    provider:         'ספק',
    voucherNumber:    'מספר שובר',
    amount:           'סכום (₪)',
    vendor:           'חנות (אופציונלי)',
    remarks:          'הערות (אופציונלי)',
    save:             'שמור',
    cancel:           'ביטול',
    confirm:          'אישור',
    noItems:          'הרשימה ריקה',
    noVouchers:       'אין שוברים פעילים',
    refreshing:       'מרענן…',
    confirmClear:     'לנקות את רשימת הקניות?',
    confirmDelete:    'להסיר פריט זה?',
    confirmDelVoucher:'למחוק שובר זה?',
    scanAtCheckout:   'הצג את הקוד לקופאי',
    deleteSelected:   'מחק',
    select:           'בחר',
    selected:         (n) => `${n} נבחרו`,
    daysLeft:         (n) => `${n} ימים`,
    expires:          (d) => `תפוגה ${d}`,
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
let selectionMode = false;
const selectedItems = new Set();
let cachedItems = [];
let wakeLock = null;

// ─── API helpers ─────────────────────────────────────────────────────────────

async function api(method, path, body, opts = {}) {
  const fetchOpts = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    fetchOpts.headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(body);
  }
  const res = await fetch(path, fetchOpts);
  if (res.status === 401) {
    if (!opts.silent401) showAuth();
    return null;
  }
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
  const user = await api('GET', '/api/auth/me', undefined, { silent401: true });
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

// ─── Selection mode ───────────────────────────────────────────────────────────

function enterSelectionMode() {
  selectionMode = true;
  selectedItems.clear();
  const list = document.getElementById('shopping-list');
  list.classList.add('selection-active');
  document.getElementById('select-bar').classList.remove('hidden');
  updateSelectionBar();
}

function exitSelectionMode() {
  selectionMode = false;
  selectedItems.clear();
  const list = document.getElementById('shopping-list');
  list.classList.remove('selection-active');
  list.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('select-bar').classList.add('hidden');
}

function toggleItemSelect(name) {
  if (selectedItems.has(name)) selectedItems.delete(name);
  else selectedItems.add(name);

  const list = document.getElementById('shopping-list');
  list.querySelectorAll(`.item-card[data-name="${CSS.escape(name)}"]`).forEach(c => {
    c.classList.toggle('selected', selectedItems.has(name));
  });
  updateSelectionBar();
}

function updateSelectionBar() {
  const count = selectedItems.size;
  document.getElementById('select-count-label').textContent = t('selected', count);
  document.getElementById('delete-selected-btn').disabled = count === 0;
}

async function deleteSelectedItems() {
  if (selectedItems.size === 0) return;
  const names = Array.from(selectedItems);
  exitSelectionMode();
  try {
    await Promise.all(names.map(name => api('DELETE', '/api/shopping/' + encodeURIComponent(name))));
    loadShopping();
  } catch (e) { toast(e.message); }
}

// ─── Swipe to delete ─────────────────────────────────────────────────────────

function initSwipe(wrapEl, name) {
  const card = wrapEl.querySelector('.item-card');
  const THRESHOLD = 72;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let swiping = false;
  let committed = false;

  wrapEl.addEventListener('touchstart', e => {
    if (selectionMode) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
    swiping = false;
    committed = false;
    card.style.transition = 'none';
  }, { passive: true });

  wrapEl.addEventListener('touchmove', e => {
    if (selectionMode || committed) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!swiping && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    if (!swiping) {
      if (Math.abs(dy) > Math.abs(dx)) return;
      swiping = true;
    }
    e.preventDefault();
    const x = Math.min(0, dx);
    const capped = Math.max(-THRESHOLD * 2, x);
    card.style.transform = `translateX(${capped}px)`;
  }, { passive: false });

  wrapEl.addEventListener('touchend', e => {
    if (selectionMode || !swiping) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - startX;
    card.style.transition = 'transform 0.22s ease';

    if (dx < -THRESHOLD) {
      committed = true;
      card.style.transform = `translateX(-${wrapEl.offsetWidth}px)`;
      setTimeout(() => removeItem(name), 220);
    } else {
      card.style.transform = '';
    }
  });

  wrapEl.addEventListener('touchcancel', () => {
    if (!committed) {
      swiping = false;
      card.style.transition = 'transform 0.22s ease';
      card.style.transform = '';
    }
  });
}

// ─── Long press ───────────────────────────────────────────────────────────────

function initLongPress(wrapEl, onLongPress) {
  let timer = null;
  let startX = 0;
  let startY = 0;

  wrapEl.addEventListener('touchstart', e => {
    if (selectionMode) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    timer = setTimeout(() => {
      timer = null;
      if (navigator.vibrate) navigator.vibrate(50);
      onLongPress();
    }, 450);
  }, { passive: true });

  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

  wrapEl.addEventListener('touchmove', e => {
    if (!timer) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) cancel();
  }, { passive: true });

  wrapEl.addEventListener('touchend',    cancel);
  wrapEl.addEventListener('touchcancel', cancel);
}

// ─── Attach list item behaviors ───────────────────────────────────────────────

function attachListBehaviors() {
  const list = document.getElementById('shopping-list');
  list.querySelectorAll('.swipe-wrap').forEach(wrapEl => {
    const name = wrapEl.dataset.name;
    initSwipe(wrapEl, name);
    initLongPress(wrapEl, () => {
      if (!selectionMode) enterSelectionMode();
      toggleItemSelect(name);
    });
  });

  list.addEventListener('click', e => {
    if (selectionMode) {
      const card = e.target.closest('.item-card');
      if (card) toggleItemSelect(card.dataset.name);
      return;
    }
    const btn = e.target.closest('.trash-btn');
    if (btn) removeItem(btn.dataset.name);
  }, { once: true });
}

// ─── Shopping list ─────────────────────────────────────────────────────────────

async function loadShopping() {
  try {
    const items = await api('GET', '/api/shopping');
    if (items === null) return;
    cachedItems = items;
    renderShopping(items);
  } catch (e) { toast(e.message); }
}

function renderShopping(items) {
  const list = document.getElementById('shopping-list');

  if (selectionMode) exitSelectionMode();

  if (items.length === 0) {
    list.innerHTML = `<li style="padding:40px 16px;text-align:center;color:var(--muted);font-size:15px;">${t('noItems')}</li>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <li class="swipe-wrap" data-name="${esc(item.name)}">
      <div class="swipe-bg">${ICON_TRASH}</div>
      <div class="item-card" data-name="${esc(item.name)}">
        <span class="check-circle"></span>
        <span class="item-name">${esc(item.name)}</span>
        <button class="trash-btn" data-name="${esc(item.name)}" aria-label="Remove ${esc(item.name)}">${ICON_TRASH}</button>
      </div>
    </li>
  `).join('');

  attachListBehaviors();
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

// ─── QR code ──────────────────────────────────────────────────────────────────

async function showQR(voucher) {
  const modal = document.getElementById('qr-modal');
  const container = document.getElementById('qr-container');

  document.getElementById('qr-provider-label').textContent = voucher.provider;
  document.getElementById('qr-balance-label').textContent = `₪${voucher.balance.toLocaleString()}`;
  document.getElementById('qr-number-label').textContent = voucher.voucherNumber;
  document.querySelector('.qr-hint').textContent = t('scanAtCheckout');

  container.innerHTML = '';
  new QRCode(container, {
    text:           voucher.voucherNumber,
    width:          240,
    height:         240,
    colorDark:      '#2D1B0E',
    colorLight:     '#FFFFFF',
    correctLevel:   QRCode.CorrectLevel.H,
  });

  modal.classList.remove('hidden');

  if ('wakeLock' in navigator) {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
  }
}

async function hideQR() {
  document.getElementById('qr-modal').classList.add('hidden');
  if (wakeLock) { try { await wakeLock.release(); } catch (_) {} wakeLock = null; }
}

// ─── Vouchers ─────────────────────────────────────────────────────────────────

async function loadVouchers() {
  const container = document.getElementById('vouchers-list');
  container.innerHTML = '<div style="padding:40px 16px;text-align:center;color:var(--muted);font-size:15px;">Loading…</div>';
  try {
    const vouchers = await api('GET', '/api/vouchers');
    if (vouchers === null) return;
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
    container.innerHTML = `<div style="padding:40px 16px;text-align:center;color:var(--muted);font-size:15px;">${t('noVouchers')}</div>`;
    return;
  }
  container.innerHTML = vouchers.map((v, idx) => {
    const cls = expiryClass(v.expiryDate);
    const days = Math.ceil((new Date(v.expiryDate) - new Date()) / 86400000);
    return `
      <div class="voucher-card ${cls.card}" data-idx="${idx}">
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
        <div class="voucher-tap-hint">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="18" width="3" height="3"/><rect x="19" y="14" width="2" height="2"/><rect x="14" y="14" width="2" height="2"/></svg>
          Tap for QR code
        </div>
      </div>
    `;
  }).join('');

  // store vouchers so click handler can look them up
  container._vouchers = vouchers;

  container.addEventListener('click', e => {
    const trashBtn = e.target.closest('.v-trash-btn');
    if (trashBtn) { deleteVoucher(trashBtn.dataset.number); return; }
    const card = e.target.closest('.voucher-card');
    if (card && container._vouchers) {
      const idx = parseInt(card.dataset.idx, 10);
      showQR(container._vouchers[idx]);
    }
  });
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
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function initApp() {
  applyLang();

  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    googleClientId = cfg.googleClientId || '';
  } catch (_) {}

  await checkSession();

  // Lang toggle
  document.getElementById('lang-btn').addEventListener('click', () => {
    lang = lang === 'en' ? 'he' : 'en';
    localStorage.setItem('lang', lang);
    applyLang();
    loadCurrentTab();
  });

  // Sign-out
  document.getElementById('signout-btn').addEventListener('click', async () => {
    await api('POST', '/api/auth/logout');
    if (window.google) google.accounts.id.disableAutoSelect();
    showAuth();
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Shopping add
  document.getElementById('add-item-btn').addEventListener('click', addItem);
  document.getElementById('item-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });

  // Clear all
  document.getElementById('clear-btn').addEventListener('click', clearList);

  // Selection bar
  document.getElementById('cancel-select-btn').addEventListener('click', () => {
    exitSelectionMode();
  });
  document.getElementById('delete-selected-btn').addEventListener('click', deleteSelectedItems);

  // Vouchers refresh
  document.getElementById('refresh-btn').addEventListener('click', refreshVouchers);

  // Voucher form
  document.getElementById('add-voucher-form').addEventListener('submit', e => {
    e.preventDefault();
    addVoucher(e.target);
  });

  // QR close
  document.getElementById('qr-close-btn').addEventListener('click', hideQR);
  document.getElementById('qr-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('qr-modal')) hideQR();
  });
}
