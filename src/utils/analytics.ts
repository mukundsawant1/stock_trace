import type { Trade } from '../types';

export function getRunningBalance(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let balance = 0;
  const result = sorted.map((trade) => {
    balance += trade.profitLoss;
    return { ...trade, cumulative: Number(balance.toFixed(2)) };
  });
  return result;
}

export function getDailyPL(trades: Trade[]) {
  const map = new Map<string, number>();
  trades.forEach((trade) => {
    // Group by local machine date to respect user's local timezone.
    const day = new Date(trade.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
    map.set(day, (map.get(day) ?? 0) + trade.profitLoss);
  });
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, profitLoss]) => ({ date, profitLoss: Number(profitLoss.toFixed(2)) }));
}

export function getWinRate(trades: Trade[]) {
  if (!trades.length) return 0;
  const wins = trades.filter((t) => t.profitLoss > 0).length;
  return Number(((wins / trades.length) * 100).toFixed(1));
}

export function getAvgWinLoss(trades: Trade[]) {
  const wins = trades.filter((t) => t.profitLoss > 0);
  const losses = trades.filter((t) => t.profitLoss < 0);
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.profitLoss, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.profitLoss, 0) / losses.length : 0;
  return {
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2))
  };
}

export function getDrawdown(cumulative: Array<{ cumulative: number }>) {
  let peak = 0; // start from zero equilibrium for drawdown
  let maxDD = 0;
  cumulative.forEach((point) => {
    if (point.cumulative > peak) peak = point.cumulative;
    const dd = peak - point.cumulative;
    if (dd > maxDD) maxDD = dd;
  });
  return Number(maxDD.toFixed(2));
}

export function getStreaks(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let winning = 0;
  let losing = 0;
  let maxWin = 0;
  let maxLose = 0;

  for (const t of sorted) {
    if (t.profitLoss > 0) {
      winning += 1;
      maxWin = Math.max(maxWin, winning);
      losing = 0;
    } else if (t.profitLoss < 0) {
      losing += 1;
      maxLose = Math.max(maxLose, losing);
      winning = 0;
    } else {
      winning = 0;
      losing = 0;
    }
  }
  return { maxWin, maxLose };
}

export function groupByStrategy(trades: Trade[]) {
  const map = new Map<string, { count: number; pl: number }>();
  trades.forEach((trade) => {
    const item = map.get(trade.strategy) ?? { count: 0, pl: 0 };
    item.count += 1;
    item.pl += trade.profitLoss;
    map.set(trade.strategy, item);
  });
  return [...map.entries()].map(([strategy, values]) => ({ strategy, ...values, pl: Number(values.pl.toFixed(2)) }));
}
