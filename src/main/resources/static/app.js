'use strict';

// ─── Icons ───────────────────────────────────────────────────────────────────

const ICON_TRASH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;

// ─── i18n ────────────────────────────────────────────────────────────────────

const T = {
  en: {
    appTitle:          'Family App',
    authSubtitle:      'Sign in to continue',
    shopping:          'Shopping',
    vouchers:          'Vouchers',
    addItem:           'Add item…',
    clearAll:          'Clear all',
    refreshBalances:   'Refresh balances',
    addVoucher:        '+ Add voucher',
    provider:          'Provider',
    voucherNumber:     'Voucher number',
    amount:            'Amount (₪)',
    vendor:            'Vendor (optional)',
    remarks:           'Remarks (optional)',
    save:              'Save',
    cancel:            'Cancel',
    confirm:           'Confirm',
    noItems:           'List is empty',
    noVouchers:        'No active vouchers',
    refreshing:        'Refreshing…',
    confirmClear:      'Clear the entire shopping list?',
    confirmDelete:     'Remove this item?',
    confirmDelVoucher: 'Delete this voucher?',
    scanAtCheckout:    'Show this QR code to the cashier',
    deleteSelected:    'Delete',
    selected:          (n) => `${n} selected`,
    daysLeft:          (n) => `${n}d left`,
    expires:           (d) => `Expires ${d}`,
  },
  he: {
    appTitle:          'אפליקציה משפחתית',
    authSubtitle:      'התחבר להמשיך',
    shopping:          'קניות',
    vouchers:          'שוברים',
    addItem:           'הוסף פריט…',
    clearAll:          'נקה הכל',
    refreshBalances:   'רענן יתרות',
    addVoucher:        '+ הוסף שובר',
    provider:          'ספק',
    voucherNumber:     'מספר שובר',
    amount:            'סכום (₪)',
    vendor:            'חנות (אופציונלי)',
    remarks:           'הערות (אופציונלי)',
    save:              'שמור',
    cancel:            'ביטול',
    confirm:           'אישור',
    noItems:           'הרשימה ריקה',
    noVouchers:        'אין שוברים פעילים',
    refreshing:        'מרענן…',
    confirmClear:      'לנקות את רשימת הקניות?',
    confirmDelete:     'להסיר פריט זה?',
    confirmDelVoucher: 'למחוק שובר זה?',
    scanAtCheckout:    'הצג את הקוד לקופאי',
    deleteSelected:    'מחק',
    selected:          (n) => `${n} נבחרו`,
    daysLeft:          (n) => `${n} ימים`,
    expires:           (d) => `תפוגה ${d}`,
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

let currentUser     = null;
let googleClientId  = '';
let currentTab      = 'shopping';
let selectionMode   = false;
const selectedItems = new Set();
let cachedItems     = [];
let wakeLock        = null;

// In-cart checked state, persisted in localStorage
const checkedItems = new Set(
  JSON.parse(localStorage.getItem('checkedItems') || '[]')
);
function saveChecked() {
  localStorage.setItem('checkedItems', JSON.stringify([...checkedItems]));
}

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

  // Show or hide vouchers tab based on server-granted permission
  const canVouchers = user.canViewVouchers !== false;
  document.querySelector('.tab-btn[data-tab="vouchers"]').classList.toggle('hidden', !canVouchers);

  // If currently on vouchers tab but lost access, fall back to shopping
  if (!canVouchers && currentTab === 'vouchers') {
    currentTab = 'shopping';
    document.getElementById('pane-vouchers').classList.add('hidden');
    document.getElementById('pane-shopping').classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'shopping'));
  }

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
    theme: 'outline', size: 'large', width: 280,
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
  document.getElementById('shopping-list').classList.add('selection-active');
  document.getElementById('select-bar').classList.remove('hidden');
  updateSelectionBar();
}

function exitSelectionMode() {
  selectionMode = false;
  selectedItems.clear();
  const list = document.getElementById('shopping-list');
  list.classList.remove('selection-active');
  list.querySelectorAll('.item-card.selected').forEach(c => c.classList.remove('selected'));
  document.getElementById('select-bar').classList.add('hidden');
}

function toggleItemSelect(name) {
  if (selectedItems.has(name)) selectedItems.delete(name);
  else selectedItems.add(name);
  document.querySelectorAll(`#shopping-list .item-card[data-name="${CSS.escape(name)}"]`)
    .forEach(c => c.classList.toggle('selected', selectedItems.has(name)));
  updateSelectionBar();
}

function updateSelectionBar() {
  document.getElementById('select-count-label').textContent = t('selected', selectedItems.size);
  document.getElementById('delete-selected-btn').disabled = selectedItems.size === 0;
}

// ─── In-cart checked state ────────────────────────────────────────────────────

