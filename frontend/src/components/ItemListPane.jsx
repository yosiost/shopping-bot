import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import ItemRow from './ItemRow.jsx';

const LIST_CONFIG = {
  grocery: { api: '/api/shopping', emptyKey: 'noItems',     clearKey: 'confirmClear'     },
  home:    { api: '/api/home',     emptyKey: 'noHomeItems', clearKey: 'confirmHomeClear' },
};

// Client-side keyword categorization — best-effort, no backend changes needed
const CATEGORIES = [
  { key: 'produce',    label: { en: '🥬 Produce',     he: '🥬 ירקות ופירות'  }, words: ['tomato','cucumber','lettuce','spinach','apple','banana','orange','lemon','mango','pepper','carrot','onion','garlic','potato','avocado','grapes','strawberry','watermelon','salad','herb','עגבניה','מלפפון','חסה','תפוח','בננה','תפוז','גזר','בצל','שום','תפוח אדמה','אבוקדו','ענבים'] },
  { key: 'dairy',      label: { en: '🥛 Dairy',       he: '🥛 מוצרי חלב'    }, words: ['milk','cheese','yogurt','butter','cream','cottage','sour cream','מחלב','חלב','גבינה','יוגורט','חמאה','שמנת','קוטג'] },
  { key: 'meat',       label: { en: '🥩 Meat & Fish', he: '🥩 בשר ודגים'    }, words: ['chicken','beef','fish','pork','lamb','turkey','salmon','tuna','sausage','עוף','בשר','דג','כבש','הודו','סלמון','טונה','נקניק'] },
  { key: 'bakery',     label: { en: '🍞 Bakery',      he: '🍞 מאפייה'        }, words: ['bread','pita','baguette','croissant','roll','toast','לחם','פיתה','בגט','קרואסון','חלה','טוסט'] },
  { key: 'pantry',     label: { en: '🥫 Pantry',      he: '🥫 מזווה'         }, words: ['pasta','rice','beans','oil','salt','sugar','flour','sauce','cereal','coffee','tea','honey','vinegar','פסטה','אורז','שמן','מלח','סוכר','קמח','רוטב','קפה','תה','דבש'] },
  { key: 'toiletries', label: { en: '🧴 Toiletries',  he: '🧴 טואלטיקה'     }, words: ['shampoo','soap','toothpaste','deodorant','body wash','toilet paper','razor','שמפו','סבון','משחת שיניים','דאודורנט','נייר טואלט','תער'] },
  { key: 'cleaning',   label: { en: '🧹 Cleaning',    he: '🧹 ניקיון'        }, words: ['detergent','bleach','sponge','dish soap','fabric','מרכך','ניקוי','אקונומיקה','ספוג','סבון כלים'] },
];

function categorize(name) {
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.words.some(w => lower.includes(w))) return cat.key;
  }
  return 'other';
}

function groupItems(items) {
  const map = {};
  for (const item of items) {
    const key = categorize(item.name);
    (map[key] ||= []).push(item);
  }
  const order = CATEGORIES.map(c => c.key).filter(k => map[k]);
  if (map.other) order.push('other');
  return order.map(key => ({ key, label: CATEGORIES.find(c => c.key === key)?.label, items: map[key] }));
}

