import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsContent from './SettingsContent';
import { getDoc } from 'firebase/firestore';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'user@test.it', displayName: 'User' },
    userSettings: {},
    setUserSettings: jest.fn(),
    isAdmin: false,
    userApprovalStatus: { status: 'approved' }
  })
}));

jest.mock('../../services/firebase', () => ({
  db: {}
}));

jest.mock('../../services/userApprovalService', () => ({
  updateReminderSettings: jest.fn().mockResolvedValue({ success: true }),
  updateWeatherCity: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'doc-ref'),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      reminderEmail: 'user@test.it',
      reminderDaysBefore: 2,
      weatherCity: 'Roma'
    })
  }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  setDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] })
}));

describe('SettingsContent basic interactions', () => {
  test('renders compact view first and mounts section content when expanded', async () => {
    render(<SettingsContent />);

    expect(await screen.findByText('Impostazioni')).toBeInTheDocument();
    await waitFor(() => expect(getDoc).toHaveBeenCalled());
    expect(screen.queryByLabelText('Email per Notifiche')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Espandi tutto' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Riduci tutto' })).toBeEnabled());
    expect(await screen.findByLabelText('Email per Notifiche')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Riduci tutto' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Espandi tutto' })).toBeEnabled());
    expect(screen.queryByLabelText('Email per Notifiche')).not.toBeInTheDocument();
  });
});
