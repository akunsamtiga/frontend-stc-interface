import { database, ref, onValue, off } from '../config/firebase';
import { FirebasePriceData, OHLCData } from '../types';

class FirebaseService {
  private listeners: Map<string, any> = new Map();

  subscribeToPrice(
    assetSymbol: string,
    callback: (data: FirebasePriceData) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/current_price`;
    const priceRef = ref(database, path);

    const unsubscribe = onValue(priceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });

    this.listeners.set(path, priceRef);

    return () => {
      off(priceRef);
      this.listeners.delete(path);
    };
  }

  subscribeToOHLC(
    assetSymbol: string,
    callback: (data: OHLCData[]) => void
  ): () => void {
    const path = `/${assetSymbol.toLowerCase()}/ohlc`;
    const ohlcRef = ref(database, path);

    const unsubscribe = onValue(ohlcRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // FIX: Sort ASCENDING by timestamp for charts
        const ohlcArray = Object.keys(data)
          .map(key => data[key])
          .sort((a, b) => a.timestamp - b.timestamp) // ASC for charts
          .slice(-1000); // Keep last 1000 candles
        
        callback(ohlcArray);
      }
    });

    this.listeners.set(path, ohlcRef);

    return () => {
      off(ohlcRef);
      this.listeners.delete(path);
    };
  }

  async getHistoricalOHLC(
    assetSymbol: string,
    limit: number = 100
  ): Promise<OHLCData[]> {
    return new Promise((resolve) => {
      const path = `/${assetSymbol.toLowerCase()}/ohlc`;
      const ohlcRef = ref(database, path);

      onValue(ohlcRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // FIX: Return data sorted ASCENDING by timestamp
          const ohlcArray = Object.keys(data)
            .map(key => data[key])
            .sort((a, b) => a.timestamp - b.timestamp) // ASC
            .slice(-limit); // Get last N candles
          
          resolve(ohlcArray);
        } else {
          resolve([]);
        }
      }, { onlyOnce: true });
    });
  }

  unsubscribeAll() {
    this.listeners.forEach((ref) => off(ref));
    this.listeners.clear();
  }
}

export const firebaseService = new FirebaseService();