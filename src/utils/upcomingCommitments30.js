export function computeUpcomingCommitments30(input = {}) {
  const dueSubscriptions = Array.isArray(input.dueSubscriptions) ? input.dueSubscriptions : [];

  const items = dueSubscriptions
    .filter((s) => Number.isFinite(Number(s?.daysTo)))
    .filter((s) => Number(s.daysTo) <= 30)
    .map((s) => ({
      id: s?.id,
      name: s?.name || 'Abbonamento',
      owner: s?.ownerName || 'tu',
      amount: Math.abs(Number(s?.amount) || 0),
      daysTo: Number(s?.daysTo),
      dueDate: s?.dueDate || null
    }))
    .sort((a, b) => a.daysTo - b.daysTo);

  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const urgentCount = items.filter((i) => i.daysTo <= 7).length;
  const overdueCount = items.filter((i) => i.daysTo < 0).length;

  let level = 'ok';
  if (overdueCount > 0) level = 'critical';
  else if (urgentCount > 0) level = 'warn';

  const message =
    level === 'critical'
      ? 'Ci sono impegni gia scaduti.'
      : level === 'warn'
      ? 'Impegni in arrivo entro 7 giorni.'
      : 'Nessuna urgenza nei prossimi giorni.';

  return {
    level,
    message,
    total,
    urgentCount,
    overdueCount,
    items: items.slice(0, 8)
  };
}

