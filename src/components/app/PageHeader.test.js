import React from 'react';
import { render } from '@testing-library/react';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  test('matches snapshot', () => {
    const { asFragment } = render(
      <PageHeader
        className="page-header"
        title="Report"
        subtitle="Grafici e riepiloghi"
        actions={<button type="button">Azione</button>}
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
