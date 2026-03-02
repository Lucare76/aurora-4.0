// src/pages/Categories.js
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { db } from '../services/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { formatEntityLabel } from '../utils/text';
import PageHeader from '../components/app/PageHeader';
import './Categories.css';


/* Hook per rilevare mobile (matchMedia) */
function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    const onChange = () => setIsMobile(media.matches);

    onChange();

    if (media.addEventListener) media.addEventListener('change', onChange);
    else media.addListener(onChange);

    return () => {
      if (media.removeEventListener) media.removeEventListener('change', onChange);
      else media.removeListener(onChange);
    };
  }, [query]);

  return isMobile;
}

const Categories = () => {
  const { categories, transactions = [], addCategory, updateCategory, deleteCategory } = useFinancial();
  const allCategories = useMemo(() => {
  return Array.isArray(categories) ? categories : [];
}, [categories]);


  const isMobile = useIsMobile();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [filterType, setFilterType] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    icon: '💰',
    color: '#3b82f6',
    type: 'expense',
    subCategories: [],
  });

  const [newSubcategory, setNewSubcategory] = useState('');
  const [cleanupBusy, setCleanupBusy] = useState(false);

  const defaultIcons = [
    '💰', '🛒', '🚗', '🎬', '🏥', '📋', '🛍️', '🍽️', '🏠', '💼',
    '💻', '📈', '🎁', '🎯', '⚡', '📱', '👕', '⛽', '🎵', '🏋️',
    '🍺', '🐕', '💄', '🔧', '📷', '🎮', '✈️', '📚', '🎨', '💊',
  ];

  const defaultColors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  ];

  const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const toTitleCase = (value) => formatEntityLabel(value);
  const normalizeKey = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const normalizeSubCategories = (arr) => {
    const input = Array.isArray(arr) ? arr : [];
    return input
      .map((sub) => {
        if (typeof sub === 'string') {
          const name = toTitleCase(sub);
          if (!name) return null;
          return { id: makeId(), name };
        }
        if (sub && typeof sub === 'object') {
          const name = toTitleCase(sub.name ?? '');
          if (!name) return null;
          return { id: sub.id || makeId(), name };
        }
        return null;
      })
      .filter(Boolean);
  };

  const getSubcategoriesNames = (category) => {
    const arr = category?.subCategories || [];
    return arr.map((sub) => (typeof sub === 'string' ? sub : sub?.name)).filter(Boolean);
  };

  /* Accordion su mobile (apre 1 sola categoria alla volta) */
  const toggleCategory = useCallback(
    (categoryId) => {
      setExpandedCategories((prev) => {
        const nextOpen = !prev[categoryId];
        if (isMobile) return { [categoryId]: nextOpen };
        return { ...prev, [categoryId]: nextOpen };
      });
    },
    [isMobile]
  );

  const handleAddSubcategory = () => {
    const name = toTitleCase(newSubcategory);
    if (!name) return;

    const exists = (formData.subCategories || []).some(
      (s) => s?.name?.toLowerCase?.() === name.toLowerCase()
    );
    if (exists) {
      setNewSubcategory('');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      subCategories: [...(prev.subCategories || []), { id: makeId(), name }],
    }));
    setNewSubcategory('');
  };

  const handleRemoveSubcategoryFromForm = (subId) => {
    setFormData((prev) => ({
      ...prev,
      subCategories: (prev.subCategories || []).filter((s) => s.id !== subId),
    }));
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      icon: '💰',
      color: '#3b82f6',
      type: 'expense',
      subCategories: [],
    });
    setNewSubcategory('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: toTitleCase(formData.name),
        icon: formData.icon,
        color: formData.color,
        type: formData.type,
        subCategories: normalizeSubCategories(formData.subCategories),
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await addCategory(payload);
      }

      resetForm();
    } catch (error) {
      console.error('Errore nel salvare la categoria:', error);
      alert('Errore nel salvare la categoria. Controlla la console.');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      icon: category.icon || '💰',
      color: category.color || '#3b82f6',
      type: category.type || 'expense',
      subCategories: normalizeSubCategories(category.subCategories || []),
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!categoryId) {
      console.error('❌ categoryId è undefined, null o vuoto');
      alert('Errore: ID categoria non valido');
      return;
    }

    const conferma = window.confirm('Sei sicuro di voler eliminare questa categoria?');
    if (!conferma) return;

    try {
      await deleteCategory(categoryId);
      alert('Categoria eliminata con successo!');
    } catch (error) {
      console.error("❌ Errore completo nell'eliminazione:", error);

      let errorMessage = "Errore durante l'eliminazione della categoria.";
      if (error.code === 'permission-denied') {
        errorMessage =
          'Errore: Non hai i permessi per eliminare questa categoria. Verifica le regole di Firebase.';
      } else if (error.message) {
        errorMessage = `Errore: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  const handleUppercaseDescriptions = async () => {
    if (cleanupBusy) return;
    const toUpdate = (transactions || []).filter((t) => {
      const current = String(t?.description || '');
      if (!current.trim()) return false;
      return current.toLocaleUpperCase('it-IT') !== current;
    });

    if (!toUpdate.length) {
      alert('Nessuna descrizione da uniformare.');
      return;
    }

    const ok = window.confirm(`Vuoi rendere MAIUSCOLE ${toUpdate.length} descrizioni?`);
    if (!ok) return;

    setCleanupBusy(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      let updated = 0;

      for (const t of toUpdate) {
        const nextDesc = String(t.description || '').toLocaleUpperCase('it-IT').trim();
        if (!nextDesc) continue;
        batch.update(doc(db, 'transactions', t.id), { description: nextDesc });
        count++;
        updated++;

        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) await batch.commit();
      alert(`Descrizioni uniformate: ${updated}`);
    } catch (error) {
      console.error('Errore uniformazione descrizioni:', error);
      alert('Errore durante l’uniformazione delle descrizioni.');
    } finally {
      setCleanupBusy(false);
    }
  };

  const handleMergeDuplicateCategories = async () => {
    if (cleanupBusy) return;
    if (!allCategories.length) return;

    const groups = new Map();
    for (const cat of allCategories) {
      const key = `${normalizeKey(cat.name)}|${cat.type || 'expense'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(cat);
    }

    const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
    if (!duplicateGroups.length) {
      alert('Nessuna categoria duplicata trovata.');
      return;
    }

    const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + (g.length - 1), 0);
    const ok = window.confirm(
      `Trovate ${totalDuplicates} categorie duplicate in ${duplicateGroups.length} gruppi.\n` +
      'Vuoi unirle e aggiornare le transazioni collegate?'
    );
    if (!ok) return;

    setCleanupBusy(true);
    try {
      const txByCategory = new Map();
      for (const t of transactions || []) {
        if (!t?.categoryId) continue;
        const list = txByCategory.get(t.categoryId) || [];
        list.push(t);
        txByCategory.set(t.categoryId, list);
      }

      for (const group of duplicateGroups) {
        // scegli canonical: quello con più transazioni
        const sorted = [...group].sort((a, b) => {
          const ca = (txByCategory.get(a.id) || []).length;
          const cb = (txByCategory.get(b.id) || []).length;
          return cb - ca;
        });
        const canonical = sorted[0];
        const duplicates = sorted.slice(1);

        const canonicalSubs = Array.isArray(canonical.subCategories) ? [...canonical.subCategories] : [];
        const subByName = new Map(
          canonicalSubs.map((s) => [normalizeKey(s?.name), s])
        );

        // unisci sottocategorie
        for (const dup of duplicates) {
          const dupSubs = Array.isArray(dup.subCategories) ? dup.subCategories : [];
          for (const sub of dupSubs) {
            const key = normalizeKey(sub?.name);
            if (!key || subByName.has(key)) continue;
            subByName.set(key, sub);
            canonicalSubs.push(sub);
          }
        }

        if (canonicalSubs.length !== canonical.subCategories?.length) {
          await updateCategory(canonical.id, { subCategories: canonicalSubs });
        }

        // mappa sottocategorie canonical per nome
        const canonicalSubMap = new Map(
          canonicalSubs.map((s) => [normalizeKey(s?.name), s])
        );

        // aggiorna transazioni dei duplicati
        let batch = writeBatch(db);
        let count = 0;

        for (const dup of duplicates) {
          const txs = txByCategory.get(dup.id) || [];
          for (const t of txs) {
            const subKey = normalizeKey(t.subCategoryName || '');
            const mapped = canonicalSubMap.get(subKey);
            batch.update(doc(db, 'transactions', t.id), {
              categoryId: canonical.id,
              categoryName: canonical.name,
              subCategoryId: mapped?.id || null,
              subCategoryName: mapped?.name || (t.subCategoryName || '')
            });
            count++;
            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
        }

        if (count > 0) await batch.commit();

        // elimina categorie duplicate
        for (const dup of duplicates) {
          await deleteCategory(dup.id);
        }
      }

      alert('Categorie duplicate unite con successo.');
    } catch (error) {
      console.error('Errore unione categorie duplicate:', error);
      alert('Errore durante l’unione delle categorie duplicate.');
    } finally {
      setCleanupBusy(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const q = normalizeKey(searchTerm);
    return allCategories.filter((cat) => {
      if (filterType !== 'all' && cat.type !== filterType) return false;
      if (!q) return true;
      const name = normalizeKey(cat?.name);
      if (name.includes(q)) return true;
      const subs = getSubcategoriesNames(cat).map((s) => normalizeKey(s));
      return subs.some((s) => s.includes(q));
    });
  }, [allCategories, filterType, searchTerm]);

  const incomeCategories = useMemo(() => {
    return allCategories.filter((cat) => cat.type === 'income');
  }, [allCategories]);

  const expenseCategories = useMemo(() => {
    return allCategories.filter((cat) => cat.type === 'expense');
  }, [allCategories]);

  /* ==================== MOBILE CARD ==================== */
  const renderMobileCard = (category) => {
    const subcats = getSubcategoriesNames(category);
    const borderColor = category.type === 'income' ? '#10b981' : '#ef4444';
    const isOpen = !!expandedCategories[category.id];

    return (
      <div
        key={category.id}
        className="category-mobile-card"
        style={{
          background: '#1e293b',
          borderRadius: 14,
          padding: 16,
          marginBottom: 12,
          boxShadow: '0 4px 12px rgba(15,23,42,0.4)',
          border: '1px solid rgba(148,163,184,0.2)',
          borderLeft: `4px solid ${borderColor}`,
        }}
      >
        <div className="category-mobile-head" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            className="category-mobile-icon"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: (category.color || '#3b82f6') + '20',
              color: category.color || '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {category.icon}
          </div>

          <div className="category-mobile-content" style={{ flex: 1, overflow: 'hidden' }}>
            <div
              className="category-mobile-title"
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#f1f5f9',
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}
            >
              {category.name}
            </div>

            <div className="category-mobile-meta" style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {category.type === 'income' ? '📈 Entrata' : '📉 Uscita'}
              {subcats.length > 0 && ` · ${subcats.length} sottocategorie`}
            </div>
          </div>
        </div>

        {/* Azioni */}
        <div className="category-mobile-actions" style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => handleEdit(category)}
            className="category-mobile-btn edit"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.22)',
              background: 'rgba(148,163,184,0.10)',
              color: 'rgba(226,232,240,0.88)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ✏️ Modifica
          </button>

          <button
            onClick={() => handleDelete(category.id)}
            className="category-mobile-btn delete"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.28)',
              background: 'rgba(239,68,68,0.14)',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            🗑️ Elimina
          </button>
        </div>

        {/* Sottocategorie */}
        {subcats.length > 0 && (
          <>
            <button
              onClick={() => toggleCategory(category.id)}
              className="category-mobile-toggle"
              style={{
                width: '100%',
                padding: 10,
                marginTop: 12,
                background: 'rgba(15,23,42,0.35)',
                border: '1px solid rgba(148,163,184,0.22)',
                borderRadius: 10,
                fontSize: 13,
                color: 'rgba(226,232,240,0.90)',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              {isOpen ? '▼ Nascondi' : '▶ Mostra'} sottocategorie
            </button>

            {isOpen && (
              <div className="category-mobile-subcats" style={{ marginTop: 10 }}>
                <div className="category-mobile-subcats-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {subcats.map((sub, index) => (
                    <span
                      key={index}
                      className="category-mobile-subcat"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(148,163,184,0.18)',
                        background: 'rgba(15,23,42,0.35)',
                        color: 'rgba(226,232,240,0.95)',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  /* ==================== RENDER ==================== */
  return (
    <div className="categories-page">
      {/* Header */}
      <PageHeader
        className="page-header"
        title="Gestione Categorie"
        subtitle="Organizza le tue finanze con categorie e sottocategorie personalizzate"
        actions={(
        <div className="header-actions">
          {!isMobile && (
            <div className="view-controls">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <span>⊞</span> Griglia
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <span>☰</span> Lista
              </button>
            </div>
          )}

          {!isMobile && (
            <>
              <button
                className="secondary-btn"
                onClick={handleUppercaseDescriptions}
                type="button"
                disabled={cleanupBusy}
              >
                {cleanupBusy ? 'Pulizia...' : 'Uniforma Descrizioni'}
              </button>

              <button
                className="secondary-btn"
                onClick={handleMergeDuplicateCategories}
                type="button"
                disabled={cleanupBusy}
              >
                {cleanupBusy ? 'Pulizia...' : 'Unisci Categorie Duplicate'}
              </button>
            </>
          )}

          <button className="primary-btn" onClick={() => setShowForm(true)}>
            <span className="btn-icon">+</span>
            Nuova Categoria
          </button>

          {isMobile && (
            <div className="mobile-actions">
              <button
                className="secondary-btn"
                type="button"
                onClick={() => setShowActionsMenu((prev) => !prev)}
              >
                Altro
              </button>
              {showActionsMenu && (
                <div className="mobile-actions-menu">
                  <button
                    className="mobile-actions-item"
                    type="button"
                    onClick={() => {
                      setShowActionsMenu(false);
                      handleUppercaseDescriptions();
                    }}
                    disabled={cleanupBusy}
                  >
                    {cleanupBusy ? 'Pulizia...' : 'Uniforma Descrizioni'}
                  </button>
                  <button
                    className="mobile-actions-item"
                    type="button"
                    onClick={() => {
                      setShowActionsMenu(false);
                      handleMergeDuplicateCategories();
                    }}
                    disabled={cleanupBusy}
                  >
                    {cleanupBusy ? 'Pulizia...' : 'Unisci Categorie Duplicate'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      />

      <div className="categories-sticky">
        <div className="categories-toolbar">
          <div className="categories-search">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca categorie o sottocategorie..."
              className="categories-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="categories-search-clear"
                onClick={() => setSearchTerm('')}
                aria-label="Svuota ricerca"
                title="Svuota ricerca"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Statistiche */}
        <div className="stats-overview">
          <div
            className={`stat-card total ${filterType === 'all' ? 'active-filter' : ''}`}
            onClick={() => setFilterType('all')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-value">{allCategories.length}</div>
              <div className="stat-label">Tutte</div>
            </div>
          </div>

          <div
            className={`stat-card income ${filterType === 'income' ? 'active-filter' : ''}`}
            onClick={() => setFilterType('income')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <div className="stat-value">{incomeCategories.length}</div>
              <div className="stat-label">Entrate</div>
            </div>
          </div>

          <div
            className={`stat-card expense ${filterType === 'expense' ? 'active-filter' : ''}`}
            onClick={() => setFilterType('expense')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">📉</div>
            <div className="stat-info">
              <div className="stat-value">{expenseCategories.length}</div>
              <div className="stat-label">Uscite</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista categorie */}
      <div className="categories-section">
        {isMobile ? (
          <div style={{ padding: 16 }}>{filteredCategories.map(renderMobileCard)}</div>
        ) : viewMode === 'grid' ? (
          <div className="categories-grid">
            {filteredCategories.map((category) => {
              const subcats = getSubcategoriesNames(category);

              return (
                <div
                  key={category.id}
                  className={`category-card ${category.type} ${
                    expandedCategories[category.id] ? 'expanded' : ''
                  }`}
                >
                  <div className="category-header">
                    <div className="category-main">
                      <div
                        className="category-icon"
                        style={{
                          backgroundColor: (category.color || '#3b82f6') + '20',
                          color: category.color || '#3b82f6',
                        }}
                      >
                        {category.icon}
                      </div>

                      <div className="category-text">
                        <h4 className="category-name" title={category.name}>
                          {category.name}
                        </h4>

                        <div className="category-meta-row">
                          <span className={`category-type ${category.type}`}>
                            {category.type === 'income' ? '📈 Entrata' : '📉 Uscita'}
                          </span>

                          {subcats.length > 0 && (
                            <span className="subcategory-count">
                              {subcats.length} sottocategorie
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="category-actions">
                      <button
                        className="action-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(category);
                        }}
                        title="Modifica"
                      >
                        ✏️
                      </button>

                      <button
                        className="action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(category.id);
                        }}
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {subcats.length > 0 && (
                    <>
                      <button className="expand-btn" onClick={() => toggleCategory(category.id)}>
                        {expandedCategories[category.id] ? '▼ Nascondi' : '▶ Mostra'} sottocategorie
                      </button>

                      {expandedCategories[category.id] && (
                        <div className="subcategories-list">
                          {subcats.map((sub, index) => (
                            <div key={index} className="subcategory-item">
                              <span className="subcategory-bullet">•</span>
                              <span className="subcategory-name">{sub}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="categories-list">
            {filteredCategories.map((category) => {
              const subcats = getSubcategoriesNames(category);

              return (
                <div
                  key={category.id}
                  className={`category-row ${category.type} ${
                    expandedCategories[category.id] ? 'expanded' : ''
                  }`}
                >
                  <div className="row-main">
                    <div
                      className="category-icon"
                      style={{
                        backgroundColor: (category.color || '#3b82f6') + '20',
                        color: category.color || '#3b82f6',
                      }}
                    >
                      {category.icon}
                    </div>

                    <div className="category-details">
                      <h4 className="category-name" title={category.name}>
                        {category.name}
                      </h4>

                      <div className="category-meta-row">
                        <span className={`category-type ${category.type}`}>
                          {category.type === 'income' ? 'Entrata' : 'Uscita'}
                        </span>

                        {subcats.length > 0 && (
                          <span className="subcategory-count">
                            {subcats.length} sottocategorie
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="category-actions">
                      {subcats.length > 0 && (
                        <button
                          className="action-btn expand"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(category.id);
                          }}
                          title="Espandi"
                        >
                          {expandedCategories[category.id] ? '▼' : '▶'}
                        </button>
                      )}

                      <button
                        className="action-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(category);
                        }}
                      >
                        ✏️ Modifica
                      </button>

                      <button
                        className="action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(category.id);
                        }}
                      >
                        🗑️ Elimina
                      </button>
                    </div>
                  </div>

                  {expandedCategories[category.id] && subcats.length > 0 && (
                    <div className="subcategories-expanded">
                      {subcats.map((sub, index) => (
                        <div key={index} className="subcategory-item">
                          <span className="subcategory-bullet">•</span>
                          <span className="subcategory-name">{sub}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filteredCategories.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>Nessuna categoria trovata</h3>
            <p>
              {filterType === 'all'
                ? 'Inizia creando la tua prima categoria personalizzata!'
                : `Non hai ancora categorie di ${filterType === 'income' ? 'entrata' : 'uscita'}.`}
            </p>
            <button onClick={() => setShowForm(true)} className="empty-action-btn">
              Crea Prima Categoria
            </button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-backdrop" onClick={resetForm}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}</h2>
              <button className="modal-close" onClick={resetForm}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="category-form">
              <div className="form-group">
                <label>Nome Categoria</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Es. Alimentari, Stipendio..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo</label>
                <div className="type-selector">
                  <label className={`type-option ${formData.type === 'expense' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value="expense"
                      checked={formData.type === 'expense'}
                      onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    />
                    <span className="type-content">
                      <span className="type-icon">💸</span>
                      <span className="type-label">Uscita</span>
                    </span>
                  </label>

                  <label className={`type-option ${formData.type === 'income' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value="income"
                      checked={formData.type === 'income'}
                      onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    />
                    <span className="type-content">
                      <span className="type-icon">💰</span>
                      <span className="type-label">Entrata</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Icona</label>
                <div className="icon-grid">
                  {defaultIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-btn ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Colore</label>
                <div className="color-grid">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-btn ${formData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Sottocategorie (opzionale)</label>

                <div className="subcategory-input-group">
                  <input
                    type="text"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    placeholder="Es. Supermercato, Frutta..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategory();
                      }
                    }}
                  />
                  <button type="button" className="add-subcategory-btn" onClick={handleAddSubcategory}>
                    + Aggiungi
                  </button>
                </div>

                {formData.subCategories?.length > 0 && (
                  <div className="subcategories-tags">
                    {formData.subCategories.map((sub) => (
                      <div key={sub.id} className="subcategory-tag">
                        <span>{sub.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategoryFromForm(sub.id)}
                          className="remove-tag-btn"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  Annulla
                </button>
                <button type="submit" className="submit-btn">
                  {editingCategory ? 'Aggiorna' : 'Crea'} Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
