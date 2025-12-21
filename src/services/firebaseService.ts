import { database, ref, onValue, off } from '../config/firebase';
import { FirebasePriceData, OHLCData } from '../types';

// ✅ Debounce utility untuk mencegah terlalu banyak updates
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

// ✅ Throttle utility untuk limit frequency
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

class FirebaseService {
  private listeners: Map<string, any> = new Map();
  private priceCache: Map<string, FirebasePriceData> = new Map();
  private ohlcCache: Map<string, OHLCData[]> = new Map();
  private lastPriceUpdate: Map<string, number> = new Map();
  
  // ✅ Cache duration (1 second)
  private readonly CACHE_DURATION = 1000;
  
  // ✅ Throttle/debounce settings
  private readonly PRICE_UPDATE_THROTTLE = 100; // Max 10 updates/second
  private readonly OHLC_UPDATE_DEBOUNCE = 500;  // Wait 500ms before processing

  // ✅ Subscribe to price dengan throttling
  subscribeToPrice(
    assetSymbol: string,
    callback: (data: FirebasePriceData) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/current_price`;
    const priceRef = ref(database, path);

    // ✅ Throttled callback untuk limit updates
    const throttledCallback = throttle((data: FirebasePriceData) => {
      // Check cache
      const cached = this.priceCache.get(assetSymbol);
      const lastUpdate = this.lastPriceUpdate.get(assetSymbol) || 0;
      const now = Date.now();

      // Skip if same price and within cache duration
      if (cached && cached.price === data.price && (now - lastUpdate) < this.CACHE_DURATION) {
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

  // ✅ Subscribe to OHLC dengan debouncing dan batching
  subscribeToOHLC(
    assetSymbol: string,
    callback: (data: OHLCData[]) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/ohlc`;
    const ohlcRef = ref(database, path);

    // ✅ Debounced callback untuk batch updates
    const debouncedCallback = debounce((data: OHLCData[]) => {
      // Check if data actually changed
      const cached = this.ohlcCache.get(assetSymbol);
      if (cached && cached.length === data.length) {
        const lastCached = cached[cached.length - 1];
        const lastNew = data[data.length - 1];
        
        // Skip if last candle is same
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
        // ✅ Process data efficiently
        const ohlcArray = Object.keys(data)
          .map(key => data[key])
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-1000); // Keep last 1000 only
        
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

  // ✅ Get historical OHLC with caching
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

      // ✅ Use once() for one-time read
      onValue(ohlcRef, (snapshot) => {
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

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Historical OHLC fetch timeout'));
      }, 5000);
    });
  }

  // ✅ Clear cache manually
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