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
  computeNextDueDate,
  createSubscription,
  deleteSubscription,
  getSubscriptions,
  markSubscriptionPaid,
  updateSubscription
} from './subscriptionsService';

jest.mock('./firebase', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  db: { __mock: true },
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn()
}));

describe('subscriptionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    collection.mockReturnValue('subscriptions-collection-ref');
    query.mockReturnValue('subscriptions-query-ref');
    where.mockReturnValue('where-user');
    serverTimestamp.mockReturnValue('SERVER_TS');
    doc.mockImplementation((...parts) => `doc:${parts.join('/')}`);
  });

  describe('computeNextDueDate', () => {
    test('adds one month by default', () => {
      const out = computeNextDueDate(new Date('2026-01-15T12:00:00.000Z'), 'monthly');
      expect(out.toISOString()).toBe('2026-02-15T12:00:00.000Z');
    });

    test('adds one week for weekly cycle', () => {
      const out = computeNextDueDate(new Date('2026-01-15T12:00:00.000Z'), 'weekly');
      expect(out.toISOString()).toBe('2026-01-22T12:00:00.000Z');
    });

    test('adds one year for yearly cycle', () => {
      const out = computeNextDueDate(new Date('2026-01-15T12:00:00.000Z'), 'yearly');
      expect(out.toISOString()).toBe('2027-01-15T12:00:00.000Z');
    });
  });

  test('getSubscriptions maps and sorts by nextDueDate', async () => {
    const ts = (iso) => ({ toDate: () => new Date(iso) });
    getDocs.mockResolvedValue({
      docs: [
        {
          id: 'b',
          data: () => ({
            userId: 'u1',
            amount: '5',
            nextDueDate: ts('2026-05-10T10:00:00.000Z')
          })
        },
        {
          id: 'a',
          data: () => ({
            userId: 'u1',
            amount: '12.5',
            previousAmount: '10',
            priceIncreaseDelta: '2.5',
            priceIncreasePercent: '25',
            priceIncreasedAt: ts('2026-01-10T10:00:00.000Z'),
            nextDueDate: ts('2026-04-10T10:00:00.000Z'),
            createdAt: ts('2026-01-01T10:00:00.000Z'),
            updatedAt: ts('2026-01-02T10:00:00.000Z'),
            lastPaidAt: ts('2026-03-10T10:00:00.000Z')
          })
        }
      ]
    });

    const out = await getSubscriptions('u1');

    expect(collection).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith('userId', '==', 'u1');
    expect(query).toHaveBeenCalled();
    expect(out.map((x) => x.id)).toEqual(['a', 'b']);
    expect(out[0].amount).toBe(12.5);
    expect(out[0].previousAmount).toBe(10);
    expect(out[0].priceIncreaseDelta).toBe(2.5);
    expect(out[0].priceIncreasePercent).toBe(25);
    expect(out[0].nextDueDate).toBeInstanceOf(Date);
    expect(out[0].createdAt).toBeInstanceOf(Date);
    expect(out[0].updatedAt).toBeInstanceOf(Date);
    expect(out[0].lastPaidAt).toBeInstanceOf(Date);
  });

  test('createSubscription writes normalized payload and returns id', async () => {
    addDoc.mockResolvedValue({ id: 'sub-123' });

    const id = await createSubscription('u1', {
      name: ' Netflix ',
      ownerName: ' Mario ',
      provider: ' Netflix Inc ',
      notes: ' note ',
      accountId: 'acc-1',
      accountName: ' Conto principale ',
      amount: '-9.99',
      billingCycle: 'monthly',
      kind: 'recurring',
      nextDueDate: '2026-04-01T00:00:00.000Z',
      active: true,
      currency: 'EUR'
    });

    expect(id).toBe('sub-123');
    expect(addDoc).toHaveBeenCalledTimes(1);
    const payload = addDoc.mock.calls[0][1];
    expect(payload.userId).toBe('u1');
    expect(payload.name).toBe('Netflix');
    expect(payload.ownerName).toBe('Mario');
    expect(payload.provider).toBe('Netflix Inc');
    expect(payload.notes).toBe('note');
    expect(payload.accountId).toBe('acc-1');
    expect(payload.accountName).toBe('Conto principale');
    expect(payload.amount).toBe(9.99);
    expect(payload.createdAt).toBe('SERVER_TS');
    expect(payload.updatedAt).toBe('SERVER_TS');
    expect(payload.nextDueDate).toBeInstanceOf(Date);
  });

  test('updateSubscription appends updatedAt', async () => {
    await updateSubscription('sub-1', { name: 'Prime' });
    expect(updateDoc).toHaveBeenCalledWith('doc:[object Object]/subscriptions/sub-1', {
      name: 'Prime',
      updatedAt: 'SERVER_TS'
    });
  });

  test('deleteSubscription deletes by doc ref', async () => {
    await deleteSubscription('sub-1');
    expect(deleteDoc).toHaveBeenCalledWith('doc:[object Object]/subscriptions/sub-1');
  });

  test('markSubscriptionPaid updates lastPaidAt and nextDueDate', async () => {
    await markSubscriptionPaid({
      id: 'sub-1',
      billingCycle: 'weekly',
      nextDueDate: new Date('2026-01-10T00:00:00.000Z')
    });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const payload = updateDoc.mock.calls[0][1];
    expect(updateDoc.mock.calls[0][0]).toBe('doc:[object Object]/subscriptions/sub-1');
    expect(payload.lastPaidAt).toBeInstanceOf(Date);
    expect(payload.nextDueDate).toBeInstanceOf(Date);
    expect(payload.nextDueDate.toISOString()).toBe('2026-01-17T00:00:00.000Z');
    expect(payload.updatedAt).toBe('SERVER_TS');
  });
});
