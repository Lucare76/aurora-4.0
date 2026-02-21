// src/components/reports/MonthlyTrendChart.js
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function CustomTooltip({ active, payload, label, formatEUR }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="recharts-custom-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatEUR(entry.value)}
        </p>
      ))}
    </div>
  );
}

function MonthlyTrendChart({ data, formatEUR }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h4>Andamento Mensile</h4>
          <span className="chart-subtitle">Entrate vs Uscite per mese</span>
        </div>
        <div className="empty-state" style={{ padding: 20 }}>
          <div className="empty-icon">📉</div>
          <h3>Nessun dato nel periodo</h3>
          <p>Prova ad ampliare le date o a resettare i filtri.</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((m) => ({
    name: `${MONTHS_IT[m.month]} ${m.year}`,
    Entrate: Math.round(m.income * 100) / 100,
    Uscite: Math.round(m.expenses * 100) / 100
  }));

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4>Andamento Mensile</h4>
        <span className="chart-subtitle">Entrate vs Uscite per mese (esclusi giroconti)</span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#27ae60" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#27ae60" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorUscite" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#e74c3c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
          <Tooltip content={<CustomTooltip formatEUR={formatEUR} />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="Entrate"
            stroke="#27ae60"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorEntrate)"
          />
          <Area
            type="monotone"
            dataKey="Uscite"
            stroke="#e74c3c"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorUscite)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlyTrendChart;
