// src/services/notafacileImportService.js
// Importazione file XLS esportati da NotaFacile.net

import * as XLSX from 'xlsx';

/**
 * Mappa categorie NotaFacile → categorie Aurora
 * Personalizza questo oggetto in base alle tue categorie su Aurora
 */
const CATEGORY_MAP = {
  // Alimentari
  'Supermercato': 'Alimentari',
  'Ristorante': 'Alimentari',
  'Bar': 'Alimentari',
  'Pizzeria': 'Alimentari',

  // Casa
  'Affitto': 'Casa',
  'Utenze': 'Casa',
  'Spese Condominiali': 'Casa',
  'Manutenzione Casa': 'Casa',
  'Caldaia': 'Casa',
  'Acqua luce': 'Casa',

  // Auto
  'Auto': 'Auto',
  'Benzina': 'Auto',
  'Gasolio': 'Auto',
  'Telepass': 'Auto',

  // Salute
  'Salute': 'Salute',
  'Medicinali': 'Salute',
  'Farmacia': 'Salute',
  'Visite Specialistiche': 'Salute',
  'Visite specialistiche': 'Salute',

  // Trasporti
  'Trasporti e viaggi': 'Trasporti',
  'Nave': 'Trasporti',

  // Tasse & Banca
  'Tasse': 'Tasse',
  'Commissioni Banca': 'Tasse',
  'Canone postecclick': 'Tasse',

  // Abbonamenti
  'Abbonamenti Internet': 'Abbonamenti',
  'American Express': 'Abbonamenti',

  // Regali
  'Regali': 'Regali',

  // Entrate
  'Disoccupazione': 'Entrate varie',
  'Rimborsi': 'Entrate varie',
  'Entrate varie': 'Entrate varie',
};

const CATEGORY_HINTS = {
  supermercato: ['Alimentari', 'Spesa'],
  ristorante: ['Ristoranti', 'Alimentari'],
  bar: ['Ristoranti', 'Alimentari'],
  pizzeria: ['Ristoranti', 'Alimentari'],
  farmacia: ['Salute'],
  medicinali: ['Salute'],
  benzina: ['Auto', 'Trasporti'],
  gasolio: ['Auto', 'Trasporti'],
  telepass: ['Auto', 'Trasporti'],
  affitto: ['Casa'],
  utenze: ['Casa', 'Bollette'],
  commissioni: ['Tasse'],
  paypal: ['Tasse'],
  americanexpress: ['Abbonamenti', 'Tasse'],
  regalo: ['Regali'],
  regali: ['Regali']
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreTextMatch(a, b) {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.8;

  const wa = x.split(' ').filter((w) => w.length > 2);
  const wb = new Set(y.split(' ').filter((w) => w.length > 2));
  if (!wa.length || !wb.size) return 0;
  let hits = 0;
  for (const w of wa) if (wb.has(w)) hits += 1;
  return hits / Math.max(wa.length, 1);
}

/**
 * Converte una data dal formato DD/MM/YYYY o numero seriale Excel in oggetto Date
 */
function parseNotafacileDate(value) {
  if (!value) return new Date();

  // Stringa nel formato DD/MM/YYYY
  if (typeof value === 'string') {
    const parts = value.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }

  // Numero seriale Excel
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date;
  }

  return new Date();
}

/**
 * Mappa la categoria NotaFacile alla categoria Aurora più vicina
 */
function mapCategory(notafacileCategory, subcategory) {
  if (!notafacileCategory) return 'Altro';

  // Prima prova con la sottocategoria
  if (subcategory && CATEGORY_MAP[subcategory]) {
    return CATEGORY_MAP[subcategory];
  }

  // Poi con la categoria principale
  if (CATEGORY_MAP[notafacileCategory]) {
    return CATEGORY_MAP[notafacileCategory];
  }

  // Ricerca parziale
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (notafacileCategory.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }

  return notafacileCategory; // Restituisce la categoria originale se non mappata
}

