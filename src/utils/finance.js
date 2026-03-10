// src/utils/finance.js
// ---- DATE ----
export const parseDate = (date) => {
  if (!date) return new Date();
  if (typeof date === 'object' && date.toDate) return date.toDate(); // Firestore
  if (date instanceof Date) return date;
  return new Date(date);
};

// ---- AMOUNT ----
export const getAmount = (t) => {
  const n = Number(t?.amount);
  return Number.isFinite(n) ? n : 0;
};

// ---- TYPE ----
export const getType = (t) => {
  if (['income', 'expense', 'transfer'].includes(t?.type)) return t.type;
  return getAmount(t) >= 0 ? 'income' : 'expense';
};

// ---- ACCOUNT ----
export const getAccountName = (t, accounts = []) => {
  const acc = accounts.find((a) => a.id === t?.accountId);
  return acc?.name || 'Conto';
};

// ---- CATEGORY ----
export const getCategoryName = (t, categories = []) => {
  const raw = t?.categoryId || t?.category;
  if (!raw) return 'Senza categoria';

  const byId = categories.find((c) => c.id === raw);
  if (byId?.name) return byId.name;

  if (typeof raw === 'string') return raw;
  return 'Senza categoria';
};

// ---- SUBCATEGORY ----
export const getSubCategoryName = (t, categories = []) => {
  const raw = t?.subCategoryId || t?.subCategory || t?.subcategory;
  if (!raw) return '';

  if (typeof raw === 'string' && raw.trim()) return raw;

  const catRaw = t?.categoryId || t?.category;
  const cat = categories.find((c) => c.id === catRaw || c.name === catRaw);
  const subCategories = cat?.subCategories || [];

  const byId = subCategories.find((s) => s.id === raw);
  if (byId?.name) return byId.name;

  if (typeof raw?.name === 'string' && raw.name.trim()) return raw.name;

  return '';
};
