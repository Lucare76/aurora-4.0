import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

jest.mock('../../services/firebase', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => false,
    data: () => ({})
  })
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u1', displayName: 'Mario', photoURL: null },
    logout: jest.fn().mockResolvedValue(undefined),
    isAdmin: false
  })
}));

describe('Sidebar settings navigation', () => {
  test('click su Impostazioni imposta menu e chiude sidebar', () => {
    const setActiveMenu = jest.fn();
    const setSidebarOpen = jest.fn();

    render(
      <Sidebar
        activeMenu="dashboard"
        setActiveMenu={setActiveMenu}
        sidebarOpen={true}
        setSidebarOpen={setSidebarOpen}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Impostazioni' }));

    expect(setActiveMenu).toHaveBeenCalledWith('settings');
    expect(setSidebarOpen).toHaveBeenCalledWith(false);
  });

  test('non mostra Prestiti per utenti non admin', () => {
    const setActiveMenu = jest.fn();
    const setSidebarOpen = jest.fn();

    render(
      <Sidebar
        activeMenu="dashboard"
        setActiveMenu={setActiveMenu}
        sidebarOpen={true}
        setSidebarOpen={setSidebarOpen}
      />
    );

    expect(screen.queryByRole('button', { name: 'Prestiti' })).not.toBeInTheDocument();
  });
});
