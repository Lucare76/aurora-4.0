// src/components/import/NotafacileCategoryMapper.js
import React, { useState, useMemo } from 'react';

/**
 * Step di mappatura categorie e conti NotaFacile → Aurora
 * Prima dell'import finale
 */
function NotafacileCategoryMapper({ 
  transactions, 
  auroraCategories, 
  auroraAccounts,
  initialCategoryMap = {},
  initialAccountMap = {},
  onConfirm,
  onCancel 
}) {
  // Estrae categorie uniche dal file NotaFacile
  const uniqueNotafacileCategories = useMemo(() => {
    const seen = new Set();
    const unique = [];
    
    for (const t of transactions) {
      const srcCategory = t.originalCategory || t.categoryName || '';
      const srcSubCategory = t.originalSubcategory || t.subcategoryName || t.subCategoryName || '';
      const key = `${srcCategory}|${srcSubCategory}`;
      if (!seen.has(key) && srcCategory) {
        seen.add(key);
        unique.push({
          category: srcCategory,
          subcategory: srcSubCategory,
          key
        });
      }
    }
    
    return unique.sort((a, b) => a.category.localeCompare(b.category));
  }, [transactions]);

  // Estrae conti unici dal file NotaFacile
  const uniqueNotafacileAccounts = useMemo(() => {
    const seen = new Set();
    const unique = [];
    
    for (const t of transactions) {
      const acc = t.originalAccountName || t.accountName || 'Sconosciuto';
      if (!seen.has(acc)) {
        seen.add(acc);
        unique.push(acc);
      }
    }
    
    return unique.sort();
  }, [transactions]);

  // Mappature: NotaFacile key → Aurora ID
  const initialCategoryMapFromProps = initialCategoryMap || {};
  const initialAccountMapFromProps = initialAccountMap || {};
  const [categoryMap, setCategoryMap] = useState({});
  const [accountMap, setAccountMap] = useState({});

  // Auto-mappatura intelligente all'inizializzazione
  useMemo(() => {
    const initialCategoryMap = {};
    const initialAccountMap = {};

    // Auto-mappa categorie per nome simile
    for (const nf of uniqueNotafacileCategories) {
      const match = auroraCategories.find(
        ac => ac.name.toLowerCase().trim() === nf.category.toLowerCase().trim()
      );
      if (match) {
        initialCategoryMap[nf.key] = match.id;
      }
    }

    // Auto-mappa conti per nome simile
    for (const nfAcc of uniqueNotafacileAccounts) {
      const match = auroraAccounts.find(
        aa => aa.name.toLowerCase().includes(nfAcc.toLowerCase()) ||
              nfAcc.toLowerCase().includes(aa.name.toLowerCase())
      );
      if (match) {
        initialAccountMap[nfAcc] = match.id;
      }
    }

    setCategoryMap({ ...initialCategoryMap, ...initialCategoryMapFromProps });
    setAccountMap({ ...initialAccountMap, ...initialAccountMapFromProps });
  }, []); // eslint-disable-line

  const handleCategoryChange = (nfKey, auroraId) => {
    setCategoryMap(prev => ({ ...prev, [nfKey]: auroraId }));
  };

  const handleAccountChange = (nfAccount, auroraId) => {
    setAccountMap(prev => ({ ...prev, [nfAccount]: auroraId }));
  };

  const handleConfirm = () => {
    // Applica le mappature alle transazioni
    const mapped = transactions.map(t => {
      const catKey = `${t.originalCategory || t.categoryName || ''}|${t.originalSubcategory || t.subcategoryName || t.subCategoryName || ''}`;
      const mappedCategoryId = categoryMap[catKey];
      const mappedAccountId = accountMap[t.originalAccountName || t.accountName || 'Sconosciuto'];

      const auroraCategory = auroraCategories.find(c => c.id === mappedCategoryId);

      return {
        ...t,
        categoryId: mappedCategoryId || null,
        categoryName: auroraCategory?.name || t.categoryName,
        accountId: mappedAccountId || null,
        accountName: auroraAccounts.find(a => a.id === mappedAccountId)?.name || t.accountName,
      };
    });

    onConfirm(mapped, categoryMap, accountMap);
  };

  const mappedCount = Object.keys(categoryMap).filter(k => categoryMap[k]).length;
  const totalCategories = uniqueNotafacileCategories.length;
  const mappedAccounts = Object.keys(accountMap).filter(k => accountMap[k]).length;
  const totalAccounts = uniqueNotafacileAccounts.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🔗 Mappa Categorie e Conti</h2>
        <p style={styles.subtitle}>
          Associa le categorie e i conti di NotaFacile a quelli di Aurora prima di importare
        </p>
      </div>

      {/* Statistiche */}
      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <span style={styles.statValue}>{mappedCount}/{totalCategories}</span>
          <span style={styles.statLabel}>Categorie mappate</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statValue}>{mappedAccounts}/{totalAccounts}</span>
          <span style={styles.statLabel}>Conti mappati</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statValue}>{transactions.length}</span>
          <span style={styles.statLabel}>Transazioni da importare</span>
        </div>
      </div>

      <div style={styles.content}>
        {/* Mappatura Categorie */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📁 Categorie</h3>
          <div style={styles.mappingList}>
            {uniqueNotafacileCategories.map(nf => {
              const isMapped = !!categoryMap[nf.key];
              const transCount = transactions.filter(
                t => t.categoryName === nf.category && (t.subcategoryName || '') === nf.subcategory
              ).length;

              return (
                <div key={nf.key} style={styles.mappingRow}>
                  <div style={styles.mappingLeft}>
                    <div style={styles.mappingSource}>
                      {nf.category}
                      {nf.subcategory && <span style={styles.subcategory}> / {nf.subcategory}</span>}
                    </div>
                    <div style={styles.mappingCount}>{transCount} transazioni</div>
                  </div>
                  <div style={styles.arrow}>→</div>
                  <select
                    value={categoryMap[nf.key] || ''}
                    onChange={(e) => handleCategoryChange(nf.key, e.target.value)}
                    style={{
                      ...styles.mappingSelect,
                      borderColor: isMapped ? '#22c55e' : '#ef4444'
                    }}
                  >
                    <option value="">— Non mappata —</option>
                    {auroraCategories.map(ac => (
                      <option key={ac.id} value={ac.id}>
                        {ac.icon || '📁'} {ac.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mappatura Conti */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>💳 Conti</h3>
          <div style={styles.mappingList}>
            {uniqueNotafacileAccounts.map(nfAcc => {
              const isMapped = !!accountMap[nfAcc];
              const transCount = transactions.filter(t => (t.accountName || 'Sconosciuto') === nfAcc).length;

              return (
                <div key={nfAcc} style={styles.mappingRow}>
                  <div style={styles.mappingLeft}>
                    <div style={styles.mappingSource}>{nfAcc}</div>
                    <div style={styles.mappingCount}>{transCount} transazioni</div>
                  </div>
                  <div style={styles.arrow}>→</div>
                  <select
                    value={accountMap[nfAcc] || ''}
                    onChange={(e) => handleAccountChange(nfAcc, e.target.value)}
                    style={{
                      ...styles.mappingSelect,
                      borderColor: isMapped ? '#22c55e' : '#ef4444'
                    }}
                  >
                    <option value="">— Non mappato —</option>
                    {auroraAccounts.map(aa => (
                      <option key={aa.id} value={aa.id}>
                        {aa.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Avvisi */}
      {(mappedCount < totalCategories || mappedAccounts < totalAccounts) && (
        <div style={styles.warningBox}>
          ⚠️ Alcune voci non sono mappate. Le transazioni saranno importate senza categoria o conto.
        </div>
      )}

      {/* Azioni */}
      <div style={styles.actions}>
        <button onClick={onCancel} style={styles.btnCancel}>
          ← Annulla
        </button>
        <button onClick={handleConfirm} style={styles.btnConfirm}>
          Conferma e Importa →
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: '1.5rem',
    color: '#e2e8f0'
  },
  header: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  title: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#fff'
  },
  subtitle: {
    margin: '0.5rem 0 0',
    opacity: 0.7,
    fontSize: '0.9rem'
  },
  statsRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  statBox: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '0.75rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff'
  },
  statLabel: {
    fontSize: '0.75rem',
    opacity: 0.7
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  section: {},
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 0.75rem',
    color: '#fff'
  },
  mappingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  mappingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.05)'
  },
  mappingLeft: {
    flex: 1,
    minWidth: 0
  },
  mappingSource: {
    fontWeight: 600,
    fontSize: '0.9rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  subcategory: {
    opacity: 0.7,
    fontWeight: 400
  },
  mappingCount: {
    fontSize: '0.75rem',
    opacity: 0.6,
    marginTop: '0.15rem'
  },
  arrow: {
    fontSize: '1.2rem',
    opacity: 0.5,
    flexShrink: 0
  },
  mappingSelect: {
    flex: 1.2,
    padding: '0.5rem',
    borderRadius: 8,
    border: '2px solid',
    background: 'rgba(0,0,0,0.3)',
    color: '#e2e8f0',
    fontSize: '0.85rem'
  },
  warningBox: {
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 10,
    padding: '0.75rem 1rem',
    marginTop: '1rem',
    fontSize: '0.85rem'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '1.5rem',
    gap: '1rem'
  },
  btnCancel: {
    background: 'rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '0.75rem 1.5rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.95rem'
  },
  btnConfirm: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '0.75rem 1.5rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.95rem'
  }
};

export default NotafacileCategoryMapper;
