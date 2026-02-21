/**
 * src/services/insightsService.js
 */

const parseDate = (date) => {
  if (!date) return new Date();
  if (typeof date === 'object' && typeof date.toDate === 'function') return date.toDate();
  if (date instanceof Date) return date;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

export const getMonthComparison = (transactions, currentMonth, currentYear) => {
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let currentTotal = 0;
  let prevTotal = 0;

  transactions.forEach(t => {
    const type = t.type || (t.amount < 0 ? 'expense' : 'income');
    if (type !== 'expense' || t.isTransfer) return;

    const d = parseDate(t.date);
    const m = d.getMonth();
    const y = d.getFullYear();

    if (m === currentMonth && y === currentYear) {
      currentTotal += Math.abs(t.amount || 0);
    } else if (m === prevMonth && y === prevYear) {
      prevTotal += Math.abs(t.amount || 0);
    }
  });

  const percentChange = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
  return { currentTotal, prevTotal, percentChange };
};

export const getTopGrowingCategory = (transactions, categories, currentMonth, currentYear) => {
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const currentMap = {};
  const prevMap = {};

  transactions.forEach(t => {
    const type = t.type || (t.amount < 0 ? 'expense' : 'income');
    if (type !== 'expense' || t.isTransfer) return;

    const d = parseDate(t.date);
    const catId = t.categoryId || 'unknown';
    const amt = Math.abs(t.amount || 0);

    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      currentMap[catId] = (currentMap[catId] || 0) + amt;
    } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
      prevMap[catId] = (prevMap[catId] || 0) + amt;
    }
  });

  let best = null;
  let maxDiff = 0;

  Object.keys(currentMap).forEach(catId => {
    if (catId === 'unknown') return;
    const curr = currentMap[catId] || 0;
    const prev = prevMap[catId] || 0;
    const diff = curr - prev;
    
    if (diff > maxDiff) {
      maxDiff = diff;
      best = catId;
    }
  });

  if (!best) return null;
  const cat = categories.find(c => c.id === best);
  const growth = prevMap[best] > 0 ? (maxDiff / prevMap[best]) * 100 : 100;
  
  return cat ? { name: cat.name, icon: cat.icon || '📁', growth } : null;
};

export const getAnomalies = (transactions, categories, currentMonth, currentYear) => {
  const byCat = {};
  transactions.forEach(t => {
    const type = t.type || (t.amount < 0 ? 'expense' : 'income');
    if (type !== 'expense' || t.isTransfer) return;
    const catId = t.categoryId || 'unknown';
    if (!byCat[catId]) byCat[catId] = [];
    byCat[catId].push(Math.abs(t.amount || 0));
  });

  const avgByCat = {};
  Object.keys(byCat).forEach(catId => {
    const sum = byCat[catId].reduce((a, b) => a + b, 0);
    avgByCat[catId] = sum / byCat[catId].length;
  });

  return transactions
    .filter(t => {
      const type = t.type || (t.amount < 0 ? 'expense' : 'income');
      const d = parseDate(t.date);
      return type === 'expense' && !t.isTransfer && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .map(t => {
      const amt = Math.abs(t.amount || 0);
      const avg = avgByCat[t.categoryId] || 0;
      if (avg > 0 && amt > avg * 1.8) {
        const cat = categories.find(c => c.id === t.categoryId);
        return {
          description: t.description || 'Spesa elevata',
          amount: amt,
          avgAmount: avg,
          categoryName: cat?.name || 'Altro'
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
};

export const getSavingsRate = (income, expenses) => {
  if (income <= 0) return 0;
  return Math.max(0, ((income - expenses) / income) * 100);
};

export const getProjectedExpenses = (expenses, currentDay, daysInMonth) => {
  const day = currentDay || 1;
  const totalDays = daysInMonth || 30;
  return (expenses / day) * totalDays;
};