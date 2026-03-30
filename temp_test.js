const trades=[
  {timestamp:'2026-03-30T09:00:00.000Z',type:'LONG',entryPrice:100,exitPrice:110,quantity:3},
  {timestamp:'2026-03-30T10:00:00.000Z',type:'SHORT',entryPrice:200,exitPrice:100,quantity:36},
  {timestamp:'2026-03-30T11:00:00.000Z',type:'LONG',entryPrice:100,exitPrice:110,quantity:3},
  {timestamp:'2026-03-30T12:00:00.000Z',type:'SHORT',entryPrice:200,exitPrice:100,quantity:36},
  {timestamp:'2026-03-30T13:00:00.000Z',type:'LONG',entryPrice:100,exitPrice:110,quantity:3},
  {timestamp:'2026-03-30T14:00:00.000Z',type:'SHORT',entryPrice:100,exitPrice:0,quantity:18}
];
const computeTradePnL=t=>{const raw=(t.exitPrice-t.entryPrice)*t.quantity;return t.type==='SHORT'?-raw:raw};
const normalized=trades.map(t=>({...t,pnl:computeTradePnL(t),time:new Date(t.timestamp).getTime()})).sort((a,b)=>a.time-b.time);
let balance=0; const equity=[];
if(normalized.length) equity.push({time:normalized[0].time-1,balance:0});
normalized.forEach(t=>{balance+=t.pnl; equity.push({time:t.time,balance});});
const daily={}; normalized.forEach(t=>{const day=new Date(t.time).toISOString().slice(0,10); daily[day]=(daily[day]||0)+t.pnl;});
const totalProfit=normalized.filter(t=>t.pnl>0).reduce((s,t)=>s+t.pnl,0);
const totalLoss=Math.abs(normalized.filter(t=>t.pnl<0).reduce((s,t)=>s+t.pnl,0));
const wins=normalized.filter(t=>t.pnl>0).length;
const losses=normalized.filter(t=>t.pnl<0).length;
console.log('equity',equity.map(o=>o.balance));
console.log('daily',daily);
console.log('totalProfit',totalProfit,'totalLoss',totalLoss,'avgWin',wins?totalProfit/wins:0,'avgLoss',losses?totalLoss/losses:0,'PF',totalLoss===0?null:totalProfit/totalLoss);
