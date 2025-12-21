import { create } from 'zustand';
import { Asset, Order, PriceData, OHLCData, User } from '../types';

interface TradingStore {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Assets
  selectedAsset: Asset | null;
  assets: Asset[];

  // Pricing
  currentPrice: number | null;
  priceHistory: PriceData[];
  ohlcData: OHLCData[];

  // Trading
  balance: number;
  orders: Order[];
  activeOrders: Order[];

  // UI State
  isLoading: boolean;
  isConnected: boolean;
  lastUpdate: Date | null;

  // Actions
  setUser: (user: User | null, token: string | null) => void;
  logout: () => void;
  setSelectedAsset: (asset: Asset | null) => void;
  setAssets: (assets: Asset[]) => void;
  setCurrentPrice: (price: number) => void;
  setBalance: (balance: number) => void;
  setOrders: (orders: Order[]) => void;
  addPriceToHistory: (price: PriceData) => void;
  setOHLCData: (data: OHLCData[]) => void;
  addOHLCData: (data: OHLCData) => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  updateLastUpdate: () => void;
}

const loadUserFromStorage = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const useTradingStore = create<TradingStore>((set, get) => ({
  // Initial state
  user: loadUserFromStorage(),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  selectedAsset: null,
  assets: [],
  currentPrice: null,
  priceHistory: [],
  ohlcData: [],
  balance: 0,
  orders: [],
  activeOrders: [],
  isLoading: false,
  isConnected: false,
  lastUpdate: null,

  // Actions
  setUser: (user, token) => {
    if (user && token) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true });
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      orders: [],
      activeOrders: [],
      balance: 0,
    });
  },

  setSelectedAsset: (asset) => set({ selectedAsset: asset }),

  setAssets: (assets) => set({ assets }),

  setCurrentPrice: (price) => {
    set({ currentPrice: price });
    get().updateLastUpdate();
  },

  setBalance: (balance) => set({ balance }),

  setOrders: (orders) => {
    const activeOrders = orders.filter(o => o.status === 'ACTIVE');
    set({ orders, activeOrders });
  },

  addPriceToHistory: (price) =>
    set((state) => ({
      priceHistory: [...state.priceHistory.slice(-999), price],
    })),

  setOHLCData: (data) => set({ ohlcData: data }),

  addOHLCData: (data) =>
    set((state) => ({
      ohlcData: [...state.ohlcData.slice(-999), data],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setConnected: (connected) => set({ isConnected: connected }),

  updateLastUpdate: () => set({ lastUpdate: new Date() }),
}));