function mapSingleTransactionToAurora(tx, auroraCategories = [], auroraAccounts = []) {
  const type = tx?.type || 'expense';
  const categoryName = tx?.categoryName || '';
  const subCategoryName = tx?.subCategoryName || tx?.subcategoryName || '';
  const description = tx?.description || '';

  const labels = [subCategoryName, categoryName, description].filter(Boolean);
  let bestCategory = null;
  let bestScore = 0;

  for (const cat of auroraCategories) {
    let score = 0;
    for (const label of labels) {
      score = Math.max(score, scoreTextMatch(label, cat?.name));
    }

    const sourceText = normalizeText(`${categoryName} ${subCategoryName} ${description}`);
    for (const [hint, targets] of Object.entries(CATEGORY_HINTS)) {
      if (sourceText.includes(hint) && targets.some((t) => scoreTextMatch(cat?.name, t) >= 0.8)) {
        score += 0.35;
      }
    }

    if (type === 'income' && cat?.type === 'income') score += 0.2;
    if (type === 'expense' && cat?.type === 'expense') score += 0.2;
    if ((type === 'income' && cat?.type === 'expense') || (type === 'expense' && cat?.type === 'income')) score -= 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  const categoryMatched = !!bestCategory && bestScore >= 0.55;

  let matchedSub = null;
  if (categoryMatched && subCategoryName && Array.isArray(bestCategory?.subCategories)) {
    let subBestScore = 0;
    for (const sub of bestCategory.subCategories) {
      const s = scoreTextMatch(subCategoryName, sub?.name);
      if (s > subBestScore) {
        subBestScore = s;
        matchedSub = s >= 0.65 ? sub : null;
      }
    }
  }

  const accountName = tx?.accountName || '';
  let matchedAccount = null;
  let accountScore = 0;
  for (const acc of auroraAccounts) {
    const s = scoreTextMatch(accountName, acc?.name);
    if (s > accountScore) {
      accountScore = s;
      matchedAccount = s >= 0.6 ? acc : null;
    }
  }

  return {
    ...tx,
    categoryId: categoryMatched ? bestCategory.id : null,
    categoryName: categoryMatched ? bestCategory.name : tx.categoryName,
    // Manteniamo category come etichetta leggibile (non ID) per preview/UI
    category: categoryMatched ? bestCategory.name : tx.categoryName,
    subCategoryId: matchedSub?.id || null,
    subCategoryName: matchedSub?.name || subCategoryName || '',
    subcategoryName: matchedSub?.name || subCategoryName || '',
    accountId: matchedAccount?.id || null,
    accountName: matchedAccount?.name || tx.accountName,
    autoMappedCategory: categoryMatched,
    autoMappedAccount: !!matchedAccount
  };
}

/**
 * Determina il tipo di transazione (income/expense/transfer)
 */
function determineType(row) {
  const entrata = parseFloat(row['Entrata'] || row['entrata'] || 0);
  const uscita = parseFloat(row['Uscita'] || row['uscita'] || 0);

  // Controlla colonna Giroconto con vari nomi possibili
  const girocontoCol =
    row['Giroconto'] || row['giroconto'] || row['GIROCONTO'] ||
    row['Giroconto destinazione'] || row['Conto destinazione'];

  // Controlla colonna Tipo con vari nomi possibili
  const tipo = (
    row['Tipo'] || row['tipo'] || row['TIPO'] ||
    row['Tipo operazione'] || row['Tipo Operazione'] || ''
  ).toLowerCase();

  if (
    girocontoCol ||
    tipo.includes('giroconto') ||
    tipo.includes('trasferimento') ||
    tipo.includes('transfer')
  ) return 'transfer';

  if (entrata > 0) return 'income';
  if (uscita > 0) return 'expense';

  return 'expense';
}

/**
 * Determina l'importo della transazione (sempre positivo)
 */
function determineAmount(row) {
  const entrata = parseFloat(row['Entrata'] || row['entrata'] || 0);
  const uscita = parseFloat(row['Uscita'] || row['uscita'] || 0);
  const spese = parseFloat(row['Spese'] || row['spese'] || 0);

  if (entrata > 0) return entrata;
  if (uscita > 0) return uscita;
  if (spese > 0) return spese;

  return 0;
}

/**
 * Legge e parsa un file XLS/XLSX di NotaFacile
 * @param {File} file - Il file XLS/XLSX caricato dall'utente
 * @returns {Promise<{transactions: Array, errors: Array, stats: Object}>}
 */
export async function parseNotafacileFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Converti in JSON, saltando le prime righe di intestazione di NotaFacile
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        });

        // Trova la riga con le intestazioni reali (Data, Categoria, ecc.)
        let dataRows = rawRows;
        const headerRowIndex = rawRows.findIndex(row => {
          const values = Object.values(row).map(v => String(v).toLowerCase());
          return values.some(v => v.includes('data') || v.includes('categoria'));
        });

        if (headerRowIndex > 0) {
          // Rileggere il file con l'offset corretto
          const jsonWithHeader = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false,
            range: headerRowIndex,
          });
          dataRows = jsonWithHeader;
        }

        const transactions = [];
        const errors = [];
        let skipped = 0;

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowNum = i + 1;

          try {
            // Cerca i campi con nomi alternativi
            const dateVal = row['Data'] || row['data'] || row['DATE'] || '';
            const categoria = row['Categoria'] || row['categoria'] || row['CATEGORIA'] || '';
            const sottocategoria = row['Sottocategoria'] || row['sottocategoria'] || '';
            const descrizione = row['Descrizione'] || row['descrizione'] || row['Note'] || row['note'] || '';
            const contatto = row['Contatto'] || row['contatto'] || row['Azienda'] || row['azienda'] || '';
            const risorsa = row['Risorsa'] || row['risorsa'] || ''; // conto bancario

            // Salta righe vuote
            if (!dateVal && !categoria && !descrizione) {
              skipped++;
              continue;
            }

            const date = parseNotafacileDate(dateVal);
            const type = determineType(row);
            const amount = determineAmount(row);

            // Salta se importo è 0
            if (amount === 0) {
              skipped++;
              continue;
            }

            const mappedCategory = mapCategory(categoria, sottocategoria);

            // Costruisce la descrizione combinando i campi disponibili
            let fullDescription = '';
            if (descrizione && contatto) {
              fullDescription = `${descrizione} — ${contatto}`;
            } else if (descrizione) {
              fullDescription = descrizione;
            } else if (contatto) {
              fullDescription = contatto;
            } else {
              fullDescription = `${categoria}${sottocategoria ? ` / ${sottocategoria}` : ''}`;
            }

            transactions.push({
              date,
              description: fullDescription.trim(),
              amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
              type,
              categoryName: mappedCategory,
              category: mappedCategory,
              subCategoryName: sottocategoria || '',
              subcategoryName: sottocategoria || '',
              accountName: risorsa || 'Importato',
              originalAccountName: risorsa || 'Importato',
              source: 'notafacile',
              originalCategory: categoria,
              originalSubcategory: sottocategoria,
            });

          } catch (err) {
            errors.push({ row: rowNum, error: err.message, data: row });
          }
        }

        const stats = {
          total: transactions.length,
          income: transactions.filter(t => t.type === 'income').length,
          expense: transactions.filter(t => t.type === 'expense').length,
          transfer: transactions.filter(t => t.type === 'transfer').length,
          skipped,
          errors: errors.length,
          totalIncome: transactions
            .filter(t => t.type === 'income')
            .reduce((s, t) => s + Math.abs(t.amount), 0),
          totalExpense: transactions
            .filter(t => t.type === 'expense')
            .reduce((s, t) => s + Math.abs(t.amount), 0),
        };

        resolve({ transactions, errors, stats });

      } catch (err) {
        reject(new Error(`Errore lettura file: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Errore lettura file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Importa le transazioni parsate nel database Firebase
 * @param {Array} transactions - Transazioni parsate da parseNotafacileFile
 * @param {string} userId - ID utente Firebase
 * @param {Array} existingCategories - Categorie esistenti su Aurora
 * @param {Function} createTransaction - Funzione per creare transazioni (da FinancialContext)
 * @param {Function} onProgress - Callback per aggiornare il progresso (opzionale)
 * @returns {Promise<{imported: number, errors: number}>}
 */
export async function importNotafacileTransactions(
  transactions,
  userId,
  existingCategories,
  createTransaction,
  onProgress = null
) {
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];

    try {
      // Cerca la categoria corrispondente in Aurora
      const matchedCategory = existingCategories.find(
        c => c.name?.toLowerCase() === t.categoryName?.toLowerCase()
      );

      await createTransaction({
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: matchedCategory?.id || null,
        categoryName: t.categoryName,
        subCategory: null,
        subCategoryName: t.subcategoryName || '',
        date: t.date,
        timestamp: t.date.getTime(),
        accountName: t.accountName,
        source: 'notafacile_import',
        userId,
      });

      imported++;
    } catch (err) {
      console.error(`Errore importazione transazione ${i}:`, err);
      errors++;
    }

    // Aggiorna progresso ogni 5 transazioni
    if (onProgress && i % 5 === 0) {
      onProgress(Math.round((i / transactions.length) * 100));
    }
  }

  if (onProgress) onProgress(100);

  return { imported, errors };
}

/**
 * Controlla se un file è un export di NotaFacile valido
 * @param {File} file
 * @returns {boolean}
 */
export function isNotafacileFile(file) {
  const name = file.name.toLowerCase();
  return (
    (name.endsWith('.xls') || name.endsWith('.xlsx')) &&
    name.includes('notafacile')
  );
}

/**
 * Auto-mappa categorie/sottocategorie/conti NotaFacile verso Aurora.
 */
export function autoMapNotafacileTransactions(transactions, auroraCategories = [], auroraAccounts = []) {
  const mapped = (transactions || []).map((t) =>
    mapSingleTransactionToAurora(t, auroraCategories, auroraAccounts)
  );

  const stats = {
    total: mapped.length,
    mappedCategories: mapped.filter((t) => t.autoMappedCategory).length,
    mappedAccounts: mapped.filter((t) => t.autoMappedAccount).length,
    unmappedCategories: mapped.filter((t) => !t.autoMappedCategory).length,
    unmappedAccounts: mapped.filter((t) => !t.autoMappedAccount).length
  };

  return { transactions: mapped, stats };
}
