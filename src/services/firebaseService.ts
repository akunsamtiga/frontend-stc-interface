import { database, ref, onValue, off } from '../config/firebase';
import { FirebasePriceData, OHLCData } from '../types';

// ✅ SUPER AGGRESSIVE throttle & debounce untuk performa maksimal
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

class FirebaseService {
  private listeners: Map<string, any> = new Map();
  private priceCache: Map<string, FirebasePriceData> = new Map();
  private ohlcCache: Map<string, OHLCData[]> = new Map();
  private lastPriceUpdate: Map<string, number> = new Map();
  
  // ✅ INCREASED cache duration untuk reduce updates
  private readonly CACHE_DURATION = 2000; // 2 detik (dari 1 detik)
  
  // ✅ MUCH MORE AGGRESSIVE throttling
  private readonly PRICE_UPDATE_THROTTLE = 500; // Max 2 updates/second (dari 10)
  private readonly OHLC_UPDATE_DEBOUNCE = 2000;  // Wait 2s (dari 500ms)

  // ✅ Price subscription dengan SUPER AGGRESSIVE throttling
  subscribeToPrice(
    assetSymbol: string,
    callback: (data: FirebasePriceData) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/current_price`;
    const priceRef = ref(database, path);

    // ✅ SUPER throttled callback - hanya 2 updates per detik
    const throttledCallback = throttle((data: FirebasePriceData) => {
      const cached = this.priceCache.get(assetSymbol);
      const lastUpdate = this.lastPriceUpdate.get(assetSymbol) || 0;
      const now = Date.now();

      // ✅ Skip jika price sama DAN masih dalam cache duration
      if (cached && cached.price === data.price && (now - lastUpdate) < this.CACHE_DURATION) {
        return;
      }

      // ✅ Skip jika perubahan price sangat kecil (< 0.001)
      if (cached && Math.abs(cached.price - data.price) < 0.001) {
        return;
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

  // ✅ OHLC subscription dengan HEAVY debouncing dan batching
  subscribeToOHLC(
    assetSymbol: string,
    callback: (data: OHLCData[]) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/ohlc`;
    const ohlcRef = ref(database, path);

    // ✅ HEAVILY debounced callback - wait 2 detik
    const debouncedCallback = debounce((data: OHLCData[]) => {
      const cached = this.ohlcCache.get(assetSymbol);
      
      // ✅ Skip jika data belum berubah signifikan
      if (cached && cached.length === data.length) {
        const lastCached = cached[cached.length - 1];
        const lastNew = data[data.length - 1];
        
        if (lastCached?.timestamp === lastNew?.timestamp && 
            lastCached?.close === lastNew?.close) {
          return;
        }
      }

      // Update cache
      this.ohlcCache.set(assetSymbol, data);
      callback(data);
    }, this.OHLC_UPDATE_DEBOUNCE);

    const unsubscribe = onValue(ohlcRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // ✅ Optimized processing - ambil hanya last 500 (bukan 1000)
        const ohlcArray = Object.keys(data)
          .map(key => data[key])
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-500); // Reduced dari 1000
        
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
    };
  }

  // ✅ Get historical dengan aggressive caching
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

      const timeout = setTimeout(() => {
        reject(new Error('Historical OHLC fetch timeout'));
      }, 5000);

      onValue(ohlcRef, (snapshot) => {
        clearTimeout(timeout);
        const data = snapshot.val();
        if (data) {
          const ohlcArray = Object.keys(data)
            .map(key => data[key])
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-limit);
          
          this.ohlcCache.set(assetSymbol, ohlcArray);
          resolve(ohlcArray);
        } else {
          resolve([]);
        }
      }, { onlyOnce: true });
    });
  }

  clearCache(assetSymbol?: string) {
    if (assetSymbol) {
      this.priceCache.delete(assetSymbol);
      this.ohlcCache.delete(assetSymbol);
      this.lastPriceUpdate.delete(assetSymbol);
    } else {
      this.priceCache.clear();
      this.ohlcCache.clear();
      this.lastPriceUpdate.clear();
    }
  }

  unsubscribeAll() {
    this.listeners.forEach((ref) => off(ref));
    this.listeners.clear();
    this.clearCache();
  }

  getCacheStats() {
    return {
      priceCache: this.priceCache.size,
      ohlcCache: this.ohlcCache.size,
      listeners: this.listeners.size
    };
  }
}

export const firebaseService = new FirebaseService();