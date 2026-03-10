import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import {
  accountsService,
  categoriesService,
  transactionsService,
  updateAccountBalance
} from './transactionsService';

jest.mock('./firebase', () => ({
  db: { __mock: true }
}));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  increment: jest.fn((v) => `INC:${v}`),
  orderBy: jest.fn((...args) => `ORDER:${args.join(':')}`),
  query: jest.fn((...args) => `QUERY:${args.join('|')}`),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  updateDoc: jest.fn(),
  where: jest.fn((...args) => `WHERE:${args.join(':')}`)
}));

describe('transactionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    collection.mockImplementation((...parts) => `col:${parts.join('/')}`);
    doc.mockImplementation((...parts) => `doc:${parts.join('/')}`);
    serverTimestamp.mockReturnValue('SERVER_TS');
    increment.mockImplementation((v) => `INC:${v}`);
  });

  describe('transactionsService.updateTransaction', () => {
    test('fails with 401 when userId missing', async () => {
      await expect(transactionsService.updateTransaction('', 'tx1', {})).rejects.toMatchObject({
        httpStatus: 401
      });
    });

    test('fails with 422 when transactionId missing', async () => {
      await expect(transactionsService.updateTransaction('u1', '', {})).rejects.toMatchObject({
        httpStatus: 422
      });
    });

    test('normalizes payload before update', async () => {
      updateDoc.mockResolvedValue(undefined);

      await transactionsService.updateTransaction('u1', 'tx1', {
        amount: '12.50',
        description: '   spesa test   ',
        currency: ' eur ',
        date: '2026-03-08T10:00:00.000Z'
      });

      expect(updateDoc).toHaveBeenCalledTimes(1);
      const payload = updateDoc.mock.calls[0][1];
      expect(payload.amount).toBe(12.5);
      expect(payload.description).toBe('spesa test');
      expect(payload.currency).toBe('EUR');
      expect(payload.date).toBeInstanceOf(Date);
      expect(payload.updatedAt).toBe('SERVER_TS');
    });

    test('maps invalid payload to http 422', async () => {
      await expect(
        transactionsService.updateTransaction('u1', 'tx1', { amount: 'abc' })
      ).rejects.toMatchObject({
        httpStatus: 422,
        message: 'Payload update non valido.'
      });
    });

    test('retries once on retryable errors', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      updateDoc
        .mockRejectedValueOnce({ code: 'unavailable', message: 'network' })
        .mockResolvedValueOnce(undefined);

      await transactionsService.updateTransaction('u1', 'tx1', { amount: 10 });

      expect(updateDoc).toHaveBeenCalledTimes(2);
      warnSpy.mockRestore();
    });

    test('maps permission error to http 403', async () => {
      updateDoc.mockRejectedValue({ code: 'permission-denied', message: 'nope' });
      await expect(
        transactionsService.updateTransaction('u1', 'tx1', { amount: 10 })
      ).rejects.toMatchObject({
        httpStatus: 403,
        message: 'Permessi insufficienti per aggiornare la transazione.'
      });
    });
  });

  describe('accounts/categories wrappers', () => {
    test('createAccount sets balance from initialBalance', async () => {
      addDoc.mockResolvedValue({ id: 'a1' });
      const out = await accountsService.createAccount('u1', {
        name: 'Main',
        initialBalance: 100
      });
      expect(out.id).toBe('a1');
      expect(addDoc.mock.calls[0][1].balance).toBe(100);
      expect(addDoc.mock.calls[0][1].createdAt).toBe('SERVER_TS');
    });

    test('updateAccountBalance uses increment and timestamp', async () => {
      await accountsService.updateAccountBalance('u1', 'a1', -15, 'expense');
      expect(increment).toHaveBeenCalledWith(-15);
      expect(updateDoc).toHaveBeenCalledWith('doc:[object Object]/users/u1/accounts/a1', {
        balance: 'INC:-15',
        updatedAt: 'SERVER_TS'
      });
    });

    test('external updateAccountBalance wrapper delegates to account service', async () => {
      await updateAccountBalance('u1', 'a1', 20, 'income');
      expect(updateDoc).toHaveBeenCalled();
    });

    test('createDefaultCategories creates 10 default rows', async () => {
      addDoc.mockResolvedValue({ id: 'x' });
      await categoriesService.createDefaultCategories('u1');
      expect(addDoc).toHaveBeenCalledTimes(10);
      expect(serverTimestamp).toHaveBeenCalled();
    });

    test('deleteAccount uses deleteDoc on account ref', async () => {
      deleteDoc.mockResolvedValue(undefined);
      await accountsService.deleteAccount('u1', 'a1');
      expect(deleteDoc).toHaveBeenCalledWith('doc:[object Object]/users/u1/accounts/a1');
    });
  });
});
