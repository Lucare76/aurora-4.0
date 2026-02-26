import React from 'react';
import './SharedCards.css';

export default function SectionCard({ className = '', children }) {
  return <div className={`section-card ${className}`.trim()}>{children}</div>;
}
