import React from 'react';
import { useFinancial } from '../contexts/FinancialContext';

const Categories = () => {
  const { categories, loading } = useFinancial();

  if (loading) return <div>Caricamento categorie...</div>;

  return (
    <div className="content-page">
      <div className="page-header">
        <h1>Gestione Categorie 🏷️</h1>
        <p>Organizza le tue spese per categoria</p>
      </div>

      <div className="section">
        <h2 className="section-title">Categorie</h2>
        <div className="categories-grid">
          {categories.map(cat => (
            <div key={cat.id} className="category-card">
              <h3>{cat.name}</h3>
              <p className={`category-type ${cat.type}`}>{cat.type}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;