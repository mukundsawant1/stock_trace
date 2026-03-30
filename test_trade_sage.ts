import { useTradeStore } from './src/store/tradeStore.ts';
import { getRunningBalance, getDailyPL, getWinRate, getDrawdown } from './src/utils/analytics.ts';

function report(name: string, input: any, expected: any, actual: any) {
  const status = JSON.stringify(actual) === JSON.stringify(expected) ? 'PASS' : 'FAIL';
  console.log('[Test Report]');
  console.log('Test Case:', name);
  console.log('Input:', JSON.stringify(input));
  console.log('Expected:', JSON.stringify(expected));
  console.log('Actual:', JSON.stringify(actual));
  console.log('Status:', status);
  console.log('------------------------');
}

const store = useTradeStore;

function reset() {
  useTradeStore.setState({ trades: [] });
}

function setTrades(trades) {
  useTradeStore.setState({ trades });
}

// TC1
reset();
try {
  useTradeStore.getState().addTrade({ symbol: 'T1', type: 'LONG', entryPrice: 100, exitPrice: 120, quantity: 10, strategy: 'S1', emotion: 'CONFIDENT', note: '' });
  const trades = useTradeStore.getState().trades;
  const pl = trades[0].profitLoss;
  const balance = getRunningBalance(trades).slice(-1)[0].cumulative;
  const winRate = getWinRate(trades);
  report('tc1', { entryPrice:100, exitPrice:120, quantity:10, type:'LONG' }, { profitLoss: 200, balance:200, winRate:100 }, { profitLoss: pl, balance, winRate });
} catch (error) {
  report('tc1', null, 'no error', error?.message || error);
}

// TC2
reset();
try {
  useTradeStore.getState().addTrade({ symbol: 'T2', type: 'LONG', entryPrice: 100, exitPrice: 90, quantity: 10, strategy: 'S2', emotion: 'FEAR', note: '' });
  const trades = useTradeStore.getState().trades;
  const pl = trades[0].profitLoss;
  const winRate = getWinRate(trades);
  const drawdown = getDrawdown(getRunningBalance(trades));
  report('tc2', {entryPrice:100,exitPrice:90,quantity:10,type:'LONG'}, {profitLoss:-100, winRate:0, drawdown:100}, {profitLoss:pl, winRate, drawdown});
} catch (error) {
  report('tc2', null, 'no error', error?.message || error);
}

// TC3
reset();
try {
  useTradeStore.getState().addTrade({ symbol: 'T3', type: 'SHORT', entryPrice: 100, exitPrice: 80, quantity: 10, strategy: 'S3', emotion: 'GREED', note: '' });
  const trades = useTradeStore.getState().trades;
  const pl = trades[0].profitLoss;
  report('tc3', {entryPrice:100,exitPrice:80,quantity:10,type:'SHORT'}, {profitLoss:200}, {profitLoss:pl});
} catch (error) {
  report('tc3', null, 'no error', error?.message || error);
}

// TC4
reset();
setTrades([
  { id:'1', timestamp:new Date('2026-01-01T00:00:00Z').toISOString(), symbol:'a', type:'LONG', entryPrice:0, exitPrice:0, quantity:0, profitLoss:200, strategy:'', emotion:'NEUTRAL', note:'' },
  { id:'2', timestamp:new Date('2026-01-02T00:00:00Z').toISOString(), symbol:'b', type:'LONG', entryPrice:0, exitPrice:0, quantity:0, profitLoss:-100, strategy:'', emotion:'NEUTRAL', note:'' },
  { id:'3', timestamp:new Date('2026-01-03T00:00:00Z').toISOString(), symbol:'c', type:'LONG', entryPrice:0, exitPrice:0, quantity:0, profitLoss:300, strategy:'', emotion:'NEUTRAL', note:'' }
]);
const trades4 = useTradeStore.getState().trades;
report('tc4', trades4, { balance: 400, winRate: 66.7 }, { balance:getRunningBalance(trades4).slice(-1)[0].cumulative, winRate:getWinRate(trades4) });

// TC5
reset();
try {
  useTradeStore.getState().addTrade({ symbol: 'T5A', type: 'LONG', entryPrice: 100, exitPrice: 120, quantity: 1, strategy: 'S', emotion: 'NEUTRAL', note: '' });
  useTradeStore.getState().addTrade({ symbol: 'T5B', type: 'LONG', entryPrice: 100, exitPrice: 110, quantity: 1, strategy: 'S', emotion: 'NEUTRAL', note: '' });
  const daily = getDailyPL(useTradeStore.getState().trades);
  report('tc5', null, { dailyPnL: 30 }, { dailyPnL: daily.reduce((acc, d) => acc + d.profitLoss, 0) });
} catch (err) {
  report('tc5', null, 'no error', err?.message || err);
}

// TC6
reset();
setTrades([
  { id:'1', timestamp: '2026-01-01T00:00:00Z', symbol:'a', type:'LONG', entryPrice:0, exitPrice:0, quantity:0, profitLoss:500, strategy:'', emotion:'NEUTRAL', note:'' },
  { id:'2', timestamp: '2026-01-02T00:00:00Z', symbol:'b', type:'LONG', entryPrice:0, exitPrice:0, quantity:0, profitLoss:-200, strategy:'', emotion:'NEUTRAL', note:'' },
  { id:'3', timestamp: '2026-01-03T00:00:00Z', symbol:'c', type:'LONG', entryPrice:0, exitPrice:0, quantity:0, profitLoss:400, strategy:'', emotion:'NEUTRAL', note:'' },
  { id:'4', timestamp: '2026-01-04T00:00:00Z', symbol:'d', type:'LONG', entryPrice:0, exitPrice:0, quantity:0, profitLoss:-300, strategy:'', emotion:'NEUTRAL', note:'' }
]);
const dd6 = getDrawdown(getRunningBalance(useTradeStore.getState().trades));
report('tc6', null, { maxDrawdown: 300 }, { maxDrawdown: dd6 });

// TC7
reset();
let err7 = null;
try {
  useTradeStore.getState().addTrade({ symbol: 'T7', type: 'LONG', entryPrice: 0, exitPrice: 100, quantity: 10, strategy: 'S', emotion: 'NEUTRAL', note: '' });
} catch (err) {
  err7 = err;
}
report('tc7', {entryPrice:0,exitPrice:100,quantity:10}, {rejected:true}, {rejected: Boolean(err7)});

// TC8 UI data (approx)
reset();
useTradeStore.getState().addTrade({ symbol: 'T8', type: 'LONG', entryPrice: 100, exitPrice: 110, quantity: 10, strategy: 'S', emotion: 'NEUTRAL', note: '' });
const trades8 = useTradeStore.getState().trades;
report('tc8', null, { tradesCount: 1, pnl: 100 }, { tradesCount: trades8.length, pnl: trades8[0].profitLoss });

console.log('All test cases executed.');
