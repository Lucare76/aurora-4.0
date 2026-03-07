function parseDeadline(raw) {
  if (!raw) return null;
  const d = raw && typeof raw.toDate === 'function' ? raw.toDate() : new Date(raw);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d;
}

export function computePriorityGoal(input = {}) {
  const goals = Array.isArray(input.goals) ? input.goals : [];
  const monthlySavings = Number(input.monthlySavings) || 0;

  const active = goals
    .filter((g) => !g?.completed)
    .map((g) => {
      const target = Math.max(0, Number(g?.targetAmount) || 0);
      const current = Math.max(0, Number(g?.currentAmount) || 0);
      const remaining = Math.max(0, target - current);
      const deadline = parseDeadline(g?.deadline);
      const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null;
      const monthsLeft = deadline ? Math.max(1, Math.ceil(daysLeft / 30)) : 12;
      const urgency = remaining / monthsLeft;
      const progress = target > 0 ? Math.min(1, current / target) : 0;
      return { ...g, target, current, remaining, daysLeft, monthsLeft, urgency, progress };
    })
    .filter((g) => g.target > 0)
    .sort((a, b) => {
      if (a.daysLeft != null && b.daysLeft != null && a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return b.urgency - a.urgency;
    });

  const topGoal = active[0] || null;
  if (!topGoal) {
    return {
      hasGoal: false,
      level: 'ok',
      message: 'Nessun obiettivo attivo.',
      suggestedMonthly: 0,
      topGoal: null
    };
  }

  const suggestedMonthly = Math.max(0, Math.ceil(topGoal.remaining / topGoal.monthsLeft));
  let level = 'ok';
  if (topGoal.daysLeft != null && topGoal.daysLeft <= 30 && topGoal.progress < 0.7) level = 'critical';
  else if (topGoal.daysLeft != null && topGoal.daysLeft <= 60 && topGoal.progress < 0.8) level = 'warn';
  else if (monthlySavings > 0 && monthlySavings < suggestedMonthly) level = 'warn';

  const message =
    level === 'critical'
      ? 'Obiettivo vicino alla scadenza con progresso basso.'
      : level === 'warn'
      ? 'Serve aumentare il ritmo di risparmio.'
      : 'Obiettivo in linea.';

  return {
    hasGoal: true,
    level,
    message,
    suggestedMonthly,
    topGoal
  };
}

