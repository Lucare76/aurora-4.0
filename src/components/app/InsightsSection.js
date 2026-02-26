import React, { useMemo } from 'react';
import { formatNumber } from '../../utils/format';
import { formatCategoryLabel, formatEntityLabel } from '../../utils/text';
import {
  getAnomalies,
  getMonthComparison,
  getProjectedExpenses,
  getSavingsRate,
  getTopGrowingCategory
} from '../../services/insightsService';

function InsightsSection({
  transactions,
  categories,
  accounts,
  monthlyIncome,
  monthlyExpenses,
  currentMonthIndex,
  currentYear,
  cs,
  className = ''
}) {
  const insights = useMemo(() => {
    const comparison = getMonthComparison(transactions, currentMonthIndex, currentYear);
    const topGrowing = getTopGrowingCategory(transactions, categories, currentMonthIndex, currentYear, accounts);
    const anomalies = getAnomalies(transactions, categories, currentMonthIndex, currentYear);
    const savingsRate = getSavingsRate(monthlyIncome, monthlyExpenses);

    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const projected = getProjectedExpenses(monthlyExpenses, currentDay, daysInMonth);

    return { comparison, topGrowing, anomalies, savingsRate, projected };
  }, [transactions, categories, accounts, monthlyIncome, monthlyExpenses, currentMonthIndex, currentYear]);

  const { comparison, topGrowing, anomalies, savingsRate, projected } = insights;

  return (
    <div className={`section ${className}`.trim()}>
      <h2 className="section-title">Insights</h2>
      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-label">Spese vs mese scorso</div>
          {comparison.percentChange === null ? (
            <>
              <div className="insight-value">N/D</div>
              <div className="insight-detail">Nessuna spesa nel mese precedente</div>
            </>
          ) : (
            <>
              <div className={`insight-value ${comparison.percentChange > 0 ? 'negative' : 'positive'}`}>
                {comparison.percentChange > 0 ? '↗' : '↘'} {comparison.percentChange > 0 ? '+' : ''}
                {comparison.percentChange.toFixed(1)}%
              </div>
              <div className="insight-detail">
                {cs} {formatNumber(comparison.currentTotal)} vs {cs} {formatNumber(comparison.prevTotal)}
              </div>
            </>
          )}
        </div>

        <div className="insight-card">
          <div className="insight-label">Tasso di Risparmio</div>
          <div className={`insight-value ${savingsRate >= 0 ? 'positive' : 'negative'}`}>💰 {savingsRate.toFixed(1)}%</div>
          <div className="insight-detail">del reddito mensile risparmiato</div>
        </div>

        <div className="insight-card">
          <div className="insight-label">Proiezione Fine Mese</div>
          <div className="insight-value">
            🔮 {cs} {formatNumber(projected)}
          </div>
          <div className="insight-detail">stima spese a fine mese</div>
        </div>

        {topGrowing && (
          <div className="insight-card">
            <div className="insight-label">Categoria in Crescita</div>
            <div className={`insight-value ${topGrowing.growth > 50 ? 'negative' : topGrowing.growth > 0 ? 'warning' : 'positive'}`}>
              {topGrowing.icon} {formatCategoryLabel(topGrowing.name)}
            </div>
            <div className="insight-detail">+{topGrowing.growth.toFixed(1)}% vs mese scorso</div>
          </div>
        )}

        {anomalies.length > 0 && (
          <div className="insight-card insight-card-wide">
            <div className="insight-label">Spese Anomale</div>
            {anomalies.map((a, i) => (
              <div key={i} className="insight-anomaly">
                <span className="anomaly-desc">{formatEntityLabel(a.description)}</span>
                <span className="anomaly-amount">
                  {cs} {formatNumber(a.amount)}
                </span>
                <span className="anomaly-avg">
                  (media: {cs} {formatNumber(a.avgAmount)})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InsightsSection;
