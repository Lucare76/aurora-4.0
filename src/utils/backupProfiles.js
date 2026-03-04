export const BACKUP_PROFILES = {
  full: [
    'transactions',
    'accounts',
    'categories',
    'budgets',
    'savingsGoals',
    'recurringTransactions',
    'subscriptions',
    'subscriptionPayments',
    'subscriptionReconciliationLogs',
    'birthdays'
  ],
  finance: ['transactions', 'accounts', 'categories', 'budgets'],
  planner: ['savingsGoals', 'recurringTransactions', 'subscriptions', 'subscriptionPayments', 'birthdays']
};

export function getBackupCollections(profile = 'full') {
  return BACKUP_PROFILES[profile] || BACKUP_PROFILES.full;
}

