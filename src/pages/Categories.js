// src/pages/Categories.js
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
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
  const { categories, addCategory, updateCategory, deleteCategory } = useFinancial();
  const allCategories = useMemo(() => {
  return Array.isArray(categories) ? categories : [];
}, [categories]);


  const isMobile = useIsMobile();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [filterType, setFilterType] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    icon: '💰',
    color: '#3b82f6',
    type: 'expense',
    subCategories: [],
  });

  const [newSubcategory, setNewSubcategory] = useState('');

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

  const normalizeSubCategories = (arr) => {
    const input = Array.isArray(arr) ? arr : [];
    return input
      .map((sub) => {
        if (typeof sub === 'string') {
          const name = sub.trim();
          if (!name) return null;
          return { id: makeId(), name };
        }
        if (sub && typeof sub === 'object') {
          const name = (sub.name ?? '').toString().trim();
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
    const name = newSubcategory.trim();
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
        name: formData.name.trim(),
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

  const filteredCategories = useMemo(() => {
    return allCategories.filter((cat) => filterType === 'all' || cat.type === filterType);
  }, [allCategories, filterType]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
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

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
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

            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {category.type === 'income' ? '📈 Entrata' : '📉 Uscita'}
              {subcats.length > 0 && ` · ${subcats.length} sottocategorie`}
            </div>
          </div>
        </div>

        {/* Azioni */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => handleEdit(category)}
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
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {subcats.map((sub, index) => (
                    <span
                      key={index}
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
      <div className="page-header">
        <div className="header-content">
          <h1>Gestione Categorie</h1>
          <p className="header-subtitle">
            Organizza le tue finanze con categorie e sottocategorie personalizzate
          </p>
        </div>

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

          <button className="primary-btn" onClick={() => setShowForm(true)}>
            <span className="btn-icon">+</span>
            Nuova Categoria
          </button>
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
