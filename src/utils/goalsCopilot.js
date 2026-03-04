export function buildGoalsCopilotPlan({
  goals = [],
  monthlyIncome = 0,
  savingsRatePct = 20
} = {}) {
  const monthlyBudget = Math.max(0, (Number(monthlyIncome) || 0) * ((Number(savingsRatePct) || 0) / 100));
  const activeGoals = (goals || [])
    .filter((g) => !g?.completed)
    .map((g) => {
      const target = Math.max(0, Number(g?.targetAmount) || 0);
      const current = Math.max(0, Number(g?.currentAmount) || 0);
      const remaining = Math.max(0, target - current);
      const deadlineRaw = g?.deadline && typeof g.deadline.toDate === 'function' ? g.deadline.toDate() : g?.deadline;
      const deadline = deadlineRaw ? new Date(deadlineRaw) : null;
      const monthsLeft =
        deadline && !Number.isNaN(deadline.getTime())
          ? Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
          : 12;
      const urgency = remaining / monthsLeft;
      return { ...g, remaining, monthsLeft, urgency };
    })
    .sort((a, b) => b.urgency - a.urgency);

  if (activeGoals.length === 0) {
    return { monthlyBudget, topGoal: null, suggestionAmount: 0, note: 'Nessun obiettivo attivo.' };
  }

  const topGoal = activeGoals[0];
  const suggestionAmount = Math.min(topGoal.remaining, monthlyBudget > 0 ? monthlyBudget : topGoal.remaining);
  const note =
    monthlyBudget <= 0
      ? 'Budget risparmio non disponibile: imposta una percentuale entrate.'
      : `Priorita su ${topGoal.name}: target consigliato ${suggestionAmount.toFixed(2)} / mese.`;

  return { monthlyBudget, topGoal, suggestionAmount, note };
}
