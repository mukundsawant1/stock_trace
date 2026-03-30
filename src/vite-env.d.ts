/// <reference types="vite/client" />

declare global {
  interface TradeSageAPI {
    loadTrades: () => Promise<Trade[]>;
    saveTrades: (trades: Trade[]) => Promise<Trade[]>;
  }

  interface Window {
    tradeSage: TradeSageAPI;
  }
}

export {};
