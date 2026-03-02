import React from 'react';
import './SharedCards.css';

export default function StatCard({ className = '', label, value }) {
  return (
    <div className={`stat-card-shared ${className}`.trim()}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
