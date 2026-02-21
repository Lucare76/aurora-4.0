// src/components/reports/SpendingHeatmap.js
import React, { useMemo, useState } from 'react';

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function getISOWeekDay(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1; // 0=Lun ... 6=Dom
}

function getWeekNumber(date, startDate) {
  const diff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
  return Math.floor(diff / 7);
}

function SpendingHeatmap({ transactions, startDate, endDate, formatEUR }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  const { grid, maxAmount, weeks } = useMemo(() => {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);

    // Build daily totals
    const dailyMap = {};
    for (const t of transactions) {
      const type = t.__type || 'expense';
      if (type !== 'expense') continue;

      const d = t.__date || new Date(t.date);
      if (d < s || d > e) continue;

      const key = d.toISOString().split('T')[0];
      dailyMap[key] = (dailyMap[key] || 0) + Math.abs(t.__amountSigned ?? t.amount ?? 0);
    }

    // Calculate weeks span
    const totalDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    const numWeeks = Math.ceil(totalDays / 7) + 1;

    // Build grid
    const cells = [];
    let maxAmt = 0;

    const cursor = new Date(s);
    while (cursor <= e) {
      const key = cursor.toISOString().split('T')[0];
      const dayOfWeek = getISOWeekDay(cursor);
      const week = getWeekNumber(cursor, s);
      const amount = dailyMap[key] || 0;
      if (amount > maxAmt) maxAmt = amount;

      cells.push({ key, dayOfWeek, week, amount, date: new Date(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }

    return { grid: cells, maxAmount: maxAmt, weeks: numWeeks, start: s };
  }, [transactions, startDate, endDate]);

  if (grid.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h4>Heatmap Spese Giornaliere</h4>
        </div>
        <div className="empty-state" style={{ padding: 20 }}>
          <div className="empty-icon">🗓️</div>
          <h3>Nessun dato nel periodo</h3>
        </div>
      </div>
    );
  }

  const getColor = (amount) => {
    if (amount === 0 || maxAmount === 0) return '#f1f5f9';
    const intensity = Math.min(amount / maxAmount, 1);
    const r = Math.round(231 + (231 - 231) * intensity);
    const g = Math.round(241 - (241 - 76) * intensity);
    const b = Math.round(249 - (249 - 60) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4>Heatmap Spese Giornaliere</h4>
        <span className="chart-subtitle">Intensita spese nel periodo (esclusi giroconti)</span>
      </div>
      <div className="heatmap-container">
        <div className="heatmap-days">
          {DAYS_IT.map((d) => (
            <div key={d} className="heatmap-day-label">{d}</div>
          ))}
        </div>
        <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${weeks + 1}, 1fr)` }}>
          {grid.map((cell) => (
            <div
              key={cell.key}
              className="heatmap-cell"
              style={{
                gridColumn: cell.week + 1,
                gridRow: cell.dayOfWeek + 1,
                backgroundColor: getColor(cell.amount)
              }}
              onMouseEnter={() => setHoveredCell(cell)}
              onMouseLeave={() => setHoveredCell(null)}
            />
          ))}
        </div>
        {hoveredCell && (
          <div className="heatmap-tooltip-bar">
            {hoveredCell.date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' — '}
            {hoveredCell.amount > 0 ? formatEUR(hoveredCell.amount) : 'Nessuna spesa'}
          </div>
        )}
        <div className="heatmap-scale">
          <span>Meno</span>
          <div className="heatmap-scale-cells">
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <div
                key={v}
                className="heatmap-scale-cell"
                style={{ backgroundColor: getColor(maxAmount * v) }}
              />
            ))}
          </div>
          <span>Più</span>
        </div>
      </div>
    </div>
  );
}

export default SpendingHeatmap;
