import {
  SUBSCRIPTION_NOTIFICATION_OPTIONS,
  getMaxSubscriptionNotificationDays,
  normalizeSubscriptionNotificationOffsets
} from './subscriptionsNotifications';

describe('subscriptionsNotifications', () => {
  describe('normalizeSubscriptionNotificationOffsets', () => {
    test('returns sorted unique valid offsets from array', () => {
      expect(normalizeSubscriptionNotificationOffsets([1, 7, 3, 7])).toEqual([7, 3, 1]);
    });

    test('accepts numeric strings and filters invalid entries', () => {
      expect(normalizeSubscriptionNotificationOffsets(['3', '1', '99', 'x'])).toEqual([3, 1]);
    });

    test('returns default options when array has no valid values', () => {
      expect(normalizeSubscriptionNotificationOffsets(['foo', 0, 2, null])).toEqual(
        SUBSCRIPTION_NOTIFICATION_OPTIONS
      );
    });

    test('returns single offset when scalar value is valid', () => {
      expect(normalizeSubscriptionNotificationOffsets(7)).toEqual([7]);
      expect(normalizeSubscriptionNotificationOffsets('3')).toEqual([3]);
    });

    test('returns default options when scalar value is invalid', () => {
      expect(normalizeSubscriptionNotificationOffsets('')).toEqual(SUBSCRIPTION_NOTIFICATION_OPTIONS);
      expect(normalizeSubscriptionNotificationOffsets(10)).toEqual(SUBSCRIPTION_NOTIFICATION_OPTIONS);
      expect(normalizeSubscriptionNotificationOffsets(undefined)).toEqual(SUBSCRIPTION_NOTIFICATION_OPTIONS);
    });
  });

  describe('getMaxSubscriptionNotificationDays', () => {
    test('returns max from normalized offsets', () => {
      expect(getMaxSubscriptionNotificationDays([3, 1])).toBe(3);
      expect(getMaxSubscriptionNotificationDays(1)).toBe(1);
    });

    test('falls back to default max when input is invalid', () => {
      expect(getMaxSubscriptionNotificationDays('invalid')).toBe(7);
    });
  });
});
