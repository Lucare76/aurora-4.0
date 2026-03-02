export const SUBSCRIPTION_NOTIFICATION_OPTIONS = [7, 3, 1];

export function normalizeSubscriptionNotificationOffsets(value) {
  const optionsSet = new Set(SUBSCRIPTION_NOTIFICATION_OPTIONS);

  if (Array.isArray(value)) {
    const out = value
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && optionsSet.has(v));
    if (out.length > 0) return Array.from(new Set(out)).sort((a, b) => b - a);
    return [...SUBSCRIPTION_NOTIFICATION_OPTIONS];
  }

  const n = Number(value);
  if (Number.isInteger(n) && optionsSet.has(n)) return [n];

  return [...SUBSCRIPTION_NOTIFICATION_OPTIONS];
}

export function getMaxSubscriptionNotificationDays(value) {
  const offsets = normalizeSubscriptionNotificationOffsets(value);
  return Math.max(...offsets);
}
