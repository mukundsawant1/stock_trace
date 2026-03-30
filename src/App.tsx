import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './App.css';
import { useTradeStore } from './store/tradeStore';
import type { Trade } from './types';

const emotions = ['CONFIDENT', 'FEAR', 'GREED', 'NEUTRAL'] as const;

function computeTradePnL(trade: Trade) {
  const raw = (trade.exitPrice - trade.entryPrice) * trade.quantity;
  return trade.type === 'SHORT' ? -raw : raw;
}

function App() {
  const {
    trades,
    selected,
    loading,
    filterSymbol,
    filterStrategy,
    filterType,
    setFilterSymbol,
    setFilterStrategy,
    setFilterType,
    loadTrades,
    addTrade,
    updateTrade,
    deleteTrade,
    selectTrade
  } = useTradeStore();

  const [form, setForm] = useState<Omit<Trade, 'id' | 'profitLoss' | 'timestamp'>>({
    symbol: '',
    type: 'LONG',
    entryPrice: 0,
    exitPrice: 0,
    quantity: 0,
    strategy: '',
    emotion: 'NEUTRAL',
    note: ''
  });
  const [showHelp, setShowHelp] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const currencySymbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };

  const formatCurrency = (value: number) => `${currencySymbols[currency]}${value.toFixed(2)}`;
  const seededDemoRef = useRef(false);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    if (!seededDemoRef.current && !loading && trades.length === 0) {
      seededDemoRef.current = true;
      addTrade({
        symbol: 'TST1',
        type: 'LONG',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 30,
        strategy: 'demo',
        emotion: 'CONFIDENT',
        note: 'Demo trade 1 (+300)'
      });
      setTimeout(() => {
        addTrade({
          symbol: 'TST2',
          type: 'SHORT',
          entryPrice: 200,
          exitPrice: 100,
          quantity: 18,
          strategy: 'demo',
          emotion: 'GREED',
          note: 'Demo trade 2 (+3600)'
        });
      }, 50);
    }
  }, [loading, trades.length, addTrade]);

  useEffect(() => {
    const updateAvailable = () => setUpdateMessage('Update available. Downloading...');
    const updateDownloaded = () => setUpdateMessage('Update downloaded. Restart app to install.');
    const updateError = () => setUpdateMessage('Update check failed.');

    window.addEventListener('update-available', updateAvailable);
    window.addEventListener('update-downloaded', updateDownloaded);
    window.addEventListener('update-error', updateError);

    return () => {
      window.removeEventListener('update-available', updateAvailable);
      window.removeEventListener('update-downloaded', updateDownloaded);
      window.removeEventListener('update-error', updateError);
    };
  }, []);

  useEffect(() => {
    if (selected) {
      setForm({
        symbol: selected.symbol,
        type: selected.type,
        entryPrice: selected.entryPrice,
        exitPrice: selected.exitPrice,
        quantity: selected.quantity,
        strategy: selected.strategy,
        emotion: selected.emotion,
        note: selected.note
      });
    }
  }, [selected]);

  const dateFilteredTrades = useMemo(() => {
    if (!startDate && !endDate) return [...trades];

    const startMs = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : Number.MIN_SAFE_INTEGER;
    const endMs = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Number.MAX_SAFE_INTEGER;

    return trades.filter((t) => {
      const tMs = new Date(t.timestamp).getTime();
      return tMs >= startMs && tMs <= endMs;
    });
  }, [trades, startDate, endDate]);

  const filteredTrades = useMemo(() => {
    let result = [...dateFilteredTrades];
    if (filterSymbol.trim()) {
      result = result.filter((t) => t.symbol.toLowerCase().includes(filterSymbol.trim().toLowerCase()));
    }
    if (filterStrategy.trim()) {
      result = result.filter((t) => t.strategy.toLowerCase().includes(filterStrategy.trim().toLowerCase()));
    }
    if (filterType !== 'ALL') {
      result = result.filter((t) => t.type === filterType);
    }
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [dateFilteredTrades, filterSymbol, filterStrategy, filterType]);

  const formatLocalDateTime = (ts: string) =>
    new Date(ts).toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

  const normalizedTrades = useMemo(() => {
    return filteredTrades
      .map((trade) => ({
        ...trade,
        pnl: computeTradePnL(trade),
        time: new Date(trade.timestamp).getTime()
      }))
      .sort((a, b) => a.time - b.time);
  }, [filteredTrades]);

  const equityData = useMemo(() => {
    let balance = 0;
    const data: Array<{time:number; displayTime:string; balance:number; pnl:number; index:number}> = [];

    if (normalizedTrades.length > 0) {
      data.push({
        time: normalizedTrades[0].time - 1,
        displayTime: new Date(normalizedTrades[0].time - 1).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        balance: 0,
        pnl: 0,
        index: 0
      });
    }

    normalizedTrades.forEach((trade, idx) => {
      balance += trade.pnl;
      data.push({
        time: trade.time,
        displayTime: new Date(trade.time).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        balance,
        pnl: trade.pnl,
        index: idx + 1
      });
    });

    let lastTime = 0;
    data.forEach((point) => {
      if (point.time <= lastTime) {
        point.time = lastTime + 1;
      }
      lastTime = point.time;
    });

    return data;
  }, [normalizedTrades]);

  console.log('Equity Data:', equityData);

  const balanceSeries = equityData.map((t) => ({ time: t.displayTime, balance: t.balance }));

  const dailyPL = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    normalizedTrades.forEach((t) => {
      const day = new Date(t.time).toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] ?? 0) + t.pnl;
    });
    return Object.entries(dailyMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, pnl]) => ({ date, pnl: Number(pnl.toFixed(2)) }));
  }, [normalizedTrades]);

  const totalTrades = normalizedTrades.length;
  const wins = normalizedTrades.filter((t) => t.pnl > 0);
  const losses = normalizedTrades.filter((t) => t.pnl < 0);

  const totalProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const avgWin = wins.length ? totalProfit / wins.length : 0;
  const avgLoss = losses.length ? totalLoss / losses.length : 0;
  const profitFactor = totalLoss === 0 ? null : Number((totalProfit / totalLoss).toFixed(2));

  let winStreak = 0;
  let lossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  normalizedTrades.forEach((t) => {
    if (t.pnl > 0) {
      winStreak++;
      lossStreak = 0;
    } else if (t.pnl < 0) {
      lossStreak++;
      winStreak = 0;
    } else {
      winStreak = 0;
      lossStreak = 0;
    }
    maxWinStreak = Math.max(maxWinStreak, winStreak);
    maxLossStreak = Math.max(maxLossStreak, lossStreak);
  });

  const totalPL = normalizedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate = totalTrades ? Number(((wins.length / totalTrades) * 100).toFixed(1)) : 0;
  const drawdown = useMemo(() => {
    let peak = 0;
    let maxDD = 0;
    let cumulative = 0;
    normalizedTrades.forEach((t) => {
      cumulative += t.pnl;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDD) maxDD = dd;
    });
    return Number(maxDD.toFixed(2));
  }, [normalizedTrades]);

  const strategySummary = useMemo(() => {
    const map = new Map<string, { count: number; pl: number }>();
    normalizedTrades.forEach((trade) => {
      const item = map.get(trade.strategy) ?? { count: 0, pl: 0 };
      item.count += 1;
      item.pl += trade.pnl;
      map.set(trade.strategy, item);
    });
    return [...map.entries()].map(([strategy, values]) => ({ strategy, ...values, pl: Number(values.pl.toFixed(2)) }));
  }, [normalizedTrades]);

  const isEmptyEquity = equityData.length < 2;

  const submitTrade = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.symbol.trim() || !form.strategy.trim()) {
      setError('Symbol and strategy are required');
      return;
    }
    if (form.entryPrice <= 0 || form.exitPrice <= 0 || form.quantity <= 0) {
      setError('Entry price, exit price and quantity must be > 0');
      return;
    }

    const payload = {
      ...form,
      entryPrice: Number(form.entryPrice),
      exitPrice: Number(form.exitPrice),
      quantity: Number(form.quantity)
    };

    try {
      if (selected) {
        updateTrade({ ...selected, ...payload, profitLoss: 0, timestamp: selected.timestamp });
      } else {
        addTrade(payload);
      }

      setForm({
        symbol: '',
        type: 'LONG',
        entryPrice: 0,
        exitPrice: 0,
        quantity: 0,
        strategy: '',
        emotion: 'NEUTRAL',
        note: ''
      });
      selectTrade(null);
    } catch (err: any) {
      setError(err?.message || 'Invalid trade input');
    }
  };

  return (
    <div className="app-container bg-slate-100">
      <div className="container">
      <div className="space-y-4">
        <header className="header-row">
          <div className="header-left">
            <h1>TradeQuant Pro</h1>
            <p>Offline Trading Journal & Performance Intelligence Tool</p>
          </div>
          <div className="header-right">
            <label className="text-xs text-slate-600">Currency</label>
            <select className="border rounded px-2 py-1 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD' | 'EUR' | 'GBP')}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>

            <label className="text-xs text-slate-600">Start Date</label>
            <input type="date" className="border rounded px-2 py-1 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

            <label className="text-xs text-slate-600">End Date</label>
            <input type="date" className="border rounded px-2 py-1 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="border rounded px-2 py-1 text-xs bg-slate-100">Clear Date Filter</button>

            <button
              onClick={() => (window as any).updater?.check?.()}
              className="px-3 py-1 border border-indigo-300 rounded bg-indigo-50 hover:bg-indigo-100 text-sm"
            >
              Check for Updates
            </button>
            <button onClick={() => setShowHelp(true)} className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 text-sm">Help & Tour</button>
            <span className="meta-item">Trades in DB: {trades.length}</span>
          </div>
        </header>

        {updateMessage && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 mb-2">
            {updateMessage}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-left">
            <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">TradeSage Quick Help</h2>
                <button className="text-sm px-3 py-1 bg-slate-200 rounded" onClick={() => setShowHelp(false)}>Close</button>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <p>TradeSage is an offline trading journal with built-in analytics. Data persists locally (or in Electron storage when packaged).</p>
                <p>Currency selects symbol display only; underlying calculations remain consistent with trade amounts.</p>
                <h3 className="text-base font-semibold">Page layout</h3>
                <ul className="list-disc pl-5">
                  <li><strong>Performance overview</strong>: live balance, today P&L, win rate, drawdown.</li>
                  <li><strong>Charts</strong>: equity curve (step) and daily P&L bars.</li>
                  <li><strong>Analytics</strong>: breakdown by strategy + full trade stats.</li>
                  <li><strong>Trade history</strong>: filterable table + edit/delete.</li>
                  <li><strong>Quick entry</strong>: create/update trades quickly with price and quantity.</li>
                </ul>
                <h3 className="text-base font-semibold">How to use</h3>
                <ol className="list-decimal pl-5">
                  <li>Enter trade details in <strong>Quick Entry</strong> and hit Add.</li>
                  <li>Use filters in Trade History (symbol/strategy/type) to focus analysis.</li>
                  <li>Monitor equity curve and daily P&L updates in real-time.</li>
                  <li>Check stats for average win/loss, profit factor, and streaks.</li>
                  <li>Clear date filter or use explicit data range to analyze specific periods.</li>
                </ol>
                <h3 className="text-base font-semibold">Data assurance</h3>
                <p>All calculations use a normalized trade dataset to avoid duplicate or inconsistent values.</p>
              </div>
            </div>
          </div>
        )}


        <h2 className="text-xl font-bold">Performance Overview</h2>
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <h3 className="text-xs uppercase text-slate-500">Balance</h3>
            <p className="text-3xl font-semibold">{formatCurrency(balanceSeries.length ? balanceSeries[balanceSeries.length - 1].balance : 0)}</p>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <h3 className="text-xs uppercase text-slate-500">Today P&L</h3>
            <p className="text-3xl font-semibold">{formatCurrency(dailyPL.length ? dailyPL[dailyPL.length - 1].pnl : 0)}</p>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <h3 className="text-xs uppercase text-slate-500">Win Rate</h3>
            <p className="text-3xl font-semibold">{winRate}%</p>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <h3 className="text-xs uppercase text-slate-500">Max Drawdown</h3>
            <p className="text-3xl font-semibold">{formatCurrency(drawdown)}</p>
          </div>
        </section>

        <section className="dashboard mb-4">
          <article className="full-width p-4 rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Performance Chart</h2>
            <div className="h-72">
              {isEmptyEquity ? (
                <div className="flex h-full items-center justify-center text-slate-500 text-sm border border-dashed rounded-lg">
                  No trades yet. Add trades to see performance.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={equityData} margin={{ top: 12, right: 16, left: -8, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(value) => new Date(Number(value)).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => new Date(Number(label)).toLocaleString()}
                      formatter={(value: number) => [`${currencySymbols[currency]}${Number(value).toFixed(2)}`, 'Balance']}
                    />
                    <Line
                      type="stepAfter"
                      dataKey="balance"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
          <article className="p-4 rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Daily P&L</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPL} margin={{ top: 12, right: 0, left: 0, bottom: 6 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" padding={{ left: 30, right: 30 }} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${currencySymbols[currency]}${Number(value).toFixed(2)}`} />
                  <Bar dataKey="pnl">
                    {dailyPL.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.pnl >= 0 ? '#16a34a' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <h2 className="text-xl font-bold">Trade Analytics</h2>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <article className="p-4 rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Strategy Analysis</h2>
            <div className="space-y-2">
              {strategySummary.length ? (
                strategySummary.map((s) => {
                  const pct = totalPL ? Number(((s.pl / totalPL) * 100).toFixed(1)) : 0;
                  return (
                    <div key={s.strategy} className="rounded border p-2 flex justify-between text-sm">
                      <span>{s.strategy}</span>
                      <span>{s.count} trades · {formatCurrency(s.pl)} ({pct}%)</span>
                    </div>
                  );
                })
              ) : (
                <p>No strategy data</p>
              )}
            </div>
          </article>

          <article className="p-4 rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Statistics</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Total Trades</span><strong>{totalTrades}</strong></div>
              <div className="flex justify-between"><span>Total P&L</span><strong>{formatCurrency(totalPL)}</strong></div>
              <div className="flex justify-between"><span>Profit Factor</span><strong>{profitFactor === null ? '-' : profitFactor === Number.POSITIVE_INFINITY ? '∞' : profitFactor}</strong></div>
              <div className="flex justify-between"><span>Avg Win</span><strong>{formatCurrency(avgWin)}</strong></div>
              <div className="flex justify-between"><span>Avg Loss</span><strong>{formatCurrency(avgLoss)}</strong></div>
              <div className="flex justify-between"><span>Max Win Streak</span><strong>{maxWinStreak}</strong></div>
              <div className="flex justify-between"><span>Max Loss Streak</span><strong>{maxLossStreak}</strong></div>
            </div>
          </article>
        </section>

        <section className="dashboard mb-4">
          <article className="p-4 rounded-lg bg-white shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-3">
              <h2 className="text-lg font-semibold">Trade History</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full lg:w-auto">
                <div className="flex flex-col gap-1">
                  <label htmlFor="filterSymbol" className="text-xs font-medium text-slate-600">Symbol filter</label>
                  <input id="filterSymbol" className="border rounded px-2 py-1" value={filterSymbol} onChange={(e) => setFilterSymbol(e.target.value)} placeholder="e.g. NSLE" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="filterStrategy" className="text-xs font-medium text-slate-600">Strategy filter</label>
                  <input id="filterStrategy" className="border rounded px-2 py-1" value={filterStrategy} onChange={(e) => setFilterStrategy(e.target.value)} placeholder="e.g. breakout" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="filterType" className="text-xs font-medium text-slate-600">Type filter</label>
                  <select id="filterType" className="border rounded px-2 py-1" value={filterType} onChange={(e) => setFilterType(e.target.value as 'ALL' | 'LONG' | 'SHORT')}>
                    <option value="ALL">All</option>
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </div>
              </div>
            </div>
            {loading ? (
              <p>Loading trades...</p>
            ) : (
              <div className="trade-table overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-2 py-2">When</th>
                      <th className="px-2 py-2">Symbol</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Qty</th>
                      <th className="px-2 py-2">P/L</th>
                      <th className="px-2 py-2">Strategy</th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.length ? (
                      filteredTrades.map((trade) => (
                        <tr key={trade.id} className="border-b last:border-b-0 hover:bg-slate-50">
                          <td className="px-2 py-1">{formatLocalDateTime(trade.timestamp)}</td>
                          <td className="px-2 py-1">{trade.symbol}</td>
                          <td className={`px-2 py-1 font-semibold ${trade.type === 'LONG' ? 'text-emerald-600' : 'text-rose-600'}`}>{trade.type}</td>
                          <td className="px-2 py-1">{trade.quantity}</td>
                          <td className={`px-2 py-1 font-semibold ${trade.profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currencySymbols[currency]}{trade.profitLoss.toFixed(2)}</td>
                          <td className="px-2 py-1">{trade.strategy}</td>
                          <td className="px-2 py-1 flex gap-1">
                            <button className="px-2 py-1 text-xs rounded bg-slate-100" onClick={() => selectTrade(trade)}>Edit</button>
                            <button className="px-2 py-1 text-xs rounded bg-rose-100" onClick={() => deleteTrade(trade.id)}>Delete</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td className="p-4" colSpan={7}>No trades yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="p-4 rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Quick Entry</h2>
            <form className="space-y-3" onSubmit={submitTrade}>
              <div className="flex flex-col gap-1">
                <label htmlFor="symbol" className="text-sm font-medium">Symbol</label>
                <input id="symbol" className="w-full border rounded px-2 py-2" value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="e.g. AAPL" />
                <small className="text-xs text-slate-500">Ticker symbol, uppercase.</small>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="tradeType" className="text-sm font-medium">Trade Type</label>
                  <select id="tradeType" className="border rounded px-2 py-2" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'LONG' | 'SHORT' }))}>
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                  <small className="text-xs text-slate-500">Long = buy low/sell high, short = sell high/buy low.</small>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="emotion" className="text-sm font-medium">Emotion</label>
                  <select id="emotion" className="border rounded px-2 py-2" value={form.emotion} onChange={(e) => setForm((f) => ({ ...f, emotion: e.target.value as typeof emotions[number] }))}>
                    {emotions.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                  <small className="text-xs text-slate-500">Capture trader mindset.</small>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="entryPrice" className="text-sm font-medium">Entry Price</label>
                  <input id="entryPrice" type="number" className="border rounded px-2 py-2" value={String(form.entryPrice)} onChange={(e) => setForm((f) => ({ ...f, entryPrice: Number(e.target.value) }))} placeholder="0.00" step="0.01" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="exitPrice" className="text-sm font-medium">Exit Price</label>
                  <input id="exitPrice" type="number" className="border rounded px-2 py-2" value={String(form.exitPrice)} onChange={(e) => setForm((f) => ({ ...f, exitPrice: Number(e.target.value) }))} placeholder="0.00" step="0.01" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="quantity" className="text-sm font-medium">Quantity</label>
                  <input id="quantity" type="number" className="border rounded px-2 py-2" value={String(form.quantity)} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} placeholder="0" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="strategy" className="text-sm font-medium">Strategy</label>
                <input id="strategy" className="w-full border rounded px-2 py-2" value={form.strategy} onChange={(e) => setForm((f) => ({ ...f, strategy: e.target.value }))} placeholder="e.g. breakout" />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="note" className="text-sm font-medium">Note</label>
                <textarea id="note" className="w-full border rounded px-2 py-2" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Trade observation, risk management, etc." rows={3} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-slate-800 text-white rounded">{selected ? 'Update Trade' : 'Add Trade'}</button>
                {selected && (
                  <button type="button" className="flex-1 py-2 bg-slate-200 rounded" onClick={() => { selectTrade(null); setForm({ symbol: '', type: 'LONG', entryPrice: 0, exitPrice: 0, quantity: 0, strategy: '', emotion: 'NEUTRAL', note: '' }); }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </article>
        </section>
      </div>
    </div>
  </div>
  );
}

export default App;
