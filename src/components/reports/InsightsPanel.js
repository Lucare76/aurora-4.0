import React from 'react';
import {
  getMonthComparison,
  getTopGrowingCategory,
  getAnomalies,
  getSavingsRate,
  getProjectedExpenses
} from '../../services/insightsService';

const fallbackMoney = (value) => {
  const num = Number(value) || 0;
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}€ ${grouped},${decPart}`;
};

const InsightsPanel = ({
  transactions,
  comparisonTransactions,
  categories,
  accounts,
  currentMonth,
  currentYear,
  monthlyIncome,
  monthlyExpenses,
  formatEUR
}) => {
  const comparisonSource = comparisonTransactions || transactions;
  const comp = getMonthComparison(comparisonSource, currentMonth, currentYear);
  const growth = getTopGrowingCategory(transactions, categories, currentMonth, currentYear, accounts);
  const anomalies = getAnomalies(transactions, categories, currentMonth, currentYear);
  const savings = getSavingsRate(monthlyIncome, monthlyExpenses);

  const today = new Date();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const currentDay = isCurrentMonth ? today.getDate() : 30;
  const projected = getProjectedExpenses(monthlyExpenses, currentDay, 30);

  const money = formatEUR || fallbackMoney;

  return (
    <div className="insights-panel">
      <h4>Insights</h4>

      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-title-text">Vs Mese Scorso</span>
            <div className="insight-icon-circle">T</div>
          </div>
          {comp.percentChange === null ? (
            <>
              <div className="insight-value-large">N/D</div>
              <div className="insight-subtext">Nessuna spesa nel mese precedente.</div>
            </>
          ) : (
            <>
              <div className="insight-value-large" style={{ color: comp.percentChange > 0 ? '#ef4444' : '#10b981' }}>
                {comp.percentChange > 0 ? '+' : ''}
                {comp.percentChange.toFixed(1)}%
              </div>
              <div className="insight-subtext">
                Hai speso {comp.percentChange > 0 ? 'più' : 'meno'} rispetto a {money(comp.prevTotal)} precedenti.
              </div>
            </>
          )}
        </div>

        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-title-text">Risparmio</span>
            <div className="insight-icon-circle">R</div>
          </div>
          <div className="insight-value-large" style={{ color: '#10b981' }}>
            {savings.toFixed(1)}%
          </div>
          <div className="insight-subtext">Delle entrate mensili totali sono state messe da parte.</div>
        </div>

        <div className="insight-card">
          <div className="insight-header">
            <span className="insight-title-text">Fine Mese</span>
            <div className="insight-icon-circle">F</div>
          </div>
          <div className="insight-value-large">{money(projected)}</div>
          <div className="insight-subtext">Spesa totale stimata se continui con questo ritmo.</div>
        </div>

        {growth && (
          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-title-text">Focus {growth.name}</span>
              <div className="insight-icon-circle">{growth.icon}</div>
            </div>
            <div className="insight-value-large" style={{ color: '#f59e0b' }}>
              +{growth.growth.toFixed(0)}%
            </div>
            <div className="insight-subtext">Questa categoria sta registrando un picco insolito.</div>
          </div>
        )}

        {anomalies.length > 0 && (
          <div className="insight-card anomaly-card">
            <div className="insight-header">
              <span className="insight-title-text">Transazioni sopra la media</span>
            </div>
            <div className="anomalies-list">
              {anomalies.map((a, i) => (
                <div key={i} className="anomaly-item">
                  <div className="anomaly-label">
                    <span className="anomaly-name">{a.description}</span>
                    <span className="anomaly-details">
                      Solitamente spendi {money(a.avgAmount)} in {a.categoryName}
                    </span>
                  </div>
                  <div className="anomaly-price">{money(a.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsPanel;
