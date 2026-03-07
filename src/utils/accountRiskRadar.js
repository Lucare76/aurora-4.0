export function computeAccountRiskRadar(input = {}) {
  const accounts = Array.isArray(input.accounts) ? input.accounts : [];
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;

  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);

  const tx30 = transactions.filter((t) => {
    const d = parseDate(t?.date);
    return d instanceof Date && !Number.isNaN(d.getTime()) && d >= start30 && d <= now;
  });

  const perAccount = accounts.map((acc) => {
    const balance = Number(acc?.balance) || 0;
    const net30 = tx30
      .filter((t) => t?.accountId === acc?.id)
      .reduce((sum, t) => sum + (Number(getAmount(t)) || 0), 0);
    const dailyNet = net30 / 30;
    const projected30 = balance + net30;
    const daysToZero =
      balance > 0 && dailyNet < 0 ? Math.ceil(balance / Math.abs(dailyNet)) : null;

    let level = 'ok';
    if (balance < 0 || projected30 < 0) level = 'critical';
    else if ((daysToZero != null && daysToZero <= 45) || projected30 < balance * 0.8) level = 'warn';

    return {
      id: acc?.id,
      name: acc?.name || 'Conto',
      balance,
      net30,
      projected30,
      daysToZero,
      level
    };
  });

  const risky = perAccount
    .filter((a) => a.level !== 'ok')
    .sort((a, b) => {
      const rank = (x) => (x === 'critical' ? 2 : x === 'warn' ? 1 : 0);
      const r = rank(b.level) - rank(a.level);
      if (r !== 0) return r;
      return (a.projected30 || 0) - (b.projected30 || 0);
    })
    .slice(0, 5);

  return {
    total: risky.length,
    critical: risky.filter((a) => a.level === 'critical').length,
    items: risky
  };
}

