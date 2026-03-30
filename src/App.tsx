import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './App.css';
import { useTradeStore } from './store/tradeStore';
import { getDailyPL, getDrawdown, getRunningBalance, getStreaks, getWinRate, getAvgWinLoss, groupByStrategy } from './utils/analytics';
import type { Trade } from './types';

const emotions = ['CONFIDENT', 'FEAR', 'GREED', 'NEUTRAL'] as const;

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

  const equityData = useMemo(() => {
    let balance = 0;
    const sortedTrades = [...filteredTrades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const data: Array<{time:number; displayTime:string; balance:number; pnl:number; index:number}> = [];

    if (sortedTrades.length > 0) {
      const firstTime = new Date(sortedTrades[0].timestamp).getTime();
      data.push({
        time: firstTime - 1,
        displayTime: new Date(firstTime - 1).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        balance: 0,
        pnl: 0,
        index: 0
      });
    }

    sortedTrades.forEach((trade, idx) => {
      const pnl = trade.type === 'SHORT'
        ? (trade.entryPrice - trade.exitPrice) * trade.quantity
        : (trade.exitPrice - trade.entryPrice) * trade.quantity;

      balance += pnl;
      const time = new Date(trade.timestamp).getTime();

      data.push({
        time,
        displayTime: new Date(time).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        balance,
        pnl,
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
  }, [filteredTrades]);

  console.log('Equity Data:', equityData);

  const balanceSeries = equityData.map((t) => ({ time: t.displayTime, balance: t.balance }));
  const dailyPL = getDailyPL(filteredTrades);
  const winRate = getWinRate(filteredTrades);
  const avg = getAvgWinLoss(filteredTrades);
  const drawdown = getDrawdown(getRunningBalance(filteredTrades));
  const streaks = getStreaks(filteredTrades);
  const strategySummary = groupByStrategy(filteredTrades);

  const totalPL = filteredTrades.reduce((sum, t) => sum + t.profitLoss, 0);
  const totalTrades = filteredTrades.length;
  const totalWins = filteredTrades.filter((t) => t.profitLoss > 0).reduce((sum, t) => sum + t.profitLoss, 0);
  const totalLosses = Math.abs(filteredTrades.filter((t) => t.profitLoss < 0).reduce((sum, t) => sum + t.profitLoss, 0));
  const profitFactor = totalLosses === 0 ? (totalWins === 0 ? 0 : Number.POSITIVE_INFINITY) : Number((totalWins / totalLosses).toFixed(2));

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
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">TradeSage Desktop</h1>
            <p className="text-sm text-slate-500">Offline Trading Journal & Performance Intelligence Tool</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

            <button onClick={() => setShowHelp(true)} className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 text-sm">Help & Tour</button>
            <span className="text-sm text-slate-600">Trades in DB: {trades.length}</span>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">TradeSage Quick Start Guide</h2>
                <button className="text-sm px-2 py-1 bg-slate-200 rounded" onClick={() => setShowHelp(false)}>Close</button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>This app is fully offline. Data is saved to <strong>/data/trades.json</strong> automatically when you add/edit/delete trades. There is no network dependency.</p>
                <p>Currency conversion is visual only: your underlying P&L stays in trade amount units; symbols adjust via dropdown (INR, USD, EUR, GBP).</p>
                <h3 className="text-base font-semibold">Screen flow</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Top cards</strong>: overall balance, today P&L, win rate, drawdown.</li>
                  <li><strong>Equity curve</strong>: stitched cumulative account EQUITY per trade date.</li>
                  <li><strong>Daily P&L</strong>: grouped by calendar day, sum of all trade profitLoss that day.</li>
                  <li><strong>Trade history</strong>: filtered table for symbol/strategy/type, edit/delete action in each row.</li>
                  <li><strong>Quick entry</strong>: fastest add/edit flow on right; required: symbol, strategy, entry, exit, quantity.</li>
                </ul>
                <h3 className="text-base font-semibold">How analytics work</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <strong>Quick Entry</strong>: fill symbol, long/short, emotion, entry, exit, quantity, strategy, note. Then click <strong>Add Trade</strong>.
                  </li>
                  <li>
                    <strong>Trade History</strong>: uses filters above the table to quickly find symbol/strategy/type. Use Edit/Delete on rows.
                  </li>
                  <li>
                    <strong>Analytics cards</strong>: show balance, today P&L, win rate, drawdown in real-time.
                  </li>
                  <li>
                    <strong>Charts</strong>: equity curve updates per trade; daily P&L shows day performance.
                  </li>
                  <li>
                    <strong>Strategy analysis + streaks</strong>: automatic summary by strategy and max winning/losing streak.
                  </li>
                </ol>
                <p>For best use: start with a trade in Quick Entry, then track chart shape and check drawdown/win rate. For each strategy, confirm per-strategy PL in the summary cards below.</p>
                <p>Tip: Use the table filters (symbol/strategy/type) whenever your trade count grows; this reduces cognitive burden and supports backtest-like analysis.</p>
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
            <p className="text-3xl font-semibold">{formatCurrency(dailyPL.length ? dailyPL[dailyPL.length - 1].profitLoss : 0)}</p>
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
                <BarChart data={dailyPL} margin={{ top: 12, right: 16, left: -8, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${currencySymbols[currency]}${Number(value).toFixed(2)}`} />
                  <Bar dataKey="profitLoss">
                    {dailyPL.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.profitLoss >= 0 ? '#16a34a' : '#dc2626'} />
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
              <div className="flex justify-between"><span>Profit Factor</span><strong>{profitFactor === Number.POSITIVE_INFINITY ? '∞' : profitFactor}</strong></div>
              <div className="flex justify-between"><span>Avg Win</span><strong>{formatCurrency(avg.avgWin)}</strong></div>
              <div className="flex justify-between"><span>Avg Loss</span><strong>{formatCurrency(avg.avgLoss)}</strong></div>
              <div className="flex justify-between"><span>Max Win Streak</span><strong>{streaks.maxWin}</strong></div>
              <div className="flex justify-between"><span>Max Loss Streak</span><strong>{streaks.maxLose}</strong></div>
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
