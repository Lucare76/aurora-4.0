import React, { useEffect, useRef, useState } from 'react';
import { FiPlus, FiX, FiDollarSign, FiTarget, FiPieChart, FiCreditCard, FiGrid } from 'react-icons/fi';

function QuickAddFab({ setActiveMenu }) {
  const [open, setOpen] = useState(false);
  const [hiddenOnScroll, setHiddenOnScroll] = useState(false);
  const rootRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onEsc = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  useEffect(() => {
    const onShortcut = (event) => {
      if (!event.shiftKey || String(event.key).toLowerCase() !== 'a') return;
      const tag = String(event.target?.tagName || '').toLowerCase();
      const isTypingField =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        event.target?.isContentEditable === true;
      if (isTypingField) return;
      event.preventDefault();
      setOpen((p) => !p);
    };
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    lastScrollYRef.current = window.scrollY || 0;

    const evaluateScroll = () => {
      const isMobile = window.innerWidth <= 768;
      const y = window.scrollY || 0;
      const delta = y - lastScrollYRef.current;

      if (!isMobile || open) {
        setHiddenOnScroll(false);
      } else if (y < 80) {
        setHiddenOnScroll(false);
      } else if (delta > 8) {
        setHiddenOnScroll(true);
      } else if (delta < -8) {
        setHiddenOnScroll(false);
      }

      lastScrollYRef.current = y;
      tickingRef.current = false;
    };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(evaluateScroll);
    };

    const onResize = () => {
      if (window.innerWidth > 768) setHiddenOnScroll(false);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const quickActions = [
    { id: 'quick-tx', label: 'Nuova Transazione', icon: FiDollarSign, menu: 'transactions' },
    { id: 'quick-account', label: 'Nuovo Conto', icon: FiCreditCard, menu: 'accounts' },
    { id: 'quick-category', label: 'Nuova Categoria', icon: FiGrid, menu: 'categories' },
    { id: 'quick-budget', label: 'Nuovo Budget', icon: FiPieChart, menu: 'budgets' },
    { id: 'quick-goal', label: 'Nuovo Obiettivo', icon: FiTarget, menu: 'savings' }
  ];

  return (
    <div
      className={`quick-add-root ${hiddenOnScroll && !open ? 'fab-hidden' : ''}`}
      ref={rootRef}
      data-onboarding-target="quickadd"
    >
      {open && (
        <div className="quick-add-menu">
          <div className="quick-add-shortcut-hint">Scorciatoia: Shift + A</div>
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                className="quick-add-item"
                onClick={() => {
                  setActiveMenu?.(a.menu);
                  setOpen(false);
                }}
              >
                <span className="quick-add-item-icon"><Icon /></span>
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className={`quick-add-fab ${open ? 'open' : ''}`}
        title={open ? 'Chiudi azioni rapide (Shift+A)' : 'Aggiungi rapido (Shift+A)'}
        onClick={() => setOpen((p) => !p)}
      >
        {open ? <FiX /> : <FiPlus />}
      </button>
    </div>
  );
}

export default QuickAddFab;
