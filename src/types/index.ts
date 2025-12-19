export interface User {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  isActive: boolean;
  balance?: number;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  profitRate: number;
  isActive: boolean;
  description?: string;
}

export interface PriceData {
  price: number;
  timestamp: number;
  datetime: string;
  datetime_iso?: string;
  change?: number;
}

export interface OHLCData {
  timestamp: number;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Order {
  id: string;
  asset_id: string;
  asset_name: string;
  direction: 'CALL' | 'PUT';
  amount: number;
  duration: number;
  entry_price: number;
  entry_time: string;
  exit_price: number | null;
  exit_time: string | null;
  status: 'PENDING' | 'ACTIVE' | 'WON' | 'LOST' | 'DRAW';
  profit: number | null;
  profitRate: number;
  remainingTime?: number;
}

export interface FirebasePriceData {
  price: number;
  timestamp: number;
  datetime: string;
  datetime_iso: string;
  change: number;
  timezone: string;
}

export interface FirebaseOHLCData {
  [timestamp: string]: OHLCData;
}

export interface TradingStats {
  total_bars: number;
  last_update: string;
  initial_price: number;
  current_price: number;
  highest_price: number;
  lowest_price: number;
  total_volume: number;
}
