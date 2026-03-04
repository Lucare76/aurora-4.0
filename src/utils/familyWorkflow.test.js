import { getFamilyPermissions } from './familyWorkflow';

describe('getFamilyPermissions', () => {
  it('returns strict permissions for viewer', () => {
    const p = getFamilyPermissions('viewer', {
      familyApprovalsEnabled: true,
      familyCommentsEnabled: true,
      familyBudgetsEnabled: true
    });
    expect(p.readOnly).toBe(true);
    expect(p.canEditTransactions).toBe(false);
    expect(p.canApprove).toBe(false);
    expect(p.canComment).toBe(true);
  });

  it('returns owner permissions when features are enabled', () => {
    const p = getFamilyPermissions('owner', {
      familyApprovalsEnabled: true,
      familyCommentsEnabled: true,
      familyBudgetsEnabled: true
    });
    expect(p.readOnly).toBe(false);
    expect(p.canEditTransactions).toBe(true);
    expect(p.canApprove).toBe(true);
    expect(p.canManageBudgets).toBe(true);
  });
});

