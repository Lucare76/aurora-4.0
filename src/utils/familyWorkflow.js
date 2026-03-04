export const FAMILY_ROLES = ['owner', 'editor', 'viewer'];

export function getFamilyPermissions(role = 'viewer', settings = {}) {
  const base = {
    canEditTransactions: role === 'owner' || role === 'editor',
    canApprove: role === 'owner' && settings.familyApprovalsEnabled !== false,
    canComment: role !== 'viewer' ? settings.familyCommentsEnabled !== false : settings.familyCommentsEnabled === true,
    canManageBudgets: role === 'owner' || (role === 'editor' && settings.familyBudgetsEnabled === true),
    readOnly: role === 'viewer'
  };
  return base;
}