function toggleChecked(name) {
  if (checkedItems.has(name)) checkedItems.delete(name);
  else checkedItems.add(name);
  saveChecked();
  document.querySelectorAll(`#shopping-list .item-card[data-name="${CSS.escape(name)}"]`)
    .forEach(c => c.classList.toggle('item-checked', checkedItems.has(name)));
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function checkEmptyList() {
  const list = document.getElementById('shopping-list');
  if (!list.querySelector('.swipe-wrap')) {
    list.innerHTML = `<li class="empty-item">${t('noItems')}</li>`;
  }
}

function removeWrapFromDOM(name) {
  document.querySelector(`#shopping-list .swipe-wrap[data-name="${CSS.escape(name)}"]`)?.remove();
}

// Animate item out (height collapse) then remove from DOM + update state + call API
function removeItemOptimistic(name) {
  const wrapEl = document.querySelector(`#shopping-list .swipe-wrap[data-name="${CSS.escape(name)}"]`);
  if (wrapEl) {
    const h = wrapEl.offsetHeight;
    wrapEl.style.height = h + 'px';
    requestAnimationFrame(() => {
      wrapEl.style.transition = 'opacity 0.15s ease, height 0.2s ease, margin-bottom 0.2s ease';
      wrapEl.style.opacity = '0';
      wrapEl.style.height = '0';
      wrapEl.style.marginBottom = '0';
      setTimeout(() => { wrapEl.remove(); checkEmptyList(); }, 220);
    });
  }
  cachedItems = cachedItems.filter(i => i.name !== name);
  checkedItems.delete(name);
  saveChecked();
  api('DELETE', '/api/shopping/' + encodeURIComponent(name)).catch(e => {
    toast(e.message);
    loadShopping();
  });
}

// Delete all selected items with animation
function deleteSelectedItems() {
  if (selectedItems.size === 0) return;
  const names = [...selectedItems];
  exitSelectionMode();

  // Lock heights before transition
  names.forEach(name => {
    const el = document.querySelector(`#shopping-list .swipe-wrap[data-name="${CSS.escape(name)}"]`);
    if (el) el.style.height = el.offsetHeight + 'px';
  });

  requestAnimationFrame(() => {
    names.forEach(name => {
      const el = document.querySelector(`#shopping-list .swipe-wrap[data-name="${CSS.escape(name)}"]`);
      if (!el) return;
      el.style.transition = 'opacity 0.15s ease, height 0.2s ease, margin-bottom 0.2s ease';
      el.style.opacity = '0';
      el.style.height = '0';
      el.style.marginBottom = '0';
    });
    setTimeout(() => {
      names.forEach(name => {
        removeWrapFromDOM(name);
        cachedItems = cachedItems.filter(i => i.name !== name);
        checkedItems.delete(name);
      });
      saveChecked();
      checkEmptyList();
      Promise.all(names.map(n => api('DELETE', '/api/shopping/' + encodeURIComponent(n))))
        .catch(e => { toast(e.message); loadShopping(); });
    }, 220);
  });
}

// ─── Swipe to delete ─────────────────────────────────────────────────────────

function initSwipe(wrapEl, name) {
  const card = wrapEl.querySelector('.item-card');
  const THRESHOLD = 72;
  let startX = 0, startY = 0;
  let swiping = false, committed = false;

  wrapEl.addEventListener('touchstart', e => {
    if (selectionMode) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
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
    card.style.transform = `translateX(${Math.max(-THRESHOLD * 2, Math.min(0, dx))}px)`;
  }, { passive: false });

  wrapEl.addEventListener('touchend', e => {
    if (selectionMode || !swiping) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - startX;
    card.style.transition = 'transform 0.22s ease';
    if (dx < -THRESHOLD) {
      committed = true;
      card.style.transform = `translateX(-${wrapEl.offsetWidth}px)`;
      // After card slides out, collapse the row
      setTimeout(() => removeItemOptimistic(name), 220);
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
  let timer = null, startX = 0, startY = 0;

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
    if (Math.abs(e.touches[0].clientX - startX) > 8 ||
        Math.abs(e.touches[0].clientY - startY) > 8) cancel();
  }, { passive: true });

  wrapEl.addEventListener('touchend',    cancel);
  wrapEl.addEventListener('touchcancel', cancel);
}

// ─── Attach swipe + longpress to all rendered items ──────────────────────────

function attachListBehaviors() {
  document.getElementById('shopping-list').querySelectorAll('.swipe-wrap').forEach(wrapEl => {
    const name = wrapEl.dataset.name;
    initSwipe(wrapEl, name);
    initLongPress(wrapEl, () => {
      if (!selectionMode) enterSelectionMode();
      toggleItemSelect(name);
    });
  });
}

// Append a single new item to the list DOM without full re-render
function appendItemToDOM(name) {
  const list = document.getElementById('shopping-list');
  list.querySelector('.empty-item')?.remove();

  const li = document.createElement('li');
  li.className = 'swipe-wrap';
  li.dataset.name = name;
  li.innerHTML = `
    <div class="swipe-bg">${ICON_TRASH}</div>
    <div class="item-card${checkedItems.has(name) ? ' item-checked' : ''}" data-name="${esc(name)}">
      <span class="check-circle"></span>
      <span class="item-name">${esc(name)}</span>
      <button class="trash-btn" data-name="${esc(name)}">${ICON_TRASH}</button>
    </div>
  `;
  list.appendChild(li);
  initSwipe(li, name);
  initLongPress(li, () => {
    if (!selectionMode) enterSelectionMode();
    toggleItemSelect(name);
  });
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
  if (selectionMode) exitSelectionMode();
  const list = document.getElementById('shopping-list');
  if (items.length === 0) {
    list.innerHTML = `<li class="empty-item">${t('noItems')}</li>`;
    return;
  }
  list.innerHTML = items.map(item => `
    <li class="swipe-wrap" data-name="${esc(item.name)}">
      <div class="swipe-bg">${ICON_TRASH}</div>
      <div class="item-card${checkedItems.has(item.name) ? ' item-checked' : ''}" data-name="${esc(item.name)}">
        <span class="check-circle"></span>
        <span class="item-name">${esc(item.name)}</span>
        <button class="trash-btn" data-name="${esc(item.name)}">${ICON_TRASH}</button>
      </div>
    </li>
  `).join('');
  attachListBehaviors();
}

async function addItem() {
  const input = document.getElementById('item-input');
  const name = input.value.trim();
  if (!name) return;
  input.value = '';
  // Optimistic: show immediately
  cachedItems = [...cachedItems, { name }];
  appendItemToDOM(name);
  try {
    await api('POST', '/api/shopping', { name });
  } catch (e) {
    // Rollback
    cachedItems = cachedItems.filter(i => i.name !== name);
    removeWrapFromDOM(name);
    checkEmptyList();
    input.value = name;
    toast(e.message);
  }
}

async function clearList() {
  const ok = await confirm(t('confirmClear'));
  if (!ok) return;
  // Optimistic clear
  cachedItems = [];
  checkedItems.clear();
  saveChecked();
  document.getElementById('shopping-list').innerHTML = `<li class="empty-item">${t('noItems')}</li>`;
  api('DELETE', '/api/shopping').catch(e => { toast(e.message); loadShopping(); });
}

// ─── QR code ──────────────────────────────────────────────────────────────────

async function showQR(voucher) {
  document.getElementById('qr-provider-label').textContent = voucher.provider;
  document.getElementById('qr-balance-label').textContent = `₪${voucher.balance.toLocaleString()}`;
  document.getElementById('qr-number-label').textContent = voucher.voucherNumber;
  document.querySelector('.qr-hint').textContent = t('scanAtCheckout');

  const container = document.getElementById('qr-container');
  container.innerHTML = '';
  new QRCode(container, {
    text:         voucher.voucherNumber,
    width:        240,
    height:       240,
    colorDark:    '#2D1B0E',
    colorLight:   '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H,
  });

  document.getElementById('qr-modal').classList.remove('hidden');

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
  const btn  = document.getElementById('refresh-btn');
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
    const cls  = expiryClass(v.expiryDate);
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
            <button class="v-trash-btn" data-number="${esc(v.voucherNumber)}">${ICON_TRASH}</button>
          </div>
        </div>
        <div class="voucher-meta">${t('expires', v.expiryDate)}${v.vendor ? ' · ' + esc(v.vendor) : ''}</div>
        <div class="voucher-number">${esc(v.voucherNumber)}</div>
        ${v.remarks ? `<div class="voucher-remarks">${esc(v.remarks)}</div>` : ''}
        <div class="voucher-tap-hint">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="18" width="3" height="3"/></svg>
          Tap for QR code
        </div>
      </div>
    `;
  }).join('');

  container._vouchers = vouchers;

  container.addEventListener('click', e => {
    const trashBtn = e.target.closest('.v-trash-btn');
    if (trashBtn) { deleteVoucher(trashBtn.dataset.number); return; }
    const card = e.target.closest('.voucher-card');
    if (card && container._vouchers) showQR(container._vouchers[+card.dataset.idx]);
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
      vendor:        data.vendor  || null,
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
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function initApp() {
  applyLang();

  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    googleClientId = cfg.googleClientId || '';
  } catch (_) {}

  await checkSession();

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

  // Single permanent click handler — no { once: true }, no re-registration on re-renders
  document.getElementById('shopping-list').addEventListener('click', e => {
    if (!e.target.closest('.swipe-wrap')) return;

    if (selectionMode) {
      const card = e.target.closest('.item-card');
      if (card) toggleItemSelect(card.dataset.name);
      return;
    }

    const trashBtn = e.target.closest('.trash-btn');
    if (trashBtn) {
      removeItemOptimistic(trashBtn.dataset.name);
      return;
    }

    const card = e.target.closest('.item-card');
    if (card) toggleChecked(card.dataset.name);
  });

  document.getElementById('clear-btn').addEventListener('click', clearList);
  document.getElementById('cancel-select-btn').addEventListener('click', exitSelectionMode);
  document.getElementById('delete-selected-btn').addEventListener('click', deleteSelectedItems);
  document.getElementById('refresh-btn').addEventListener('click', refreshVouchers);
  document.getElementById('add-voucher-form').addEventListener('submit', e => {
    e.preventDefault();
    addVoucher(e.target);
  });

  document.getElementById('qr-close-btn').addEventListener('click', hideQR);
  document.getElementById('qr-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('qr-modal')) hideQR();
  });
}
