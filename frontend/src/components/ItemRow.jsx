import { useRef, useCallback } from 'react';
import { useApp } from '../App.jsx';

const SWIPE_THRESHOLD = 80;

export default function ItemRow({ item, checked, selected, selMode, onCheck, onDelete, onLongPress }) {
  const { t, lang } = useApp();
  const wrapRef  = useRef(null);
  const cardRef  = useRef(null);
  const touchRef = useRef({ startX: 0, startY: 0, swiping: false, committed: false });
  const lpTimer  = useRef(null);

  const clearLP = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; } };

  const onTouchStart = useCallback((e) => {
    if (selMode) return;
    const { clientX, clientY } = e.touches[0];
    touchRef.current = { startX: clientX, startY: clientY, swiping: false, committed: false };
    cardRef.current.style.transition = 'none';

    lpTimer.current = setTimeout(() => {
      lpTimer.current = null;
      if (navigator.vibrate) navigator.vibrate(40);
      onLongPress();
    }, 450);
  }, [selMode, onLongPress]);

  const onTouchMove = useCallback((e) => {
    const { startX, startY, committed } = touchRef.current;
    if (committed) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!touchRef.current.swiping) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      clearLP();
      if (Math.abs(dy) > Math.abs(dx)) return;
      touchRef.current.swiping = true;
    }

    e.preventDefault();
    const isRtl  = lang === 'he';
    const capped = isRtl
      ? Math.max(0, Math.min(SWIPE_THRESHOLD * 2, dx))
      : Math.max(-SWIPE_THRESHOLD * 2, Math.min(0, dx));
    cardRef.current.style.transform = `translateX(${capped}px)`;
  }, [lang]);

  const onTouchEnd = useCallback((e) => {
    clearLP();
    if (!touchRef.current.swiping) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    cardRef.current.style.transition = 'transform 0.22s ease';

    const isRtl = lang === 'he';
    const triggered = isRtl ? dx > SWIPE_THRESHOLD : dx < -SWIPE_THRESHOLD;
    if (triggered) {
      touchRef.current.committed = true;
      const dir = isRtl ? wrapRef.current.offsetWidth : -wrapRef.current.offsetWidth;
      cardRef.current.style.transform = `translateX(${dir}px)`;
      setTimeout(onDelete, 200);
    } else {
      cardRef.current.style.transform = '';
    }
  }, [lang, onDelete]);

  const onTouchCancel = useCallback(() => {
    clearLP();
    if (!touchRef.current.committed) {
      cardRef.current.style.transition = 'transform 0.22s ease';
      cardRef.current.style.transform  = '';
    }
  }, []);

  const showAlias = item.addedByAlias && item.addedByAlias !== 'web';

  return (
    <div ref={wrapRef} className="item-wrap">
      <div className="swipe-bg" aria-hidden="true">
        <TrashIcon size={16} />
      </div>
      <div
        ref={cardRef}
        className={`item-card${checked ? ' checked' : ''}${selected ? ' selected' : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        onClick={onCheck}
      >
        <span className={`check-circle${checked ? ' done' : ''}${selected ? ' sel' : ''}`}>
          {(checked || selected) && <CheckIcon />}
        </span>
        <div className="item-body">
          <span className="item-name">{item.name}</span>
          {showAlias && <span className="item-by">{t('addedBy', item.addedByAlias)}</span>}
        </div>
        {!selMode && (
          <button
            className="trash-btn"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            aria-label="Delete"
          >
            <TrashIcon size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function TrashIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
