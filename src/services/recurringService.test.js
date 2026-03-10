import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from './firebase';
import {
  addRecurring,
  deleteRecurring,
  getAllRecurringTransactions,
  getRecurringTransactions,
  processRecurring,
  removeRecurring,
  setRecurringActive,
  updateRecurring
} from './recurringService';

jest.mock('./firebase', () => ({
  db: { __mock: true },
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn()
}));

describe('recurringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    collection.mockReturnValue('recurring-collection-ref');
    query.mockReturnValue('recurring-query-ref');
    where.mockImplementation((...args) => `where:${args.join(':')}`);
    doc.mockImplementation((...parts) => `doc:${parts.join('/')}`);
    serverTimestamp.mockReturnValue('SERVER_TS');
  });

  test('addRecurring writes normalized payload and returns id', async () => {
    addDoc.mockResolvedValue({ id: 'r1' });
    const id = await addRecurring('u1', {
      description: 'Abbonamento',
      amount: '-12.5',
      type: 'expense',
      categoryId: 'c1',
      categoryName: 'Abbonamenti',
      subCategoryId: 's1',
      subCategoryName: 'Video',
      accountId: 'a1',
      accountName: 'Conto',
      frequency: 'monthly',
      nextDate: new Date('2026-01-10T00:00:00.000Z')
    });

    expect(id).toBe('r1');
    const payload = addDoc.mock.calls[0][1];
    expect(payload.userId).toBe('u1');
    expect(payload.amount).toBe(12.5);
    expect(payload.active).toBe(true);
    expect(payload.createdAt).toBe('SERVER_TS');
  });

  test('getRecurringTransactions queries active items and maps nextDate', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: 'r1', data: () => ({ nextDate: { toDate: () => new Date('2026-01-01T00:00:00.000Z') } }) },
        { id: 'r2', data: () => ({ nextDate: '2026-02-01T00:00:00.000Z' }) }
      ]
    });

    const out = await getRecurringTransactions('u1');

    expect(where).toHaveBeenCalledWith('userId', '==', 'u1');
    expect(where).toHaveBeenCalledWith('active', '==', true);
    expect(out).toHaveLength(2);
    expect(out[0].nextDate).toBeInstanceOf(Date);
    expect(out[1].nextDate).toBeInstanceOf(Date);
  });

  test('getAllRecurringTransactions queries by user only', async () => {
    getDocs.mockResolvedValue({ docs: [] });
    await getAllRecurringTransactions('u1');
    expect(where).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledWith('userId', '==', 'u1');
  });

  test('remove/set/update/delete recurring write expected payloads', async () => {
    await removeRecurring('r1');
    expect(updateDoc).toHaveBeenCalledWith('doc:[object Object]/recurringTransactions/r1', { active: false });

    await setRecurringActive('r1', 0);
    expect(updateDoc).toHaveBeenCalledWith('doc:[object Object]/recurringTransactions/r1', {
      active: false,
      updatedAt: 'SERVER_TS'
    });

    await updateRecurring('r1', { description: 'Nuova' });
    expect(updateDoc).toHaveBeenCalledWith('doc:[object Object]/recurringTransactions/r1', {
      description: 'Nuova',
      updatedAt: 'SERVER_TS'
    });

    await deleteRecurring('r1');
    expect(deleteDoc).toHaveBeenCalledWith('doc:[object Object]/recurringTransactions/r1');
  });

  test('processRecurring generates missed transactions and updates nextDate', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-08T10:00:00.000Z'));

    getDocs.mockResolvedValue({
      docs: [
        {
          id: 'r1',
          data: () => ({
            description: 'Weekly gym',
            amount: 20,
            type: 'expense',
            categoryId: 'c1',
            subCategoryId: 's1',
            accountId: 'a1',
            frequency: 'weekly',
            nextDate: new Date('2026-02-22T00:00:00.000Z'),
            active: true
          })
        },
        {
          id: 'r2',
          data: () => ({
            description: 'Future monthly',
            amount: 100,
            type: 'income',
            categoryId: 'c2',
            subCategoryId: null,
            accountId: 'a1',
            frequency: 'monthly',
            nextDate: new Date('2026-04-01T00:00:00.000Z'),
            active: true
          })
        }
      ]
    });

    const createTransactionFn = jest.fn().mockResolvedValue(undefined);
    const generated = await processRecurring('u1', createTransactionFn);

    expect(generated).toBe(3); // 22 Feb, 1 Mar, 8 Mar
    expect(createTransactionFn).toHaveBeenCalledTimes(3);
    expect(createTransactionFn.mock.calls[0][0].amount).toBe(-20);
    expect(updateDoc).toHaveBeenCalledTimes(2); // one update per recurring rule

    const updateR1 = updateDoc.mock.calls.find((c) => c[0] === 'doc:[object Object]/recurringTransactions/r1');
    const updateR2 = updateDoc.mock.calls.find((c) => c[0] === 'doc:[object Object]/recurringTransactions/r2');
    expect(updateR1[1].nextDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');
    expect(updateR2[1].nextDate.toISOString()).toBe('2026-04-01T00:00:00.000Z');

    jest.useRealTimers();
  });

  test('processRecurring continues when single generation fails', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-08T10:00:00.000Z'));

    getDocs.mockResolvedValue({
      docs: [
        {
          id: 'r1',
          data: () => ({
            description: 'Weekly gym',
            amount: 20,
            type: 'expense',
            categoryId: 'c1',
            subCategoryId: 's1',
            accountId: 'a1',
            frequency: 'weekly',
            nextDate: new Date('2026-03-01T00:00:00.000Z'),
            active: true
          })
        }
      ]
    });

    const createTransactionFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

    const generated = await processRecurring('u1', createTransactionFn);

    expect(generated).toBe(1);
    expect(createTransactionFn).toHaveBeenCalledTimes(2);
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
    jest.useRealTimers();
  });
});
