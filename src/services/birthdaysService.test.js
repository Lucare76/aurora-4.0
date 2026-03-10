import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  addBirthday,
  calculateAge,
  checkUpcomingBirthdays,
  deleteBirthday,
  getBirthdays,
  getDaysUntilBirthday,
  updateBirthday
} from './birthdaysService';

jest.mock('./firebase', () => ({
  db: { __mock: true }
}));

jest.mock('firebase/firestore', () => ({
  Timestamp: { now: jest.fn(() => 'TS_NOW') },
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn()
}));

describe('birthdaysService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    collection.mockReturnValue('birthdays-collection-ref');
    query.mockReturnValue('birthdays-query-ref');
    where.mockReturnValue('where-user');
    doc.mockImplementation((...parts) => `doc:${parts.join('/')}`);
    Timestamp.now.mockReturnValue('TS_NOW');
  });

  describe('date helpers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-08T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('checkUpcomingBirthdays returns items in 2 days and not already notified this year', () => {
      const out = checkUpcomingBirthdays([
        { id: 'a', date: '10/3', lastNotificationYear: 2025 },
        { id: 'b', date: '10/3', lastNotificationYear: 2026 },
        { id: 'c', date: '11/3', lastNotificationYear: 2025 },
        { id: 'd', date: null, lastNotificationYear: null }
      ]);
      expect(out.map((x) => x.id)).toEqual(['a']);
    });

    test('calculateAge handles birthday before and after current date', () => {
      expect(calculateAge('01/03', 2000)).toBe(26);
      expect(calculateAge('30/12', 2000)).toBe(25);
      expect(calculateAge('', 2000)).toBeNull();
      expect(calculateAge('01/03', null)).toBeNull();
    });

    test('getDaysUntilBirthday returns 0 for today and rolls over to next year', () => {
      expect(getDaysUntilBirthday('8/3')).toBe(0);
      expect(getDaysUntilBirthday('10/3')).toBe(2);
      expect(getDaysUntilBirthday('1/1')).toBe(299);
      expect(getDaysUntilBirthday(null)).toBeNull();
    });
  });

  describe('CRUD wrappers', () => {
    test('addBirthday writes expected payload and returns success', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      addDoc.mockResolvedValue({ id: 'b-1' });
      const out = await addBirthday('u1', {
        name: 'Luca',
        date: '10/03',
        birthYear: '1990',
        email: 'luca@test.it',
        notes: 'amico'
      });

      expect(out).toEqual({ success: true, id: 'b-1' });
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'birthdays');
      expect(addDoc).toHaveBeenCalledTimes(1);
      const payload = addDoc.mock.calls[0][1];
      expect(payload.userId).toBe('u1');
      expect(payload.name).toBe('Luca');
      expect(payload.date).toBe('10/03');
      expect(payload.birthYear).toBe(1990);
      expect(payload.notificationSent).toBe(false);
      expect(payload.lastNotificationYear).toBeNull();
      expect(payload.createdAt).toBe('TS_NOW');
      expect(payload.updatedAt).toBe('TS_NOW');
      expect(Timestamp.now).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    test('addBirthday returns error object when addDoc fails', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      addDoc.mockRejectedValue(new Error('boom'));
      const out = await addBirthday('u1', { name: 'Luca', date: '10/03' });
      expect(out.success).toBe(false);
      expect(out.error).toBe('boom');
      errSpy.mockRestore();
    });

    test('getBirthdays returns mapped docs list', async () => {
      const forEach = (cb) => {
        cb({ id: 'b1', data: () => ({ name: 'A' }) });
        cb({ id: 'b2', data: () => ({ name: 'B' }) });
      };
      getDocs.mockResolvedValue({ forEach });

      const out = await getBirthdays('u1');
      expect(out).toEqual([
        { id: 'b1', name: 'A' },
        { id: 'b2', name: 'B' }
      ]);
    });

    test('updateBirthday writes patch plus updatedAt', async () => {
      const out = await updateBirthday('b-1', { notes: 'x' });
      expect(out).toEqual({ success: true });
      expect(updateDoc).toHaveBeenCalledWith('doc:[object Object]/birthdays/b-1', {
        notes: 'x',
        updatedAt: 'TS_NOW'
      });
    });

    test('deleteBirthday calls deleteDoc with birthday ref', async () => {
      const out = await deleteBirthday('b-1');
      expect(out).toEqual({ success: true });
      expect(deleteDoc).toHaveBeenCalledWith('doc:[object Object]/birthdays/b-1');
    });
  });
});
