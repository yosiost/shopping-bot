'use strict';

// ─── Icons ───────────────────────────────────────────────────────────────────

const ICON_TRASH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;

// ─── i18n ────────────────────────────────────────────────────────────────────

const T = {
  en: {
    appTitle:          'Family App',
    authSubtitle:      'Sign in to continue',
    shopping:          'Shopping',
    home:              'Home',
    vouchers:          'Vouchers',
    addItem:           'Add item…',
    addHomeItem:       'Add item…',
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
    noHomeItems:       'Home list is empty',
    noVouchers:        'No active vouchers',
    refreshing:        'Refreshing…',
    confirmClear:      'Clear the entire shopping list?',
    confirmHomeClear:  'Clear the entire home list?',
    confirmDelete:     'Remove this item?',
    confirmDelVoucher: 'Delete this voucher?',
    scanAtCheckout:    'Show this QR code to the cashier',
    deleteSelected:    'Delete',
    selected:          (n) => `${n} selected`,
    daysLeft:          (n) => `${n}d left`,
    expires:           (d) => `Expires ${d}`,
    addedBy:           (name) => `added by ${name}`,
  },
  he: {
    appTitle:          'אפליקציה משפחתית',
    authSubtitle:      'התחבר להמשיך',
    shopping:          'קניות',
    home:              'בית',
    vouchers:          'שוברים',
    addItem:           'הוסף פריט…',
    addHomeItem:       'הוסף פריט…',
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
    noHomeItems:       'רשימת הבית ריקה',
    noVouchers:        'אין שוברים פעילים',
    refreshing:        'מרענן…',
    confirmClear:      'לנקות את רשימת הקניות?',
    confirmHomeClear:  'לנקות את רשימת הבית?',
    confirmDelete:     'להסיר פריט זה?',
    confirmDelVoucher: 'למחוק שובר זה?',
    scanAtCheckout:    'הצג את הקוד לקופאי',
    deleteSelected:    'מחק',
    selected:          (n) => `${n} נבחרו`,
    daysLeft:          (n) => `${n} ימים`,
    expires:           (d) => `תפוגה ${d}`,
    addedBy:           (name) => `נוסף ע"י ${name}`,
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
  document.getElementById('home-input').placeholder = t('addHomeItem');
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

let currentUser    = null;
let googleClientId = '';
let currentTab     = 'shopping';
let activeList     = 'grocery'; // 'grocery' | 'home'
let selectionMode  = false;
const selectedItems = new Set();
let wakeLock       = null;

// Per-list configuration
const LIST_CONFIG = {
  grocery: {
    api:          '/api/shopping',
    listId:       'shopping-list',
    inputId:      'item-input',
    addBtnId:     'add-item-btn',
    selectBarId:  'select-bar',
    countId:      'select-count-label',
    deleteSelId:  'delete-selected-btn',
    cancelSelId:  'cancel-select-btn',
    clearBtnId:   'clear-btn',
    emptyKey:     'noItems',
    clearKey:     'confirmClear',
  },
  home: {
    api:          '/api/home',
    listId:       'home-list',
    inputId:      'home-input',
    addBtnId:     'add-home-btn',
    selectBarId:  'home-select-bar',
    countId:      'home-select-count',
    deleteSelId:  'home-delete-selected',
    cancelSelId:  'home-cancel-select',
    clearBtnId:   'home-clear-btn',
    emptyKey:     'noHomeItems',
    clearKey:     'confirmHomeClear',
  },
};

// Per-list state: cached items and checked (in-cart) items
const listState = {
  grocery: {
    cached:  [],
    checked: new Set(JSON.parse(
      localStorage.getItem('checked_grocery') ||
      localStorage.getItem('checkedItems') || '[]'
    )),
  },
  home: {
    cached:  [],
    checked: new Set(JSON.parse(localStorage.getItem('checked_home') || '[]')),
  },
};
// Migrate old key on first load
if (!localStorage.getItem('checked_grocery') && localStorage.getItem('checkedItems')) {
  localStorage.setItem('checked_grocery', localStorage.getItem('checkedItems'));
}
localStorage.removeItem('checkedItems');

function lc()     { return LIST_CONFIG[activeList]; }
function ls()     { return listState[activeList]; }
function listEl() { return document.getElementById(lc().listId); }

function saveChecked() {
  localStorage.setItem(`checked_${activeList}`, JSON.stringify([...ls().checked]));
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

  const canVouchers = user.canViewVouchers !== false;
  document.querySelector('.tab-btn[data-tab="vouchers"]').classList.toggle('hidden', !canVouchers);

  if (!canVouchers && currentTab === 'vouchers') {
    switchTab('shopping');
    return;
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
  if (selectionMode) exitSelectionMode();
  currentTab = tab;

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('pane-shopping').classList.toggle('hidden', tab !== 'shopping');
  document.getElementById('pane-home').classList.toggle('hidden', tab !== 'home');
  document.getElementById('pane-vouchers').classList.toggle('hidden', tab !== 'vouchers');

  if (tab === 'shopping') activeList = 'grocery';
  else if (tab === 'home') activeList = 'home';

  loadCurrentTab();
}

function loadCurrentTab() {
  if (currentTab === 'shopping' || currentTab === 'home') loadList();
  else loadVouchers();
}

// ─── Selection mode ───────────────────────────────────────────────────────────

function enterSelectionMode() {
  selectionMode = true;
  selectedItems.clear();
  listEl().classList.add('selection-active');
  document.getElementById(lc().selectBarId).classList.remove('hidden');
  updateSelectionBar();
}

function exitSelectionMode() {
  selectionMode = false;
  selectedItems.clear();
  const el = listEl();
  el.classList.remove('selection-active');
  el.querySelectorAll('.item-card.selected').forEach(c => c.classList.remove('selected'));
  document.getElementById(lc().selectBarId).classList.add('hidden');
}

function toggleItemSelect(name) {
  if (selectedItems.has(name)) selectedItems.delete(name);
  else selectedItems.add(name);
  const listId = lc().listId;
  document.querySelectorAll(`#${listId} .item-card[data-name="${CSS.escape(name)}"]`)
    .forEach(c => c.classList.toggle('selected', selectedItems.has(name)));
  updateSelectionBar();
}

function updateSelectionBar() {
  document.getElementById(lc().countId).textContent = t('selected', selectedItems.size);
  document.getElementById(lc().deleteSelId).disabled = selectedItems.size === 0;
}

// ─── In-cart checked state ────────────────────────────────────────────────────

function toggleChecked(name) {
  const checked = ls().checked;
  if (checked.has(name)) checked.delete(name);
  else checked.add(name);
  saveChecked();
  const listId = lc().listId;
  document.querySelectorAll(`#${listId} .item-card[data-name="${CSS.escape(name)}"]`)
    .forEach(c => c.classList.toggle('item-checked', checked.has(name)));
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function checkEmptyList() {
  const el = listEl();
  if (!el.querySelector('.swipe-wrap')) {
    el.innerHTML = `<li class="empty-item">${t(lc().emptyKey)}</li>`;
  }
}

function removeWrapFromDOM(name) {
  const listId = lc().listId;
  document.querySelector(`#${listId} .swipe-wrap[data-name="${CSS.escape(name)}"]`)?.remove();
}

// Animate item out then remove from DOM + update state + call API
function removeItemOptimistic(name) {
  const listId = lc().listId;
  const wrapEl = document.querySelector(`#${listId} .swipe-wrap[data-name="${CSS.escape(name)}"]`);
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
  ls().cached = ls().cached.filter(i => i.name !== name);
  ls().checked.delete(name);
  saveChecked();
  api('DELETE', lc().api + '/' + encodeURIComponent(name)).catch(e => {
    toast(e.message);
    loadList();
  });
}

// Delete all selected items with animation
function deleteSelectedItems() {
  if (selectedItems.size === 0) return;
  const names = [...selectedItems];
  const listId = lc().listId;
  exitSelectionMode();

  names.forEach(name => {
    const el = document.querySelector(`#${listId} .swipe-wrap[data-name="${CSS.escape(name)}"]`);
    if (el) el.style.height = el.offsetHeight + 'px';
  });

  requestAnimationFrame(() => {
    names.forEach(name => {
      const el = document.querySelector(`#${listId} .swipe-wrap[data-name="${CSS.escape(name)}"]`);
      if (!el) return;
      el.style.transition = 'opacity 0.15s ease, height 0.2s ease, margin-bottom 0.2s ease';
      el.style.opacity = '0';
      el.style.height = '0';
      el.style.marginBottom = '0';
    });
    setTimeout(() => {
      names.forEach(name => {
        removeWrapFromDOM(name);
        ls().cached = ls().cached.filter(i => i.name !== name);
        ls().checked.delete(name);
      });
      saveChecked();
      checkEmptyList();
      Promise.all(names.map(n => api('DELETE', lc().api + '/' + encodeURIComponent(n))))
        .catch(e => { toast(e.message); loadList(); });
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

// ─── Attach swipe + longpress ─────────────────────────────────────────────────

function attachListBehaviors(listKey) {
  document.getElementById(LIST_CONFIG[listKey].listId).querySelectorAll('.swipe-wrap').forEach(wrapEl => {
    const name = wrapEl.dataset.name;
    initSwipe(wrapEl, name);
    initLongPress(wrapEl, () => {
      if (!selectionMode) enterSelectionMode();
      toggleItemSelect(name);
    });
  });
}

// ─── Render a single item row ─────────────────────────────────────────────────

function buildItemLi(item, checked) {
  const addedByLabel = item.addedBy && item.addedBy !== 'web'
    ? `<span class="item-added-by">${esc(t('addedBy', item.addedBy.split('@')[0]))}</span>`
    : '';
  return `
    <li class="swipe-wrap" data-name="${esc(item.name)}">
      <div class="swipe-bg">${ICON_TRASH}</div>
      <div class="item-card${checked ? ' item-checked' : ''}" data-name="${esc(item.name)}">
        <span class="check-circle"></span>
        <div class="item-body">
          <span class="item-name">${esc(item.name)}</span>
          ${addedByLabel}
        </div>
        <button class="trash-btn" data-name="${esc(item.name)}">${ICON_TRASH}</button>
      </div>
    </li>
  `;
}

// Append a single new item without full re-render
function appendItemToDOM(item) {
  const el = listEl();
  el.querySelector('.empty-item')?.remove();
  const tmp = document.createElement('ul');
  tmp.innerHTML = buildItemLi(item, ls().checked.has(item.name));
  const newLi = tmp.firstElementChild;
  el.appendChild(newLi);
  initSwipe(newLi, item.name);
  initLongPress(newLi, () => {
    if (!selectionMode) enterSelectionMode();
    toggleItemSelect(item.name);
  });
}

// ─── Shopping / Home list ─────────────────────────────────────────────────────

async function loadList() {
  const key = activeList;
  try {
    const items = await api('GET', LIST_CONFIG[key].api);
    if (items === null) return;
    listState[key].cached = items;
    renderList(items, key);
  } catch (e) { toast(e.message); }
}

function renderList(items, listKey) {
  const cfg     = LIST_CONFIG[listKey];
  const checked = listState[listKey].checked;
  if (selectionMode) exitSelectionMode();
  const el = document.getElementById(cfg.listId);
  if (items.length === 0) {
    el.innerHTML = `<li class="empty-item">${t(cfg.emptyKey)}</li>`;
    return;
  }
  el.innerHTML = items.map(item => buildItemLi(item, checked.has(item.name))).join('');
  attachListBehaviors(listKey);
}

async function addListItem() {
  const input = document.getElementById(lc().inputId);
  const name  = input.value.trim();
  if (!name) return;
  input.value = '';
  const item = { name, addedBy: currentUser?.email || 'web' };
  ls().cached = [...ls().cached, item];
  appendItemToDOM(item);
  try {
    await api('POST', lc().api, { name });
  } catch (e) {
    ls().cached = ls().cached.filter(i => i.name !== name);
    removeWrapFromDOM(name);
    checkEmptyList();
    input.value = name;
    toast(e.message);
  }
}

async function clearList() {
  const ok = await confirm(t(lc().clearKey));
  if (!ok) return;
  ls().cached = [];
  ls().checked.clear();
  saveChecked();
  listEl().innerHTML = `<li class="empty-item">${t(lc().emptyKey)}</li>`;
  api('DELETE', lc().api).catch(e => { toast(e.message); loadList(); });
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

const ICON_PENCIL   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_CHECK_SM = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_X_SM     = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

async function loadVouchers() {
  const container = document.getElementById('vouchers-list');
  container.innerHTML = `<div style="padding:48px 16px;text-align:center;color:var(--muted);font-size:15px;font-weight:500;">Loading…</div>`;
  try {
    const vouchers = await api('GET', '/api/vouchers');
    if (vouchers === null) return;
    renderVouchers(vouchers);
  } catch (e) { toast(e.message); }
}

async function refreshVouchers() {
  const btn  = document.getElementById('refresh-btn');
  const icon = document.getElementById('refresh-icon');
  btn.disabled = true;
  icon.classList.add('spinning');
  try {
    const vouchers = await api('POST', '/api/vouchers/refresh');
    if (vouchers) renderVouchers(vouchers);
  } catch (e) { toast(e.message); }
  finally { btn.disabled = false; icon.classList.remove('spinning'); }
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
    container.innerHTML = `<div style="padding:48px 16px;text-align:center;color:var(--muted);font-size:15px;font-weight:500;">${t('noVouchers')}</div>`;
    return;
  }
  container.innerHTML = vouchers.map((v, idx) => {
    const cls  = expiryClass(v.expiryDate);
    const days = Math.ceil((new Date(v.expiryDate) - new Date()) / 86400000);
    return `
      <div class="voucher-card ${cls.card}" data-idx="${idx}" data-number="${esc(v.voucherNumber)}">
        <div class="voucher-header">
          <div style="flex:1;min-width:0;">
            <div class="voucher-provider">${esc(v.provider)}</div>
            <div class="balance-row">
              <span class="voucher-balance">₪${v.balance.toLocaleString()}</span>
              <button class="edit-balance-btn" title="Edit balance">${ICON_PENCIL}</button>
              <div class="balance-edit-row hidden">
                <input class="balance-input" type="number" step="0.01" min="0" value="${v.balance}">
                <button class="balance-save-btn">${ICON_CHECK_SM}</button>
                <button class="balance-cancel-btn">${ICON_X_SM}</button>
              </div>
            </div>
          </div>
          <div class="voucher-actions">
            <span class="expiry-badge ${cls.badge}">${t('daysLeft', days)}</span>
            <button class="v-trash-btn" data-number="${esc(v.voucherNumber)}">${ICON_TRASH}</button>
          </div>
        </div>
        <div class="voucher-divider"></div>
        <div class="voucher-meta">${t('expires', v.expiryDate)}${v.vendor ? ' · ' + esc(v.vendor) : ''}</div>
        <div class="voucher-number">${esc(v.voucherNumber)}</div>
        ${v.remarks ? `<div class="voucher-remarks">${esc(v.remarks)}</div>` : ''}
        <div class="voucher-tap-hint">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="18" width="3" height="3"/></svg>
          Tap card for QR code
        </div>
      </div>
    `;
  }).join('');

  container._vouchers = vouchers;

  container.addEventListener('click', e => {
    const trashBtn = e.target.closest('.v-trash-btn');
    if (trashBtn) { deleteVoucher(trashBtn.dataset.number); return; }

    const editBtn = e.target.closest('.edit-balance-btn');
    if (editBtn) { openBalanceEdit(editBtn.closest('.voucher-card')); return; }

    const saveBtn = e.target.closest('.balance-save-btn');
    if (saveBtn) { commitBalanceEdit(saveBtn.closest('.voucher-card')); return; }

    const cancelBtn = e.target.closest('.balance-cancel-btn');
    if (cancelBtn) { closeBalanceEdit(cancelBtn.closest('.voucher-card')); return; }

    if (!e.target.closest('.balance-edit-row') && !e.target.closest('.edit-balance-btn')) {
      const card = e.target.closest('.voucher-card');
      if (card && container._vouchers) showQR(container._vouchers[+card.dataset.idx]);
    }
  });

  container.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList.contains('balance-input'))
      commitBalanceEdit(e.target.closest('.voucher-card'));
    if (e.key === 'Escape' && e.target.classList.contains('balance-input'))
      closeBalanceEdit(e.target.closest('.voucher-card'));
  });
}

function openBalanceEdit(card) {
  card.querySelector('.voucher-balance').classList.add('hidden');
  card.querySelector('.edit-balance-btn').classList.add('hidden');
  const editRow = card.querySelector('.balance-edit-row');
  editRow.classList.remove('hidden');
  const input = editRow.querySelector('.balance-input');
  input.focus();
  input.select();
}

function closeBalanceEdit(card) {
  card.querySelector('.voucher-balance').classList.remove('hidden');
  card.querySelector('.edit-balance-btn').classList.remove('hidden');
  card.querySelector('.balance-edit-row').classList.add('hidden');
}

async function commitBalanceEdit(card) {
  const input  = card.querySelector('.balance-input');
  const parsed = parseFloat(input.value);
  if (isNaN(parsed) || parsed < 0) { toast('Enter a valid amount'); return; }
  const number = card.dataset.number;
  card.querySelector('.voucher-balance').textContent = '₪' + parsed.toLocaleString();
  closeBalanceEdit(card);
  const container = document.getElementById('vouchers-list');
  if (container._vouchers) {
    const v = container._vouchers.find(v => v.voucherNumber === number);
    if (v) v.balance = parsed;
  }
  try {
    await api('PATCH', `/api/vouchers/${encodeURIComponent(number)}/balance`, { balance: parsed });
  } catch (e) { toast(e.message); loadVouchers(); }
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

// ─── Wire up a list pane's buttons ───────────────────────────────────────────

function wireListPane(listKey) {
  const cfg = LIST_CONFIG[listKey];

  document.getElementById(cfg.addBtnId).addEventListener('click', addListItem);
  document.getElementById(cfg.inputId).addEventListener('keydown', e => {
    if (e.key === 'Enter') addListItem();
  });

  // Single permanent click handler for the list element
  document.getElementById(cfg.listId).addEventListener('click', e => {
    if (!e.target.closest('.swipe-wrap')) return;

    if (selectionMode) {
      const card = e.target.closest('.item-card');
      if (card) toggleItemSelect(card.dataset.name);
      return;
    }

    const trashBtn = e.target.closest('.trash-btn');
    if (trashBtn) { removeItemOptimistic(trashBtn.dataset.name); return; }

    const card = e.target.closest('.item-card');
    if (card) toggleChecked(card.dataset.name);
  });

  document.getElementById(cfg.clearBtnId).addEventListener('click', clearList);
  document.getElementById(cfg.cancelSelId).addEventListener('click', exitSelectionMode);
  document.getElementById(cfg.deleteSelId).addEventListener('click', deleteSelectedItems);
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

  wireListPane('grocery');
  wireListPane('home');

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
