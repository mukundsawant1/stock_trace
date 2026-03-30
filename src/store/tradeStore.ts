import { create } from 'zustand';
import type { Trade } from '../types';
import { v4 as uuidv4 } from 'uuid';

type TradeState = {
  trades: Trade[];
  loading: boolean;
  selected: Trade | null;
  filterSymbol: string;
  filterStrategy: string;
  filterType: 'ALL' | 'LONG' | 'SHORT';
  setFilterSymbol: (symbol: string) => void;
  setFilterStrategy: (strategy: string) => void;
  setFilterType: (type: 'ALL' | 'LONG' | 'SHORT') => void;
  loadTrades: () => Promise<void>;
  saveTrades: () => Promise<void>;
  addTrade: (trade: Omit<Trade, 'id' | 'profitLoss' | 'timestamp'>) => void;
  updateTrade: (trade: Trade) => void;
  deleteTrade: (id: string) => void;
  selectTrade: (trade: Trade | null) => void;
};

const computePnL = (trade: Omit<Trade, 'id' | 'profitLoss' | 'timestamp'>) => {
  if (trade.entryPrice <= 0 || trade.exitPrice <= 0 || trade.quantity <= 0) {
    throw new Error('Invalid trade input');
  }

  let profitLoss = (trade.exitPrice - trade.entryPrice) * trade.quantity;
  if (trade.type === 'SHORT') {
    profitLoss *= -1;
  }
  return Number(profitLoss.toFixed(2));
};

export const useTradeStore = create<TradeState>((set, get) => ({
  trades: [],
  loading: false,
  selected: null,
  filterSymbol: '',
  filterStrategy: '',
  filterType: 'ALL',

  setFilterSymbol: (symbol) => set({ filterSymbol: symbol }),
  setFilterStrategy: (strategy) => set({ filterStrategy: strategy }),
  setFilterType: (type) => set({ filterType: type }),

  loadTrades: async () => {
    set({ loading: true });
    let trades: Trade[] = [];

    if (window.tradeSage?.loadTrades) {
      try {
        trades = await window.tradeSage.loadTrades();
      } catch (error) {
        console.error('loadTrades failed', error);
      }
    } else {
      const raw = localStorage.getItem('trade_sage_trades');
      if (raw) trades = JSON.parse(raw);
    }

    set({ trades, loading: false });
  },

  saveTrades: async () => {
    const { trades } = get();
    if (typeof window !== 'undefined' && window.tradeSage?.saveTrades) {
      try {
        await window.tradeSage.saveTrades(trades);
      } catch (error) {
        console.error('saveTrades failed', error);
      }
    } else if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('trade_sage_trades', JSON.stringify(trades));
    } else {
      console.log('saveTrades skipped: no window environment');
    }
  },

  addTrade: (newTrade) => {
    const now = new Date().toISOString();
    const trade: Trade = {
      id: uuidv4(),
      timestamp: now,
      profitLoss: computePnL(newTrade),
      ...newTrade
    };

    set((state) => ({
      trades: [...state.trades, trade].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      selected: null
    }));

    console.log('Trades: add', trade);
    get().saveTrades();
  },

  updateTrade: (trade) => {
    const profitLoss = computePnL(trade);
    set((state) => {
      const updated = state.trades.map((t) => (t.id === trade.id ? { ...trade, profitLoss } : t));
      return {
        trades: updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        selected: null
      };
    });
    console.log('Trades: update', { ...trade, profitLoss });
    get().saveTrades();
  },

  deleteTrade: (id) => {
    set((state) => {
      const filtered = state.trades.filter((trade) => trade.id !== id);
      return { trades: filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) };
    });
    console.log('Trades: delete', { id });
    get().saveTrades();
  },

  selectTrade: (trade) => set({ selected: trade })
}));
