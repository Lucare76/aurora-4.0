import React from 'react';
import { render, screen } from '@testing-library/react';
import InsightsSection from './InsightsSection';

describe('InsightsSection', () => {
  test('renders key insight blocks with basic data', () => {
    const transactions = [
      { amount: -20, type: 'expense', date: new Date(), categoryName: 'Spesa', description: 'pane' },
      { amount: 100, type: 'income', date: new Date(), categoryName: 'Stipendio', description: 'entrata' }
    ];

    render(
      <InsightsSection
        transactions={transactions}
        categories={[]}
        accounts={[]}
        monthlyIncome={100}
        monthlyExpenses={20}
        currentMonthIndex={new Date().getMonth()}
        currentYear={new Date().getFullYear()}
        cs="€"
      />
    );

    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Tasso di Risparmio')).toBeInTheDocument();
    expect(screen.getByText('Proiezione Fine Mese')).toBeInTheDocument();
  });
});
