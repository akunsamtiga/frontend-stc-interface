import { database, ref, onValue, off } from '../config/firebase';
import { FirebasePriceData, OHLCData } from '../types';

// ✅ Utility functions
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastResult: any;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
    return lastResult;
  };
}

class FirebaseService {
  private listeners: Map<string, any> = new Map();
  private priceCache: Map<string, FirebasePriceData> = new Map();
  private ohlcCache: Map<string, OHLCData[]> = new Map();
  private lastPriceUpdate: Map<string, number> = new Map();
  private lastOHLCUpdate: Map<string, number> = new Map();
  
  // ✅ INCREASED intervals untuk mengurangi load
  private readonly CACHE_DURATION = 2000; // 2 detik (naik dari 1 detik)
  private readonly PRICE_UPDATE_THROTTLE = 500; // Max 2 updates/detik (turun dari 10/detik)
  private readonly OHLC_UPDATE_DEBOUNCE = 1000; // 1 detik (naik dari 500ms)
  private readonly MIN_PRICE_CHANGE = 0.001; // Minimal perubahan harga untuk update

  // ✅ Subscribe to price dengan throttling LEBIH KETAT
  subscribeToPrice(
    assetSymbol: string,
    callback: (data: FirebasePriceData) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/current_price`;
    const priceRef = ref(database, path);

    // ✅ Throttled callback dengan minimum change detection
    const throttledCallback = throttle((data: FirebasePriceData) => {
      const cached = this.priceCache.get(assetSymbol);
      const lastUpdate = this.lastPriceUpdate.get(assetSymbol) || 0;
      const now = Date.now();

      // Skip jika dalam cache duration DAN harga tidak berubah signifikan
      if (cached && (now - lastUpdate) < this.CACHE_DURATION) {
        const priceChange = Math.abs(data.price - cached.price);
        if (priceChange < this.MIN_PRICE_CHANGE) {
          return; // Skip update jika perubahan terlalu kecil
        }
      }

      // Update cache
      this.priceCache.set(assetSymbol, data);
      this.lastPriceUpdate.set(assetSymbol, now);
      
      callback(data);
    }, this.PRICE_UPDATE_THROTTLE);

    const unsubscribe = onValue(priceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        throttledCallback(data);
      }
    }, (error) => {
      console.error(`Price subscription error for ${assetSymbol}:`, error);
    });

    this.listeners.set(path, priceRef);

    return () => {
      off(priceRef);
      this.listeners.delete(path);
      this.priceCache.delete(assetSymbol);
      this.lastPriceUpdate.delete(assetSymbol);
    };
  }

  // ✅ Subscribe to OHLC dengan debouncing LEBIH LAMA
  subscribeToOHLC(
    assetSymbol: string,
    callback: (data: OHLCData[]) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/ohlc`;
    const ohlcRef = ref(database, path);

    // ✅ Debounced callback dengan change detection
    const debouncedCallback = debounce((data: OHLCData[]) => {
      const cached = this.ohlcCache.get(assetSymbol);
      const lastUpdate = this.lastOHLCUpdate.get(assetSymbol) || 0;
      const now = Date.now();

      // Skip jika baru saja update (dalam 1 detik terakhir)
      if ((now - lastUpdate) < 1000) {
        return;
      }

      // Check if data actually changed
      if (cached && cached.length === data.length) {
        const lastCached = cached[cached.length - 1];
        const lastNew = data[data.length - 1];
        
        // Skip jika candle terakhir sama
        if (lastCached?.timestamp === lastNew?.timestamp && 
            lastCached?.close === lastNew?.close) {
          return;
        }
      }

      // Update cache
      this.ohlcCache.set(assetSymbol, data);
      this.lastOHLCUpdate.set(assetSymbol, now);
      callback(data);
    }, this.OHLC_UPDATE_DEBOUNCE);

    const unsubscribe = onValue(ohlcRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // ✅ Process efficiently - LIMIT to 500 (turun dari 1000)
        const ohlcArray = Object.keys(data)
          .map(key => data[key])
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-500); // Keep last 500 only
        
        debouncedCallback(ohlcArray);
      }
    }, (error) => {
      console.error(`OHLC subscription error for ${assetSymbol}:`, error);
    });

    this.listeners.set(path, ohlcRef);

    return () => {
      off(ohlcRef);
      this.listeners.delete(path);
      this.ohlcCache.delete(assetSymbol);
      this.lastOHLCUpdate.delete(assetSymbol);
    };
  }

  // ✅ Get historical OHLC dengan caching
  async getHistoricalOHLC(
    assetSymbol: string,
    limit: number = 100
  ): Promise<OHLCData[]> {
    // Check cache first
    const cached = this.ohlcCache.get(assetSymbol);
    if (cached && cached.length >= limit) {
      return cached.slice(-limit);
    }

    return new Promise((resolve, reject) => {
      const path = `/${assetSymbol.toLowerCase()}/ohlc`;
      const ohlcRef = ref(database, path);

      // ✅ One-time read with timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('Historical OHLC fetch timeout'));
      }, 5000);

      onValue(ohlcRef, (snapshot) => {
        clearTimeout(timeoutId);
        const data = snapshot.val();
        if (data) {
          const ohlcArray = Object.keys(data)
            .map(key => data[key])
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-limit);
          
          // Cache the result
          this.ohlcCache.set(assetSymbol, ohlcArray);
          resolve(ohlcArray);
        } else {
          resolve([]);
        }
      }, { onlyOnce: true });
    });
  }

  // ✅ Clear cache manually
  clearCache(assetSymbol?: string) {
    if (assetSymbol) {
      this.priceCache.delete(assetSymbol);
      this.ohlcCache.delete(assetSymbol);
      this.lastPriceUpdate.delete(assetSymbol);
      this.lastOHLCUpdate.delete(assetSymbol);
    } else {
      this.priceCache.clear();
      this.ohlcCache.clear();
      this.lastPriceUpdate.clear();
      this.lastOHLCUpdate.clear();
    }
  }

  // ✅ Unsubscribe all dengan cleanup
  unsubscribeAll() {
    this.listeners.forEach((ref) => off(ref));
    this.listeners.clear();
    this.clearCache();
  }

  // ✅ Get cache stats untuk debugging
  getCacheStats() {
    return {
      priceCache: this.priceCache.size,
      ohlcCache: this.ohlcCache.size,
      listeners: this.listeners.size
    };
  }
}

export const firebaseService = new FirebaseService();