const LOG_KEY = 'aurora_runtime_issues';
const MAX_LOG_ITEMS = 50;

function readLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLogs(items) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(items.slice(0, MAX_LOG_ITEMS)));
  } catch {
    // ignore storage errors
  }
}

export function logRuntimeIssue(input, context = 'runtime') {
  const message = input instanceof Error ? input.message : String(input || 'Unknown error');
  const stack = input instanceof Error ? input.stack || '' : '';
  const item = {
    context,
    message,
    stack,
    at: new Date().toISOString()
  };
  const current = readLogs();
  writeLogs([item, ...current]);
  return item;
}

export function getRuntimeIssues() {
  return readLogs();
}

export function clearRuntimeIssues() {
  writeLogs([]);
}

