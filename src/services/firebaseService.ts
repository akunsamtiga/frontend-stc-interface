import { database, ref, onValue, off } from '../config/firebase';
import { FirebasePriceData, OHLCData } from '../types';

class FirebaseService {
  private listeners: Map<string, any> = new Map();
  private priceBuffer: FirebasePriceData | null = null;
  private priceUpdateTimer: NodeJS.Timeout | null = null;
  private lastPriceUpdate: number = 0;
  private readonly PRICE_THROTTLE_MS = 100; // Update max setiap 100ms
  private readonly OHLC_THROTTLE_MS = 500; // Update max setiap 500ms
  private ohlcUpdateTimer: NodeJS.Timeout | null = null;
  private ohlcBuffer: OHLCData[] | null = null;

  /**
   * Subscribe to price updates with throttling
   * Mencegah update terlalu sering yang bikin patah-patah
   */
  subscribeToPrice(
    assetSymbol: string,
    callback: (data: FirebasePriceData) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/current_price`;
    const priceRef = ref(database, path);

    const throttledCallback = (data: FirebasePriceData) => {
      const now = Date.now();
      
      // Buffer data
      this.priceBuffer = data;

      // Throttle updates - hanya update jika sudah lewat threshold
      if (now - this.lastPriceUpdate >= this.PRICE_THROTTLE_MS) {
        callback(data);
        this.lastPriceUpdate = now;
        this.priceBuffer = null;
      } else {
        // Schedule delayed update untuk data yang di-buffer
        if (this.priceUpdateTimer) {
          clearTimeout(this.priceUpdateTimer);
        }
        
        this.priceUpdateTimer = setTimeout(() => {
          if (this.priceBuffer) {
            callback(this.priceBuffer);
            this.lastPriceUpdate = Date.now();
            this.priceBuffer = null;
          }
        }, this.PRICE_THROTTLE_MS - (now - this.lastPriceUpdate));
      }
    };

    const unsubscribe = onValue(priceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        throttledCallback(data);
      }
    }, (error) => {
      console.error('Firebase price subscription error:', error);
    });

    this.listeners.set(path, priceRef);

    return () => {
      if (this.priceUpdateTimer) {
        clearTimeout(this.priceUpdateTimer);
      }
      off(priceRef);
      this.listeners.delete(path);
    };
  }

  /**
   * Subscribe to OHLC with throttling and batching
   * Mencegah chart update terlalu sering
   */
  subscribeToOHLC(
    assetSymbol: string,
    callback: (data: OHLCData[]) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/ohlc`;
    const ohlcRef = ref(database, path);

    const throttledCallback = (data: OHLCData[]) => {
      this.ohlcBuffer = data;

      // Clear existing timer
      if (this.ohlcUpdateTimer) {
        clearTimeout(this.ohlcUpdateTimer);
      }

      // Schedule update dengan throttle
      this.ohlcUpdateTimer = setTimeout(() => {
        if (this.ohlcBuffer) {
          callback(this.ohlcBuffer);
          this.ohlcBuffer = null;
        }
      }, this.OHLC_THROTTLE_MS);
    };

    const unsubscribe = onValue(ohlcRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Sort dan limit data untuk performa
        const ohlcArray = Object.keys(data)
          .map(key => data[key])
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-500); // Hanya ambil 500 candle terakhir (reduce dari 1000)
        
        throttledCallback(ohlcArray);
      }
    }, (error) => {
      console.error('Firebase OHLC subscription error:', error);
    });

    this.listeners.set(path, ohlcRef);

    return () => {
      if (this.ohlcUpdateTimer) {
        clearTimeout(this.ohlcUpdateTimer);
      }
      off(ohlcRef);
      this.listeners.delete(path);
    };
  }

  /**
   * Get historical OHLC - optimized with limit
   */
  async getHistoricalOHLC(
    assetSymbol: string,
    limit: number = 100
  ): Promise<OHLCData[]> {
    return new Promise((resolve, reject) => {
      const path = `/${assetSymbol.toLowerCase()}/ohlc`;
      const ohlcRef = ref(database, path);

      // Set timeout untuk prevent hanging
      const timeout = setTimeout(() => {
        off(ohlcRef);
        reject(new Error('Historical data fetch timeout'));
      }, 10000); // 10 second timeout

      onValue(ohlcRef, (snapshot) => {
        clearTimeout(timeout);
        const data = snapshot.val();
        
        if (data) {
          const ohlcArray = Object.keys(data)
            .map(key => data[key])
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-limit);
          
          resolve(ohlcArray);
        } else {
          resolve([]);
        }
      }, {
        onlyOnce: true
      });
    });
  }

  /**
   * Cleanup all subscriptions
   */
  unsubscribeAll() {
    // Clear all timers
    if (this.priceUpdateTimer) {
      clearTimeout(this.priceUpdateTimer);
      this.priceUpdateTimer = null;
    }
    if (this.ohlcUpdateTimer) {
      clearTimeout(this.ohlcUpdateTimer);
      this.ohlcUpdateTimer = null;
    }

    // Clear buffers
    this.priceBuffer = null;
    this.ohlcBuffer = null;

    // Unsubscribe all listeners
    this.listeners.forEach((ref) => off(ref));
    this.listeners.clear();
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.listeners.size > 0;
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.listeners.size;
  }
}

export const firebaseService = new FirebaseService();