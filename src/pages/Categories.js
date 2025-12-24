// src/pages/Categories.js
import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import './Categories.css';

const Categories = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useFinancial();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'
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

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleAddSubcategory = () => {
    const trimmedValue = newSubcategory.trim();
    if (trimmedValue) {
      setFormData((prev) => ({
        ...prev,
        subCategories: [...(prev.subCategories || []), trimmedValue],
      }));
      setNewSubcategory('');
    }
  };

  const handleRemoveSubcategoryFromForm = (index) => {
    setFormData((prev) => ({
      ...prev,
      subCategories: prev.subCategories.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name,
        icon: formData.icon,
        color: formData.color,
        type: formData.type,
        subCategories: formData.subCategories || [],
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
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      subCategories: (category.subCategories || []).map((sub) =>
        typeof sub === 'string' ? sub : sub.name
      ),
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

  const filteredCategories = categories.filter(
    (cat) => filterType === 'all' || cat.type === filterType
  );

  const incomeCategories = categories.filter((cat) => cat.type === 'income');
  const expenseCategories = categories.filter((cat) => cat.type === 'expense');

  const getSubcategoriesFromCategory = (category) => {
    const arr = category.subCategories || [];
    return arr.map((sub) => (typeof sub === 'string' ? sub : sub.name));
  };

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

          <button className="primary-btn" onClick={() => setShowForm(true)}>
            <span className="btn-icon">+</span>
            Nuova Categoria
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="stats-overview">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{categories.length}</div>
            <div className="stat-label">Totale Categorie</div>
          </div>
        </div>

        <div className="stat-card income">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <div className="stat-value">{incomeCategories.length}</div>
            <div className="stat-label">Categorie Entrate</div>
          </div>
        </div>

        <div className="stat-card expense">
          <div className="stat-icon">📉</div>
          <div className="stat-info">
            <div className="stat-value">{expenseCategories.length}</div>
            <div className="stat-label">Categorie Uscite</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filter-section">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Tutte ({categories.length})
          </button>
          <button
            className={`filter-tab ${filterType === 'income' ? 'active' : ''}`}
            onClick={() => setFilterType('income')}
          >
            Entrate ({incomeCategories.length})
          </button>
          <button
            className={`filter-tab ${filterType === 'expense' ? 'active' : ''}`}
            onClick={() => setFilterType('expense')}
          >
            Uscite ({expenseCategories.length})
          </button>
        </div>
      </div>

      {/* Lista Categorie */}
      <div className="categories-section">
        {viewMode === 'grid' ? (
          <div className="categories-grid">
            {filteredCategories.map((category) => {
              const subcats = getSubcategoriesFromCategory(category);

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
                          backgroundColor: category.color + '20',
                          color: category.color,
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
                      <button
                        className="expand-btn"
                        onClick={() => toggleCategory(category.id)}
                      >
                        {expandedCategories[category.id] ? '▼ Nascondi' : '▶ Mostra'}{' '}
                        sottocategorie
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
              const subcats = getSubcategoriesFromCategory(category);

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
                        backgroundColor: category.color + '20',
                        color: category.color,
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
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Es. Alimentari, Stipendio..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo</label>
                <div className="type-selector">
                  <label
                    className={`type-option ${formData.type === 'expense' ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="expense"
                      checked={formData.type === 'expense'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                    />
                    <span className="type-content">
                      <span className="type-icon">💸</span>
                      <span className="type-label">Uscita</span>
                    </span>
                  </label>

                  <label
                    className={`type-option ${formData.type === 'income' ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="income"
                      checked={formData.type === 'income'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
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
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          icon,
                        }))
                      }
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
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          color,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Sottocategorie */}
              <div className="form-group">
                <label>Sottocategorie (opzionale)</label>
                <div className="subcategory-input-group">
                  <input
                    type="text"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    placeholder="Es. Supermercato, Frutta..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="add-subcategory-btn"
                    onClick={handleAddSubcategory}
                  >
                    + Aggiungi
                  </button>
                </div>

                {formData.subCategories && formData.subCategories.length > 0 && (
                  <div className="subcategories-tags">
                    {formData.subCategories.map((sub, index) => (
                      <div key={index} className="subcategory-tag">
                        <span>{sub}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategoryFromForm(index)}
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