export default function ItemListPane({ listKey }) {
  const { t, toast, confirm, lang, user } = useApp();
  const cfg = LIST_CONFIG[listKey];

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(() =>
    new Set(JSON.parse(localStorage.getItem(`checked_${listKey}`) || '[]'))
  );
  const [selMode,  setSelMode]  = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [input,    setInput]    = useState('');

  const saveChecked = useCallback((set) => {
    localStorage.setItem(`checked_${listKey}`, JSON.stringify([...set]));
  }, [listKey]);

  const load = useCallback(async () => {
    try {
      const data = await api('GET', cfg.api);
      if (data !== null) setItems(data);
    } catch (e) { toast(e.message); }
    finally { setLoading(false); }
  }, [cfg.api, toast]);

  useEffect(() => { load(); }, [load]);

  const addItem = useCallback(async () => {
    const name = input.trim();
    if (!name) return;
    setInput('');
    const optimistic = { name };
    setItems(prev => [...prev, optimistic]);
    try {
      await api('POST', cfg.api, { name });
    } catch (e) {
      setItems(prev => prev.filter(i => i.name !== name));
      setInput(name);
      toast(e.message);
    }
  }, [input, cfg.api, toast]);

  const removeItem = useCallback(async (name) => {
    setItems(prev => prev.filter(i => i.name !== name));
    setChecked(prev => { const n = new Set(prev); n.delete(name); saveChecked(n); return n; });
    api('DELETE', `${cfg.api}/${encodeURIComponent(name)}`).catch(e => { toast(e.message); load(); });
  }, [cfg.api, toast, load, saveChecked]);

  const toggleChecked = useCallback((name) => {
    setChecked(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      saveChecked(n);
      return n;
    });
  }, [saveChecked]);

  const clearList = useCallback(async () => {
    const ok = await confirm(t(cfg.clearKey));
    if (!ok) return;
    setItems([]);
    setChecked(prev => { saveChecked(new Set()); return new Set(); });
    api('DELETE', cfg.api).catch(e => { toast(e.message); load(); });
  }, [confirm, t, cfg.clearKey, cfg.api, toast, load, saveChecked]);

  const enterSel = useCallback(() => { setSelMode(true); setSelected(new Set()); }, []);
  const exitSel  = useCallback(() => { setSelMode(false); setSelected(new Set()); }, []);

  const toggleSel = useCallback((name) => {
    setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }, []);

  const deleteSel = useCallback(async () => {
    const names = [...selected];
    exitSel();
    setItems(prev => prev.filter(i => !names.includes(i.name)));
    setChecked(prev => { const n = new Set(prev); names.forEach(k => n.delete(k)); saveChecked(n); return n; });
    try {
      await Promise.all(names.map(n => api('DELETE', `${cfg.api}/${encodeURIComponent(n)}`)));
    } catch (e) { toast(e.message); load(); }
  }, [selected, exitSel, cfg.api, toast, load, saveChecked]);

  const grouped = groupItems(items);
  const showCategories = grouped.length > 1 && grouped.some(g => g.key !== 'other');

  return (
    <div className="list-pane">
      <div className="add-row">
        <input
          className="add-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder={t(listKey === 'grocery' ? 'addItem' : 'addHomeItem')}
          autoComplete="off"
        />
        <button className="add-btn" onClick={addItem} aria-label="Add">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {selMode && (
        <div className="select-bar">
          <button className="sel-cancel" onClick={exitSel}>{t('cancel')}</button>
          <span className="sel-count">{t('selected', selected.size)}</span>
          <button className="sel-delete" disabled={selected.size === 0} onClick={deleteSel}>
            {t('deleteSelected')}
          </button>
        </div>
      )}

      {loading ? null : items.length === 0 ? (
        <div className="list-empty">{t(cfg.emptyKey)}</div>
      ) : showCategories ? (
        grouped.map(group => (
          <div key={group.key} className="category-group">
            <div className="category-pill">
              {group.label?.[lang] ?? group.key}
            </div>
            {group.items.map(item => (
              <ItemRow
                key={item.name}
                item={item}
                checked={checked.has(item.name)}
                selected={selected.has(item.name)}
                selMode={selMode}
                onCheck={() => selMode ? toggleSel(item.name) : toggleChecked(item.name)}
                onDelete={() => removeItem(item.name)}
                onLongPress={() => { if (!selMode) enterSel(); toggleSel(item.name); }}
              />
            ))}
          </div>
        ))
      ) : (
        items.map(item => (
          <ItemRow
            key={item.name}
            item={item}
            checked={checked.has(item.name)}
            selected={selected.has(item.name)}
            selMode={selMode}
            onCheck={() => selMode ? toggleSel(item.name) : toggleChecked(item.name)}
            onDelete={() => removeItem(item.name)}
            onLongPress={() => { if (!selMode) enterSel(); toggleSel(item.name); }}
          />
        ))
      )}

      <div className="pane-footer">
        <button className="clear-btn" onClick={clearList}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          {t('clearAll')}
        </button>
      </div>
    </div>
  );
}
