import React from 'react';
import './PageHeader.css';

export default function PageHeader({ title, subtitle, actions = null, className = '', titleAs = 'h1' }) {
  const TitleTag = titleAs;

  return (
    <div className={`app-page-header ${className}`.trim()}>
      <div className="app-page-header-main">
        <TitleTag className="app-page-title">{title}</TitleTag>
        {subtitle ? <p className="app-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="app-page-header-actions">{actions}</div> : null}
    </div>
  );
}
