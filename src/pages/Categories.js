// src/pages/Categories.js - VERSIONE COMPLETA E CORRETTA
import React, { useState, useEffect, useMemo } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import './Categories.css';

const Categories = () => {
  const { categories, transactions, accounts, addCategory, updateCategory, deleteCategory, addSubCategory, removeSubCategory } = useFinancial();
  const { user } = useAuth();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [activeType, setActiveType] = useState('all'); // 'all', 'expense', 'income'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [newSubCategory, setNewSubCategory] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '💰',
    color: '#4f46e5',
    type: 'expense',
    subCategories: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Icone disponibili
  const availableIcons = [
    '💰', '🍕', '🚗', '🏠', '🎬', '🏥', '🛍️', '💼', '📈', '🎁',
    '💻', '📱', '💡', '✈️', '🎓', '🏋️', '🎨', '📚', '🍽️', '☕',
    '🛒', '🚌', '🏛️', '🎮', '🎵', '📺', '🛏️', '🧹', '👕', '💄',
    '🐕', '👶', '💍', '📦', '🎫', '💊', '🧴', '🔧', '🎯', '❤️'
  ];

  // Colori disponibili
  const availableColors = [
    '#4f46e5', '#7c3aed', '#ef4444', '#f59e0b', '#10b981',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#84cc16',
    '#f97316', '#6366f1', '#14b8a6', '#0ea5e9', '#64748b'
  ];

  // Inizializza il form quando si apre per aggiunta
  useEffect(() => {
    if (showForm && !editingCategory) {
      setFormData({
        name: '',
        description: '',
        icon: '💰',
        color: '#4f46e5',
        type: 'expense',
        subCategories: []
      });
      setNewSubCategory('');
    }
  }, [showForm, editingCategory]);

  // Calcola statistiche per categoria
  const getCategoryStats = (categoryId) => {
    const categoryTransactions = transactions.filter(t => t.category === categoryId);
    const total = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const count = categoryTransactions.length;
    
    // Calcola degli ultimi 30 giorni
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = categoryTransactions.filter(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return date >= thirtyDaysAgo;
    });
    
    const recentTotal = recentTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    
    // Calcola per conto
    const byAccount = {};
    categoryTransactions.forEach(t => {
      const account = accounts.find(a => a.id === t.accountId);
      if (account) {
        if (!byAccount[account.id]) {
          byAccount[account.id] = {
            account: account,
            total: 0,
            count: 0
          };
        }
        byAccount[account.id].total += Math.abs(t.amount || 0);
        byAccount[account.id].count += 1;
      }
    });
    
    return { 
      total, 
      count, 
      recentTotal,
      byAccount: Object.values(byAccount)
    };
  };

  // Calcola statistiche totali
  const totalStats = useMemo(() => {
    const expenseCategories = categories.filter(cat => cat.type === 'expense');
    const incomeCategories = categories.filter(cat => cat.type === 'income');
    
    const expenseTotal = expenseCategories.reduce((sum, cat) => {
      const stats = getCategoryStats(cat.id);
      return sum + stats.total;
    }, 0);
    
    const incomeTotal = incomeCategories.reduce((sum, cat) => {
      const stats = getCategoryStats(cat.id);
      return sum + stats.total;
    }, 0);
    
    return {
      totalCategories: categories.length,
      expenseCategories: expenseCategories.length,
      incomeCategories: incomeCategories.length,
      expenseTotal,
      incomeTotal,
      netBalance: incomeTotal - expenseTotal
    };
  }, [categories, transactions, accounts]);

  // Filtra categorie in base al tipo attivo
  const filteredCategories = useMemo(() => {
    if (activeType === 'all') return categories;
    return categories.filter(cat => cat.type === activeType);
  }, [categories, activeType]);

  // Gestione form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIconSelect = (icon) => {
    setFormData(prev => ({
      ...prev,
      icon
    }));
  };

  const handleColorSelect = (color) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
  };

  const handleTypeSelect = (type) => {
    setFormData(prev => ({
      ...prev,
      type
    }));
  };

  // Gestione sottocategorie
  const handleAddSubCategory = () => {
    if (!newSubCategory.trim()) return;
    
    const newSub = {
      id: Date.now().toString(),
      name: newSubCategory.trim(),
      icon: '📋',
      color: formData.color
    };
    
    setFormData(prev => ({
      ...prev,
      subCategories: [...prev.subCategories, newSub]
    }));
    
    setNewSubCategory('');
  };

  const handleRemoveSubCategory = (subId) => {
    setFormData(prev => ({
      ...prev,
      subCategories: prev.subCategories.filter(sub => sub.id !== subId)
    }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Il nome della categoria è obbligatorio');
      return;
    }
    
    // Verifica che il nome non esista già (escludendo quella in modifica)
    const existingCategory = categories.find(
      cat => cat.name.toLowerCase() === formData.name.toLowerCase() && 
      (!editingCategory || cat.id !== editingCategory.id)
    );
    
    if (existingCategory) {
      setError('Esiste già una categoria con questo nome');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      if (editingCategory) {
        // Modifica categoria esistente
        await updateCategory(editingCategory.id, {
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          type: formData.type,
          subCategories: formData.subCategories
        });
        setEditingCategory(null);
      } else {
        // Crea nuova categoria
        await addCategory({
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          type: formData.type,
          subCategories: formData.subCategories
        });
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        icon: '💰',
        color: '#4f46e5',
        type: 'expense',
        subCategories: []
      });
      setNewSubCategory('');
      setShowForm(false);
    } catch (error) {
      console.error('Errore:', error);
      setError(error.message || 'Si è verificato un errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  // Gestione modifica categoria
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || '💰',
      color: category.color || '#4f46e5',
      type: category.type || 'expense',
      subCategories: category.subCategories || []
    });
    setShowForm(true);
  };

  // Gestione eliminazione categoria
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa categoria? Le transazioni associate non verranno eliminate, ma perderanno la categoria.')) {
      return;
    }
    
    try {
      await deleteCategory(categoryId);
    } catch (error) {
      alert(`Errore: ${error.message}`);
    }
  };

  // Gestione aggiunta sottocategoria esistente
  const handleAddSubCategoryToExisting = async (categoryId) => {
    const subName = prompt('Inserisci il nome della nuova sottocategoria:');
    if (!subName || !subName.trim()) return;
    
    try {
      await addSubCategory(categoryId, {
        name: subName.trim(),
        icon: '📋',
        color: '#6b7280'
      });
    } catch (error) {
      alert(`Errore: ${error.message}`);
    }
  };

  // Gestione eliminazione sottocategoria esistente
  const handleRemoveSubCategoryFromExisting = async (categoryId, subCategoryId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa sottocategoria?')) {
      return;
    }
    
    try {
      await removeSubCategory(categoryId, subCategoryId);
    } catch (error) {
      alert(`Errore: ${error.message}`);
    }
  };

  // Formatta importo
  const formatAmount = (amount) => {
    return `€${parseFloat(amount).toFixed(2)}`;
  };

  // Calcola percentuale
  const calculatePercentage = (amount, total) => {
    if (total === 0) return '0.0';
    return ((amount / total) * 100).toFixed(1);
  };

  if (!user) {
    return (
      <div className="categories-page">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h3>Accesso Richiesto</h3>
          <p>Devi effettuare il login per gestire le categorie.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="categories-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Categorie</h1>
          <p className="header-subtitle">
            {totalStats.totalCategories} categorie • {transactions.length} transazioni
          </p>
        </div>
        
        <div className="header-actions">
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              📊 Grid
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 Lista
            </button>
          </div>
          
          <button 
            className="primary-btn"
            onClick={() => {
              setEditingCategory(null);
              setShowForm(true);
            }}
          >
            <span className="btn-icon">+</span>
            Nuova Categoria
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="stats-overview">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div>
            <div className="stat-value">{totalStats.totalCategories}</div>
            <div className="stat-label">Categorie Totali</div>
          </div>
        </div>
        
        <div className="stat-card income">
          <div className="stat-icon">📈</div>
          <div>
            <div className="stat-value">{formatAmount(totalStats.incomeTotal)}</div>
            <div className="stat-label">{totalStats.incomeCategories} Entrate</div>
          </div>
        </div>
        
        <div className="stat-card expense">
          <div className="stat-icon">📉</div>
          <div>
            <div className="stat-value">{formatAmount(totalStats.expenseTotal)}</div>
            <div className="stat-label">{totalStats.expenseCategories} Uscite</div>
          </div>
        </div>
        
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white' }}>
          <div className="stat-icon">⚖️</div>
          <div>
            <div className="stat-value">{formatAmount(totalStats.netBalance)}</div>
            <div className="stat-label">Bilancio Netto</div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filter-section">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeType === 'all' ? 'active' : ''}`}
            onClick={() => setActiveType('all')}
          >
            Tutte
          </button>
          <button 
            className={`filter-tab ${activeType === 'expense' ? 'active' : ''}`}
            onClick={() => setActiveType('expense')}
          >
            Uscite
          </button>
          <button 
            className={`filter-tab ${activeType === 'income' ? 'active' : ''}`}
            onClick={() => setActiveType('income')}
          >
            Entrate
          </button>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => {
          if (!loading) {
            setShowForm(false);
            setEditingCategory(null);
          }
        }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}</h2>
              <button 
                onClick={() => {
                  if (!loading) {
                    setShowForm(false);
                    setEditingCategory(null);
                  }
                }} 
                className="modal-close"
                disabled={loading}
              >
                &times;
              </button>
            </div>
            
            <div className="category-form">
              {error && (
                <div className="error-message" style={{ margin: '0 24px 24px' }}>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                {/* Nome e Descrizione */}
                <div className="form-group">
                  <label>Nome Categoria *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Es. Alimentari, Trasporti, Stipendio..."
                    className="form-input"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Descrizione (opzionale)</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Descrizione della categoria..."
                    className="form-input"
                    rows="3"
                    disabled={loading}
                  />
                </div>
                
                {/* Tipo */}
                <div className="form-group">
                  <label>Tipo *</label>
                  <div className="type-selector">
                    <label className={`type-option ${formData.type === 'expense' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="type"
                        value="expense"
                        checked={formData.type === 'expense'}
                        onChange={() => handleTypeSelect('expense')}
                        disabled={loading}
                      />
                      <div className="type-content">
                        <div className="type-icon" style={{ color: '#ef4444' }}>📉</div>
                        <div className="type-label">Uscita</div>
                      </div>
                    </label>
                    
                    <label className={`type-option ${formData.type === 'income' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="type"
                        value="income"
                        checked={formData.type === 'income'}
                        onChange={() => handleTypeSelect('income')}
                        disabled={loading}
                      />
                      <div className="type-content">
                        <div className="type-icon" style={{ color: '#10b981' }}>📈</div>
                        <div className="type-label">Entrata</div>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Icona */}
                <div className="form-group">
                  <label>Icona</label>
                  <div className="icon-grid">
                    {availableIcons.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`icon-btn ${formData.icon === icon ? 'selected' : ''}`}
                        onClick={() => handleIconSelect(icon)}
                        disabled={loading}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Colore */}
                <div className="form-group">
                  <label>Colore</label>
                  <div className="color-grid">
                    {availableColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`color-btn ${formData.color === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorSelect(color)}
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Sottocategorie */}
                <div className="subcategories-form-section">
                  <div className="subcategories-form-header">
                    <h3>Sottocategorie</h3>
                  </div>
                  
                  <div className="subcategories-list-form">
                    {formData.subCategories.map(sub => (
                      <div key={sub.id} className="subcategory-form-item">
                        <span className="subcategory-form-name">{sub.icon} {sub.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubCategory(sub.id)}
                          className="remove-subcategory-btn"
                          disabled={loading}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    
                    {formData.subCategories.length === 0 && (
                      <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '10px 0' }}>
                        Nessuna sottocategoria aggiunta
                      </p>
                    )}
                  </div>
                  
                  <div className="add-subcategory-form">
                    <input
                      type="text"
                      value={newSubCategory}
                      onChange={(e) => setNewSubCategory(e.target.value)}
                      placeholder="Nome sottocategoria..."
                      className="add-subcategory-input"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={handleAddSubCategory}
                      className="add-subcategory-btn-form"
                      disabled={loading || !newSubCategory.trim()}
                    >
                      Aggiungi
                    </button>
                  </div>
                </div>
                
                {/* Azioni */}
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCategory(null);
                    }}
                    className="cancel-btn"
                    disabled={loading}
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                  >
                    {loading ? 'Salvataggio...' : (editingCategory ? 'Salva Modifiche' : 'Crea Categoria')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista Categorie - Vista Grid */}
      {viewMode === 'grid' && filteredCategories.length > 0 && (
        <div className="categories-grid">
          {filteredCategories.map(category => {
            const stats = getCategoryStats(category.id);
            const percentage = category.type === 'expense' 
              ? calculatePercentage(stats.total, totalStats.expenseTotal)
              : calculatePercentage(stats.total, totalStats.incomeTotal);
            
            return (
              <div 
                key={category.id} 
                className={`category-card ${category.type}`}
                style={{ '--category-color': category.color }}
              >
                <div className="category-header">
                  <div 
                    className="category-icon"
                    style={{ 
                      backgroundColor: category.color + '20',
                      color: category.color
                    }}
                  >
                    {category.icon}
                  </div>
                  
                  <div className="category-info">
                    <h3 className="category-name">{category.name}</h3>
                    <div className="category-type">
                      <span className={`category-type ${category.type}`}>
                        {category.type === 'income' ? '📈 Entrata' : '📉 Uscita'}
                      </span>
                    </div>
                    {category.description && (
                      <p className="category-description">{category.description}</p>
                    )}
                  </div>
                  
                  <div className="category-actions">
                    <button 
                      onClick={() => handleEditCategory(category)}
                      className="action-btn edit"
                      title="Modifica categoria"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(category.id)}
                      className="action-btn delete"
                      title="Elimina categoria"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {/* Sottocategorie */}
                {category.subCategories && category.subCategories.length > 0 && (
                  <div className="subcategories-section">
                    <div className="subcategories-header">
                      <h4 className="subcategories-title">Sottocategorie</h4>
                      <button 
                        onClick={() => handleAddSubCategoryToExisting(category.id)}
                        className="add-subcategory-btn"
                        title="Aggiungi sottocategoria"
                      >
                        +
                      </button>
                    </div>
                    <div className="subcategories-list">
                      {category.subCategories.map(sub => (
                        <div key={sub.id} className="subcategory-badge">
                          <span className="subcategory-icon">{sub.icon}</span>
                          <span className="subcategory-name">{sub.name}</span>
                          <button 
                            onClick={() => handleRemoveSubCategoryFromExisting(category.id, sub.id)}
                            className="action-btn delete"
                            style={{ padding: '2px', fontSize: '0.7rem', marginLeft: '4px' }}
                            title="Elimina sottocategoria"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Statistiche */}
                <div className="category-stats">
                  <div className="stat-item">
                    <span className="stat-label">Totale</span>
                    <span className={`stat-value ${category.type === 'income' ? 'positive' : 'negative'}`}>
                      {formatAmount(stats.total)}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Transazioni</span>
                    <span className="stat-value">{stats.count}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Peso</span>
                    <span className="stat-value">{percentage}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Ultimi 30gg</span>
                    <span className="stat-value">{formatAmount(stats.recentTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista Categorie - Vista Lista */}
      {viewMode === 'list' && filteredCategories.length > 0 && (
        <div className="categories-list">
          {filteredCategories.map(category => {
            const stats = getCategoryStats(category.id);
            
            return (
              <div key={category.id} className="category-row">
                <div className="row-main">
                  <div 
                    className="category-icon"
                    style={{ 
                      backgroundColor: category.color + '20',
                      color: category.color,
                      width: '50px',
                      height: '50px',
                      fontSize: '1.5rem'
                    }}
                  >
                    {category.icon}
                  </div>
                  
                  <div className="category-details">
                    <h3 className="category-name">{category.name}</h3>
                    <div className="category-type">
                      <span className={`category-type ${category.type}`}>
                        {category.type === 'income' ? '📈 Entrata' : '📉 Uscita'}
                      </span>
                    </div>
                    {category.description && (
                      <p className="category-description">{category.description}</p>
                    )}
                    
                    {/* Sottocategorie in lista */}
                    {category.subCategories && category.subCategories.length > 0 && (
                      <div className="subcategories-list" style={{ marginTop: '8px' }}>
                        {category.subCategories.slice(0, 3).map(sub => (
                          <span key={sub.id} className="subcategory-badge" style={{ fontSize: '0.8rem' }}>
                            {sub.icon} {sub.name}
                          </span>
                        ))}
                        {category.subCategories.length > 3 && (
                          <span className="subcategory-badge" style={{ fontSize: '0.8rem' }}>
                            +{category.subCategories.length - 3} altre
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="category-stats" style={{ textAlign: 'right', marginLeft: 'auto' }}>
                    <div className={`stat-value ${category.type === 'income' ? 'positive' : 'negative'}`} style={{ fontSize: '1.1rem' }}>
                      {formatAmount(stats.total)}
                    </div>
                    <div className="stat-label">{stats.count} transazioni</div>
                  </div>
                  
                  <div className="category-actions">
                    <button 
                      onClick={() => handleEditCategory(category)}
                      className="action-btn edit"
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(category.id)}
                      className="action-btn delete"
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stato vuoto */}
      {filteredCategories.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>
            {activeType === 'all' ? 'Nessuna categoria trovata' : 
             activeType === 'expense' ? 'Nessuna categoria uscita' : 
             'Nessuna categoria entrata'}
          </h3>
          <p>
            {activeType === 'all' ? 'Inizia creando la tua prima categoria!' :
             `Non hai ancora creato categorie di tipo ${activeType === 'expense' ? 'uscita' : 'entrata'}.`}
          </p>
          <button
            onClick={() => {
              setEditingCategory(null);
              setShowForm(true);
              if (activeType !== 'all') {
                setFormData(prev => ({ ...prev, type: activeType }));
              }
            }}
            className="empty-action-btn"
          >
            Crea Nuova Categoria
          </button>
        </div>
      )}
    </div>
  );
};

export default Categories;