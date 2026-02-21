// src/components/reports/ExpenseDonutChart.js
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const FALLBACK_COLORS = [
  '#4a90e2', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#3498db', '#95a5a6'
];

function CustomTooltip({ active, payload, formatEUR }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="recharts-custom-tooltip">
      <p className="tooltip-label">{d.name}</p>
      <p>{formatEUR(d.value)}</p>
      <p>{d.percent.toFixed(1)}% del totale</p>
    </div>
  );
}

function ExpenseDonutChart({ expensesByCategory, totalExpenses, formatEUR, categories }) {
  const chartData = useMemo(() => {
    if (!expensesByCategory?.length) return [];

    const top8 = expensesByCategory.slice(0, 8);
    const rest = expensesByCategory.slice(8);
    const restAmount = rest.reduce((s, c) => s + c.amount, 0);

    const items = top8.map((c, i) => {
      const cat = categories?.find((ct) => ct.id === c.categoryId);
      return {
        name: c.categoryName,
        value: Math.round(c.amount * 100) / 100,
        percent: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
        color: cat?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
      };
    });

    if (restAmount > 0) {
      items.push({
        name: 'Altro',
        value: Math.round(restAmount * 100) / 100,
        percent: totalExpenses > 0 ? (restAmount / totalExpenses) * 100 : 0,
        color: '#95a5a6'
      });
    }

    return items;
  }, [expensesByCategory, totalExpenses, categories]);

  if (chartData.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h4>Spese per Categoria</h4>
        </div>
        <div className="empty-state" style={{ padding: 20 }}>
          <div className="empty-icon">🍩</div>
          <h3>Nessuna spesa nel periodo</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4>Spese per Categoria</h4>
        <span className="chart-subtitle">Distribuzione percentuale</span>
      </div>
      <div className="donut-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip formatEUR={formatEUR} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-legend">
          {chartData.map((entry, i) => (
            <div key={i} className="donut-legend-item">
              <span className="donut-legend-color" style={{ backgroundColor: entry.color }} />
              <span className="donut-legend-name">{entry.name}</span>
              <span className="donut-legend-pct">{entry.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExpenseDonutChart;
