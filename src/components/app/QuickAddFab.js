import React, { useEffect, useRef, useState } from 'react';
import { FiPlus, FiX, FiDollarSign, FiTarget, FiPieChart, FiCreditCard, FiGrid } from 'react-icons/fi';

function QuickAddFab({ setActiveMenu }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

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

  const quickActions = [
    { id: 'quick-tx', label: 'Nuova Transazione', icon: FiDollarSign, menu: 'transactions' },
    { id: 'quick-account', label: 'Nuovo Conto', icon: FiCreditCard, menu: 'accounts' },
    { id: 'quick-category', label: 'Nuova Categoria', icon: FiGrid, menu: 'categories' },
    { id: 'quick-budget', label: 'Nuovo Budget', icon: FiPieChart, menu: 'budgets' },
    { id: 'quick-goal', label: 'Nuovo Obiettivo', icon: FiTarget, menu: 'savings' }
  ];

  return (
    <div className="quick-add-root" ref={rootRef} data-onboarding-target="quickadd">
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
