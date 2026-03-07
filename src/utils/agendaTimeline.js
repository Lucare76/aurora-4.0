export function buildAgendaTimeline(input = {}) {
  const upcomingBirthdays = Array.isArray(input.upcomingBirthdays) ? input.upcomingBirthdays : [];
  const dueSubscriptions = Array.isArray(input.dueSubscriptions) ? input.dueSubscriptions : [];
  const maxDays = Math.max(1, Number(input.maxDays) || 14);

  const events = [];

  upcomingBirthdays.forEach((b) => {
    const daysUntil = Number(b?.daysUntil);
    if (!Number.isFinite(daysUntil) || daysUntil < 0 || daysUntil > maxDays) return;
    events.push({
      id: `birthday-${b?.id || b?.name || daysUntil}`,
      kind: 'birthday',
      dayOffset: daysUntil,
      title: b?.name || 'Compleanno',
      detail: daysUntil === 0 ? 'Oggi' : daysUntil === 1 ? 'Domani' : `Tra ${daysUntil} giorni`
    });
  });

  dueSubscriptions.forEach((s) => {
    const daysTo = Number(s?.daysTo);
    if (!Number.isFinite(daysTo) || daysTo < 0 || daysTo > maxDays) return;
    events.push({
      id: `subscription-${s?.id || s?.name || daysTo}`,
      kind: 'subscription',
      dayOffset: daysTo,
      title: s?.name || 'Abbonamento',
      detail: daysTo === 0 ? 'Scade oggi' : daysTo === 1 ? 'Scade domani' : `Scade tra ${daysTo} giorni`
    });
  });

  events.sort((a, b) => {
    const d = a.dayOffset - b.dayOffset;
    if (d !== 0) return d;
    return String(a.title).localeCompare(String(b.title));
  });

  const urgent = events.filter((e) => e.dayOffset <= 2).length;

  return {
    total: events.length,
    urgent,
    items: events.slice(0, 10)
  };
}

