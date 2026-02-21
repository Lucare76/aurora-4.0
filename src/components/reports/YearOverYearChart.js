// src/components/reports/YearOverYearChart.js
import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const YEAR_COLORS = ['#4a90e2', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];

function CustomTooltip({ active, payload, label, formatEUR }) {
  if (!active || !payload?.length) return null;

  const items = payload.filter((p) => p.value > 0);
  if (items.length < 2) {
    return (
      <div className="recharts-custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {items.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {formatEUR(p.value)}
          </p>
        ))}
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => Number(a.name) - Number(b.name));
  const diff = sorted.length >= 2
    ? ((sorted[sorted.length - 1].value - sorted[sorted.length - 2].value) / sorted[sorted.length - 2].value) * 100
    : 0;

  return (
    <div className="recharts-custom-tooltip">
      <p className="tooltip-label">{label}</p>
      {sorted.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatEUR(p.value)}
        </p>
      ))}
      {sorted.length >= 2 && (
        <p style={{ color: diff >= 0 ? '#e74c3c' : '#27ae60', fontWeight: 600 }}>
          {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

function YearOverYearChart({ transactions, filterCategory, filterAccount, formatEUR }) {
  const { chartData, years } = useMemo(() => {
    const buckets = {};

    for (const t of transactions) {
      const type = t.__type || (t.isTransfer ? 'transfer' : (t.type || (t.amount < 0 ? 'expense' : 'income')));
      if (type !== 'expense') continue;

      if (filterCategory && filterCategory !== 'all' && t.categoryId !== filterCategory) continue;
      if (filterAccount && filterAccount !== 'all' && t.accountId !== filterAccount) continue;

      const d = t.__date || new Date(t.date);
      const y = d.getFullYear();
      const m = d.getMonth();
      const amt = Math.abs(t.__amountSigned ?? t.amount ?? 0);

      const key = `${y}-${m}`;
      if (!buckets[key]) buckets[key] = { year: y, month: m, amount: 0 };
      buckets[key].amount += amt;
    }

    const yearsSet = new Set();
    Object.values(buckets).forEach((b) => yearsSet.add(b.year));
    const yearsArr = Array.from(yearsSet).sort();

    const data = MONTHS_IT.map((label, monthIdx) => {
      const row = { name: label };
      for (const y of yearsArr) {
        const b = buckets[`${y}-${monthIdx}`];
        row[String(y)] = b ? Math.round(b.amount * 100) / 100 : 0;
      }
      return row;
    });

    return { chartData: data, years: yearsArr };
  }, [transactions, filterCategory, filterAccount]);

  if (years.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h4>Confronto Anno su Anno</h4>
        </div>
        <div className="empty-state" style={{ padding: 20 }}>
          <div className="empty-icon">📊</div>
          <h3>Dati insufficienti</h3>
          <p>Servono transazioni di almeno un anno.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4>Confronto Anno su Anno</h4>
        <span className="chart-subtitle">Spese mensili per anno (esclusi giroconti)</span>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
          <Tooltip content={<CustomTooltip formatEUR={formatEUR} />} />
          <Legend />
          {years.map((y, i) => (
            <Bar key={y} dataKey={String(y)} name={String(y)} fill={YEAR_COLORS[i % YEAR_COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default YearOverYearChart;
