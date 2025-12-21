import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
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

  // Actions dengan optimization
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

  setSelectedAsset: (asset) => {
    const currentAsset = get().selectedAsset;
    // Hanya update jika benar-benar berubah
    if (currentAsset?.id !== asset?.id) {
      set({ selectedAsset: asset });
    }
  },

  setAssets: (assets) => {
    // Shallow comparison untuk prevent unnecessary updates
    const currentAssets = get().assets;
    if (JSON.stringify(currentAssets) !== JSON.stringify(assets)) {
      set({ assets });
    }
  },

  setCurrentPrice: (price) => {
    const currentPrice = get().currentPrice;
    // Hanya update jika harga benar-benar berubah (dengan threshold)
    if (currentPrice === null || Math.abs(currentPrice - price) >= 0.001) {
      set({ currentPrice: price, lastUpdate: new Date() });
    }
  },

  setBalance: (balance) => {
    const currentBalance = get().balance;
    // Hanya update jika balance berubah
    if (currentBalance !== balance) {
      set({ balance });
    }
  },

  setOrders: (orders) => {
    // Filter active orders
    const activeOrders = orders.filter(o => o.status === 'ACTIVE');
    
    // Hanya update jika ada perubahan
    const currentOrders = get().orders;
    const currentActive = get().activeOrders;
    
    if (
      orders.length !== currentOrders.length ||
      activeOrders.length !== currentActive.length ||
      JSON.stringify(orders.map(o => o.id)) !== JSON.stringify(currentOrders.map(o => o.id))
    ) {
      set({ orders, activeOrders });
    }
  },

  addPriceToHistory: (price) => {
    set((state) => {
      const history = state.priceHistory;
      const lastPrice = history[history.length - 1];
      
      // Skip jika price sama dengan yang terakhir
      if (lastPrice && lastPrice.price === price.price) {
        return state;
      }
      
      // Keep last 500 points (reduce dari 1000)
      return {
        priceHistory: [...history.slice(-499), price],
      };
    });
  },

  setOHLCData: (data) => {
    const currentData = get().ohlcData;
    
    // Skip jika data length sama dan timestamp terakhir sama
    if (
      data.length === currentData.length &&
      data.length > 0 &&
      currentData.length > 0 &&
      data[data.length - 1].timestamp === currentData[currentData.length - 1].timestamp
    ) {
      return;
    }
    
    set({ ohlcData: data });
  },

  addOHLCData: (data) => {
    set((state) => {
      const currentData = state.ohlcData;
      const lastCandle = currentData[currentData.length - 1];
      
      // Skip jika sama dengan candle terakhir
      if (lastCandle && lastCandle.timestamp === data.timestamp) {
        return state;
      }
      
      // Keep last 500 candles
      return {
        ohlcData: [...currentData.slice(-499), data],
      };
    });
  },

  setLoading: (loading) => {
    const currentLoading = get().isLoading;
    if (currentLoading !== loading) {
      set({ isLoading: loading });
    }
  },

  setConnected: (connected) => {
    const currentConnected = get().isConnected;
    if (currentConnected !== connected) {
      set({ isConnected: connected });
    }
  },

  updateLastUpdate: () => {
    set({ lastUpdate: new Date() });
  },
}));

// Export selectors dengan shallow comparison untuk better performance
export const useCurrentPrice = () => useTradingStore((state) => state.currentPrice);
export const useBalance = () => useTradingStore((state) => state.balance);
export const useOrders = () => useTradingStore((state) => state.orders, shallow);
export const useActiveOrders = () => useTradingStore((state) => state.activeOrders, shallow);
export const useOHLCData = () => useTradingStore((state) => state.ohlcData, shallow);
export const useIsConnected = () => useTradingStore((state) => state.isConnected);
export const useSelectedAsset = () => useTradingStore((state) => state.selectedAsset, shallow);