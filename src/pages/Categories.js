import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import './Categories.css';

const Categories = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useFinancial();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '💰',
    color: '#3b82f6',
    type: 'expense' // 'income' or 'expense'
  });

  const defaultIcons = [
    '🍽️', '🚗', '🛍️', '🎬', '🏥', '📋', '📚', '✈️', '🏠', '💡',
    '📱', '👕', '⛽', '🎵', '🏋️', '🍺', '🎁', '🐕', '💄', '🔧',
    '💰', '📈', '💼', '🎯', '🏆', '💎', '🎪', '🎨', '📷', '🎮'
  ];

  const defaultColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await addCategory(formData);
      }
      
      setShowForm(false);
      setEditingCategory(null);
      setFormData({
        name: '',
        icon: '💰',
        color: '#3b82f6',
        type: 'expense'
      });
    } catch (error) {
      console.error('Errore nel salvare la categoria:', error);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('Sei sicuro di voler eliminare questa categoria?')) {
      try {
        await deleteCategory(categoryId);
      } catch (error) {
        console.error('Errore nell\'eliminare la categoria:', error);
      }
    }
  };

  const incomeCategories = categories.filter(cat => cat.type === 'income');
  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  return (
    <div className="categories-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Gestione Categorie</h1>
          <p className="header-subtitle">
            Personalizza le tue categorie di entrate e uscite
          </p>
        </div>
        
        <button 
          className="primary-btn"
          onClick={() => setShowForm(true)}
        >
          <span className="btn-icon">+</span>
          Nuova Categoria
        </button>
      </div>

      {/* Statistiche */}
      <div className="categories-stats">
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <div className="stat-value">{incomeCategories.length}</div>
            <div className="stat-label">Categorie Entrate</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📉</div>
          <div className="stat-info">
            <div className="stat-value">{expenseCategories.length}</div>
            <div className="stat-label">Categorie Uscite</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{categories.length}</div>
            <div className="stat-label">Totale Categorie</div>
          </div>
        </div>
      </div>

      {/* Modal per aggiungere/modificare categoria */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="category-form">
              <div className="form-group">
                <label>Nome Categoria</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Es. Alimentari, Trasporti..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Tipo</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="type"
                      value="expense"
                      checked={formData.type === 'expense'}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    />
                    <span className="radio-label">💸 Uscita</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="type"
                      value="income"
                      checked={formData.type === 'income'}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    />
                    <span className="radio-label">💰 Entrata</span>
                  </label>
                </div>
              </div>
              
              <div className="form-group">
                <label>Icona</label>
                <div className="icon-selector">
                  {defaultIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => setFormData({...formData, icon})}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label>Colore</label>
                <div className="color-selector">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${formData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({...formData, color})}
                    />
                  ))}
                </div>
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowForm(false)}
                >
                  Annulla
                </button>
                <button type="submit" className="primary-btn">
                  {editingCategory ? 'Aggiorna' : 'Crea'} Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista Categorie */}
      <div className="categories-sections">
        {/* Categorie Entrate */}
        <div className="category-section">
          <h3 className="section-title">
            <span className="section-icon">📈</span>
            Categorie Entrate ({incomeCategories.length})
          </h3>
          
          <div className="categories-grid">
            {incomeCategories.map(category => (
              <div key={category.id} className="category-card income">
                <div className="category-header">
                  <div 
                    className="category-icon"
                    style={{ backgroundColor: category.color + '20', color: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div className="category-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => handleEdit(category)}
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(category.id)}
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="category-info">
                  <h4 className="category-name">{category.name}</h4>
                  <div className="category-meta">
                    <div 
                      className="color-indicator"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="category-type">Entrata</span>
                  </div>
                </div>
              </div>
            ))}
            
            {incomeCategories.length === 0 && (
              <div className="empty-category-section">
                <p>Nessuna categoria di entrata configurata</p>
              </div>
            )}
          </div>
        </div>

        {/* Categorie Uscite */}
        <div className="category-section">
          <h3 className="section-title">
            <span className="section-icon">📉</span>
            Categorie Uscite ({expenseCategories.length})
          </h3>
          
          <div className="categories-grid">
            {expenseCategories.map(category => (
              <div key={category.id} className="category-card expense">
                <div className="category-header">
                  <div 
                    className="category-icon"
                    style={{ backgroundColor: category.color + '20', color: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div className="category-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => handleEdit(category)}
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(category.id)}
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="category-info">
                  <h4 className="category-name">{category.name}</h4>
                  <div className="category-meta">
                    <div 
                      className="color-indicator"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="category-type">Uscita</span>
                  </div>
                </div>
              </div>
            ))}
            
            {expenseCategories.length === 0 && (
              <div className="empty-category-section">
                <p>Nessuna categoria di uscita configurata</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;