export type TradeType = 'LONG' | 'SHORT';
export type Emotion = 'CONFIDENT' | 'FEAR' | 'GREED' | 'NEUTRAL';

export type Trade = {
  id: string;
  timestamp: string;
  symbol: string;
  type: TradeType;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  profitLoss: number;
  strategy: string;
  emotion: Emotion;
  note: string;
};
