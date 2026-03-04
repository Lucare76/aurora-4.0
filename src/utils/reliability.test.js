import { clearRuntimeIssues, getRuntimeIssues, logRuntimeIssue } from './reliability';

describe('reliability runtime logs', () => {
  beforeEach(() => {
    clearRuntimeIssues();
  });

  it('stores and retrieves runtime issues', () => {
    logRuntimeIssue(new Error('boom'), 'test');
    const logs = getRuntimeIssues();
    expect(logs.length).toBe(1);
    expect(logs[0].message).toBe('boom');
    expect(logs[0].context).toBe('test');
  });
});

