import { buildAgendaTimeline } from './agendaTimeline';

describe('agendaTimeline', () => {
  test('include eventi entro 14 giorni ordinati', () => {
    const out = buildAgendaTimeline({
      upcomingBirthdays: [
        { id: 'b1', name: 'Luca', daysUntil: 3 },
        { id: 'b2', name: 'Anna', daysUntil: 1 }
      ],
      dueSubscriptions: [
        { id: 's1', name: 'Netflix', daysTo: 0 },
        { id: 's2', name: 'Spotify', daysTo: 20 }
      ],
      maxDays: 14
    });
    expect(out.total).toBe(3);
    expect(out.items[0].title).toBe('Netflix');
    expect(out.urgent).toBe(2);
  });

  test('ignora eventi scaduti o oltre soglia', () => {
    const out = buildAgendaTimeline({
      upcomingBirthdays: [{ id: 'b1', name: 'Mia', daysUntil: -1 }],
      dueSubscriptions: [{ id: 's1', name: 'Prime', daysTo: 40 }],
      maxDays: 14
    });
    expect(out.total).toBe(0);
  });
});

