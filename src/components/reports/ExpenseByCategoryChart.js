// src/components/reports/ExpenseByCategoryChart.js
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
// OPPURE con Chart.js se già lo usi

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const calculateExpensesByCategory = (transactions = []) => {
  const totals = {};
  (transactions || []).forEach((tx) => {
    if (!tx || tx.type !== 'expense') return;
    const category = String(tx.categoryName || tx.category || tx.categoryId || 'Senza categoria');
    const amount = Math.abs(Number(tx.amount) || 0);
    if (!Number.isFinite(amount) || amount <= 0) return;
    totals[category] = (totals[category] || 0) + amount;
  });
  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
};

const ExpenseByCategoryChart = ({ transactions }) => {
  const data = calculateExpensesByCategory(transactions);

  return (
    <div className="chart-container">
      <h3>Spese per Categoria</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.category}: €${entry.amount.toFixed(2)}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="amount"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`€${value.toFixed(2)}`, 'Importo']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpenseByCategoryChart;
