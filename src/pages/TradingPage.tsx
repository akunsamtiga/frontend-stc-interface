import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTradingStore } from '../stores/tradingStore';
import { tradingService } from '../services/tradingService';
import { firebaseService } from '../services/firebaseService';
import { TradingChart } from '../components/charts/TradingChart';
import { PriceTicker } from '../components/trading/PriceTicker';
import { OrderPanel } from '../components/trading/OrderPanel';
import { OrderBook } from '../components/trading/OrderBook';
import { MobileNavbar } from '../components/common/MobileNavbar';
import { MobileOrderPanel } from '../components/trading/MobileOrderPanel';
import { formatCurrency } from '../utils/format';
import { Wallet, RefreshCw, LogOut, AlertCircle, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const TradingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    selectedAsset,
    assets,
    currentPrice,
    balance,
    orders,
    activeOrders,
    ohlcData,
    isConnected,
    lastUpdate,
    setAssets,
    setSelectedAsset,
    setCurrentPrice,
    setBalance,
    setOrders,
    setOHLCData,
    setConnected,
    logout,
  } = useTradingStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOrderBook, setShowOrderBook] = useState(false);

  // ✅ Memoized expensive calculations
  const totalProfit = useMemo(() => {
    return orders
      .filter(o => o.profit !== null)
      .reduce((sum, o) => sum + (o.profit || 0), 0);
  }, [orders]);

  // ✅ useCallback untuk prevent re-creation
  const initializeTrading = useCallback(async () => {
    try {
      setError(null);
      
      const [assetsData, balanceData] = await Promise.all([
        tradingService.getAssets(),
        tradingService.getBalance(),
      ]);

      setAssets(assetsData.assets);
      setBalance(balanceData.balance);

      if (assetsData.assets.length > 0) {
        setSelectedAsset(assetsData.assets[0]);
      } else {
        setError('No assets available');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to initialize';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setAssets, setBalance, setSelectedAsset]);

  // ✅ useCallback untuk Firebase listeners
  const setupFirebaseListeners = useCallback(() => {
    if (!selectedAsset) return;

    try {
      const symbol = selectedAsset.symbol.replace('/', '_');

      // ✅ Price subscription dengan throttling
      const unsubscribePrice = firebaseService.subscribeToPrice(
        symbol,
        (priceData) => {
          setCurrentPrice(priceData.price);
          setConnected(true);
          setError(null);
        }
      );

      // ✅ OHLC subscription dengan debouncing
      const unsubscribeOHLC = firebaseService.subscribeToOHLC(
        symbol,
        (ohlcArray) => {
          setOHLCData(ohlcArray);
        }
      );

      // Load historical data
      loadHistoricalData(symbol);

      return () => {
        unsubscribePrice();
        unsubscribeOHLC();
      };
    } catch (error: any) {
      toast.error('Failed to connect to price feed');
      setConnected(false);
    }
  }, [selectedAsset, setCurrentPrice, setConnected, setOHLCData]);

  const loadHistoricalData = useCallback(async (symbol: string) => {
    try {
      const historical = await firebaseService.getHistoricalOHLC(symbol, 500);
      if (historical.length > 0) {
        setOHLCData(historical);
      }
    } catch (error: any) {
      console.error('Failed to load historical data:', error);
    }
  }, [setOHLCData]);

  // ✅ Debounced fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const data = await tradingService.getOrders();
      setOrders(data.orders || []);
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
    }
  }, [setOrders]);

  const loadBalance = useCallback(async () => {
    try {
      const data = await tradingService.getBalance();
      setBalance(data.balance);
    } catch (error: any) {
      toast.error('Failed to update balance');
    }
  }, [setBalance]);

  // ✅ useCallback untuk prevent re-creation
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchOrders(), loadBalance()]);
      toast.success('Data refreshed');
    } catch (error: any) {
      toast.error('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders, loadBalance]);

  const handlePlaceOrder = useCallback(async (
    direction: 'CALL' | 'PUT',
    amount: number,
    duration: number
  ) => {
    if (!selectedAsset) {
      toast.error('No asset selected');
      return;
    }

    try {
      await tradingService.createOrder({
        asset_id: selectedAsset.id,
        direction,
        amount,
        duration,
      });

      // ✅ Parallel refresh
      await Promise.all([loadBalance(), fetchOrders()]);
    } catch (error: any) {
      throw error;
    }
  }, [selectedAsset, loadBalance, fetchOrders]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
    toast.success('Logged out');
  }, [logout, navigate]);

  const handleDashboardClick = useCallback(() => {
    setShowOrderBook(!showOrderBook);
  }, [showOrderBook]);

  const handleAssetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const asset = assets.find((a) => a.id === e.target.value);
    setSelectedAsset(asset || null);
    
    // Clear cache when switching assets
    firebaseService.clearCache();
  }, [assets, setSelectedAsset]);

  // ✅ Initialize on mount
  useEffect(() => {
    initializeTrading();
    
    return () => {
      firebaseService.unsubscribeAll();
    };
  }, [initializeTrading]);

  // ✅ Setup Firebase when asset changes
  useEffect(() => {
    const cleanup = setupFirebaseListeners();
    
    return cleanup;
  }, [setupFirebaseListeners]);

  // ✅ Fetch orders on mount and interval
  useEffect(() => {
    if (selectedAsset) {
      fetchOrders();
      
      // ✅ Longer interval - 15 seconds instead of 10
      const ordersInterval = setInterval(fetchOrders, 15000);
      return () => clearInterval(ordersInterval);
    }
  }, [selectedAsset, fetchOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-primary-950">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary-700 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-primary-400 font-medium">Initializing terminal...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedAsset) {
    return (
      <div className="flex items-center justify-center h-screen bg-primary-950 px-4">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-white">Initialization Failed</h2>
          <p className="text-sm text-primary-400 mb-6">{error}</p>
          <button
            onClick={initializeTrading}
            className="px-6 py-2.5 bg-accent text-primary-950 rounded-lg hover:bg-accent/90 transition-colors font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-950">
      {/* MOBILE LAYOUT */}
      <div className="lg:hidden">
        <MobileNavbar
          balance={balance}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onDashboardClick={handleDashboardClick}
          onProfileClick={handleLogout}
        />

        <div className="pt-14">
          {selectedAsset ? (
            <>
              <div className="w-full" style={{ height: '60vh' }}>
                <div className="h-full bg-primary-900/30 border-b border-primary-800">
                  <TradingChart 
                    data={ohlcData} 
                    currentPrice={currentPrice}
                    activeOrders={activeOrders}
                    height={window.innerHeight * 0.6}
                  />
                </div>
              </div>

              <div className="bg-primary-900/50">
                <MobileOrderPanel
                  currentPrice={currentPrice}
                  profitRate={selectedAsset.profitRate}
                  balance={balance}
                  onPlaceOrder={handlePlaceOrder}
                  disabled={!isConnected}
                />
              </div>

              {showOrderBook && (
                <div className="fixed inset-0 bg-primary-950 z-50 overflow-y-auto pt-14">
                  <div className="sticky top-0 bg-primary-900/95 backdrop-blur-sm border-b border-primary-800 px-3 py-3 flex items-center justify-between z-10">
                    <h3 className="text-base font-bold text-white">Orders</h3>
                    <button
                      onClick={() => setShowOrderBook(false)}
                      className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-3">
                    <OrderBook orders={orders} onRefresh={fetchOrders} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 px-4">
              <AlertCircle size={48} className="text-warning mx-auto mb-4" />
              <p className="text-lg text-white mb-2">No Assets Available</p>
              <p className="text-sm text-primary-500 mb-6">Contact administrator to configure trading assets</p>
              <button
                onClick={initializeTrading}
                className="px-6 py-2.5 bg-accent text-primary-950 rounded-lg hover:bg-accent/90 transition-colors font-medium"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:block">
        <div className="bg-primary-900/50 backdrop-blur-sm border-b border-primary-800 sticky top-0 z-50">
          <div className="max-w-[2000px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent/60 rounded-lg flex items-center justify-center">
                    <TrendingUp size={18} className="text-primary-950" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-white tracking-tight">STC TRADE</h1>
                    <div className="text-2xs text-primary-500 font-mono">Interface</div>
                  </div>
                </div>

                {assets.length > 0 && (
                  <select
                    value={selectedAsset?.id || ''}
                    onChange={handleAssetChange}
                    className="bg-primary-900 border border-primary-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent cursor-pointer font-medium"
                  >
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.symbol}
                      </option>
                    ))}
                  </select>
                )}

                <div className={`flex items-center space-x-2 px-2.5 py-1 rounded ${
                  isConnected ? 'bg-bull/10 text-bull' : 'bg-primary-800 text-primary-500'
                }`}>
                  <Activity size={12} className={isConnected ? 'animate-pulse' : ''} />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-900/50 rounded-lg border border-primary-800">
                    <BarChart3 size={14} className="text-primary-500" />
                    <div className="flex flex-col">
                      <span className="text-2xs text-primary-500 uppercase tracking-wide">Active</span>
                      <span className="font-mono font-bold text-white">{activeOrders.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-900/50 rounded-lg border border-primary-800">
                    <Wallet size={14} className="text-accent" />
                    <div className="flex flex-col">
                      <span className="text-2xs text-primary-500 uppercase tracking-wide">Balance</span>
                      <span className="font-mono font-bold text-white">{formatCurrency(balance)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-900/50 rounded-lg border border-primary-800">
                    <div className={`w-3 h-3 rounded ${totalProfit >= 0 ? 'bg-bull' : 'bg-bear'}`} />
                    <div className="flex flex-col">
                      <span className="text-2xs text-primary-500 uppercase tracking-wide">P/L</span>
                      <span className={`font-mono font-bold ${totalProfit >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {formatCurrency(totalProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 hover:bg-primary-800 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw size={16} className={`text-primary-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                {user && (
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-danger/10 rounded-lg transition-colors text-danger"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[2000px] mx-auto px-6 py-6">
          {selectedAsset ? (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-9 space-y-6">
                <PriceTicker
                  assetName={selectedAsset.name}
                  assetSymbol={selectedAsset.symbol}
                  currentPrice={currentPrice}
                  change={0}
                  isConnected={isConnected}
                  lastUpdate={lastUpdate}
                />

                <div className="bg-primary-900/30 backdrop-blur-sm border border-primary-800 rounded-xl p-6">
                  <TradingChart 
                    data={ohlcData} 
                    currentPrice={currentPrice}
                    activeOrders={activeOrders}
                    height={600}
                  />
                </div>
              </div>

              <div className="col-span-3 space-y-6">
                <div className="bg-primary-900/30 backdrop-blur-sm border border-primary-800 rounded-xl p-6">
                  <OrderPanel
                    assetName={selectedAsset.name}
                    currentPrice={currentPrice}
                    profitRate={selectedAsset.profitRate}
                    balance={balance}
                    onPlaceOrder={handlePlaceOrder}
                    disabled={!isConnected}
                  />
                </div>

                <div className="bg-primary-900/30 backdrop-blur-sm border border-primary-800 rounded-xl p-6">
                  <OrderBook orders={orders} onRefresh={fetchOrders} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 px-4">
              <AlertCircle size={48} className="text-warning mx-auto mb-4" />
              <p className="text-lg text-white mb-2">No Assets Available</p>
              <p className="text-sm text-primary-500 mb-6">Contact administrator to configure trading assets</p>
              <button
                onClick={initializeTrading}
                className="px-6 py-2.5 bg-accent text-primary-950 rounded-lg hover:bg-accent/90 transition-colors font-medium"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};