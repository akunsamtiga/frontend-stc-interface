import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, IPriceLine } from 'lightweight-charts';
import { OHLCData, Order } from '../../types';
import { Activity, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TradingChartProps {
  data: OHLCData[];
  currentPrice: number | null;
  activeOrders?: Order[];
  height?: number;
}

// ✅ Memoized untuk prevent re-render
export const TradingChart: React.FC<TradingChartProps> = memo(({ 
  data, 
  currentPrice,
  activeOrders = [],
  height = 600 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [timeframe, setTimeframe] = useState('1M');
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // ✅ Track last update to prevent unnecessary re-renders
  const lastDataLengthRef = useRef(0);
  const lastPriceRef = useRef<number | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    const debouncedResize = debounce(checkMobile, 200);
    window.addEventListener('resize', debouncedResize);
    
    return () => window.removeEventListener('resize', debouncedResize);
  }, []);

  // ✅ Initialize chart only once
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#6c757d',
      },
      grid: {
        vertLines: { color: 'rgba(108, 117, 125, 0.05)' },
        horzLines: { color: 'rgba(108, 117, 125, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: !isMobile,
        borderColor: 'rgba(108, 117, 125, 0.1)',
        rightOffset: isMobile ? 6 : 12,
        barSpacing: isMobile ? 4 : 6,
      },
      rightPriceScale: {
        borderColor: 'rgba(108, 117, 125, 0.1)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(0, 212, 255, 0.3)',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: 'rgba(0, 212, 255, 0.3)',
          width: 1,
          style: 2,
        },
      },
      handleScroll: {
        mouseWheel: !isMobile,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: !isMobile,
        pinch: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = debounce(() => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = window.innerWidth < 768 ? Math.min(height, 400) : height;
        
        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight,
        });
      }
    }, 200);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [height, isMobile]);

  // ✅ Update chart data only when actually changed
  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return;

    // Skip if data hasn't changed
    if (data.length === lastDataLengthRef.current) {
      return;
    }

    try {
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
      
      const chartData = sortedData.map(d => ({
        time: d.timestamp as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      candleSeriesRef.current.setData(chartData);
      
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }

      // Calculate price change only when data changes
      if (sortedData.length >= 2) {
        const firstPrice = sortedData[0].close;
        const lastPrice = sortedData[sortedData.length - 1].close;
        const change = lastPrice - firstPrice;
        const changePercent = (change / firstPrice) * 100;
        setPriceChange(change);
        setPriceChangePercent(changePercent);
      }

      lastDataLengthRef.current = data.length;
    } catch (error) {
      console.error('Error setting chart data:', error);
    }
  }, [data]);

  // ✅ Update price lines only when activeOrders actually change
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    // Clear existing price lines
    priceLinesRef.current.forEach(line => {
      candleSeriesRef.current?.removePriceLine(line);
    });
    priceLinesRef.current.clear();

    // Add price lines for each active order (limit on mobile)
    const ordersToShow = isMobile ? activeOrders.slice(0, 3) : activeOrders;
    
    ordersToShow.forEach(order => {
      const isCall = order.direction === 'CALL';
      
      const priceLine = candleSeriesRef.current?.createPriceLine({
        price: order.entry_price,
        color: isCall ? '#10b981' : '#ef4444',
        lineWidth: isMobile ? 1 : 2,
        lineStyle: 2,
        axisLabelVisible: !isMobile,
        title: isMobile ? order.direction : `${order.direction} ${(order.amount / 1000).toFixed(0)}K`,
      });

      if (priceLine) {
        priceLinesRef.current.set(order.id, priceLine);
      }
    });

    return () => {
      priceLinesRef.current.forEach(line => {
        candleSeriesRef.current?.removePriceLine(line);
      });
      priceLinesRef.current.clear();
    };
  }, [activeOrders, isMobile]);

  const isPositive = priceChange >= 0;

  return (
    <div className="relative group">
      {/* Chart Header - Responsive */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 space-y-1 sm:space-y-2">
        {currentPrice && (
          <div className="bg-primary-900/80 backdrop-blur-sm border border-primary-700/50 rounded-lg px-2 sm:px-4 py-2 sm:py-3 space-y-0.5 sm:space-y-1">
            <div className="flex items-baseline space-x-2 sm:space-x-3">
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
                {currentPrice.toFixed(3)}
              </span>
              <div className={`flex items-center space-x-0.5 sm:space-x-1 text-xs sm:text-sm font-medium ${
                isPositive ? 'text-bull' : 'text-bear'
              }`}>
                {isPositive ? <TrendingUp size={12} className="sm:w-4 sm:h-4" /> : <TrendingDown size={12} className="sm:w-4 sm:h-4" />}
                <span className="hidden sm:inline">{isPositive ? '+' : ''}{priceChange.toFixed(3)}</span>
                <span className="text-2xs sm:text-xs">({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 text-2xs text-primary-400">
              <Activity size={10} className="sm:w-3 sm:h-3 opacity-50" />
              <span className="font-mono">Real-time</span>
            </div>
          </div>
        )}
      </div>

      {/* Active Orders Badge - Responsive */}
      {activeOrders.length > 0 && !isMobile && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center space-x-2 bg-primary-900/90 backdrop-blur-sm border border-primary-700/50 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-2xs sm:text-xs font-medium text-white">{activeOrders.length} Active</span>
            </div>
            
            <div className="h-3 sm:h-4 w-px bg-primary-700" />
            
            {/* Order Summary - Desktop Only */}
            <div className="hidden sm:flex items-center space-x-3 text-xs">
              {activeOrders.slice(0, 3).map(order => (
                <div key={order.id} className="flex items-center space-x-1">
                  {order.direction === 'CALL' ? (
                    <ArrowUp size={12} className="text-bull" />
                  ) : (
                    <ArrowDown size={12} className="text-bear" />
                  )}
                  <span className="text-primary-300 font-mono">
                    {order.entry_price.toFixed(3)}
                  </span>
                </div>
              ))}
              {activeOrders.length > 3 && (
                <span className="text-primary-500">+{activeOrders.length - 3}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart Controls - Responsive */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 flex items-center space-x-1 sm:space-x-2">
        {/* Timeframe Selector - Compact on mobile */}
        <div className="flex items-center bg-primary-900/80 backdrop-blur-sm border border-primary-700/50 rounded-lg overflow-hidden">
          {(isMobile ? ['1M', '5M', '15M'] : ['1M', '5M', '15M', '1H', '4H', '1D']).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-2xs sm:text-xs font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-accent text-primary-950'
                  : 'text-primary-300 hover:text-white hover:bg-primary-800/50'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Type - Hidden on small mobile */}
        {!isMobile && (
          <div className="flex items-center bg-primary-900/80 backdrop-blur-sm border border-primary-700/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-2xs sm:text-xs font-medium transition-colors ${
                chartType === 'candlestick'
                  ? 'bg-accent text-primary-950'
                  : 'text-primary-300 hover:text-white hover:bg-primary-800/50'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-2xs sm:text-xs font-medium transition-colors ${
                chartType === 'line'
                  ? 'bg-accent text-primary-950'
                  : 'text-primary-300 hover:text-white hover:bg-primary-800/50'
              }`}
            >
              Line
            </button>
          </div>
        )}
      </div>
      
      <div ref={chartContainerRef} className="rounded-lg" />

      {/* Order Pins Legend - Desktop/Tablet Only */}
      {activeOrders.length > 0 && !isMobile && (
        <div className="absolute bottom-4 right-4 max-w-xs z-10">
          <div className="bg-primary-900/90 backdrop-blur-sm border border-primary-700/50 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <div className="text-2xs text-primary-400 uppercase tracking-wide font-medium">
                Active Positions
              </div>
              <div className="text-2xs text-primary-600 font-mono">
                {activeOrders.length}
              </div>
            </div>
            <div className="space-y-1 sm:space-y-1.5 max-h-32 sm:max-h-40 overflow-y-auto scrollbar-thin pr-1">
              {activeOrders.map(order => {
                const isCall = order.direction === 'CALL';
                return (
                  <div 
                    key={order.id} 
                    className={`flex items-center justify-between space-x-2 sm:space-x-3 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded border transition-colors ${
                      isCall 
                        ? 'border-bull/20 bg-bull/5 hover:bg-bull/10' 
                        : 'border-bear/20 bg-bear/5 hover:bg-bear/10'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      {isCall ? (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-bull/20 flex items-center justify-center">
                          <ArrowUp size={10} className="sm:w-3 sm:h-3 text-bull" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-bear/20 flex items-center justify-center">
                          <ArrowDown size={10} className="sm:w-3 sm:h-3 text-bear" />
                        </div>
                      )}
                      <span className={`text-2xs font-bold ${
                        isCall ? 'text-bull' : 'text-bear'
                      }`}>
                        {order.direction}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <span className="text-2xs font-mono text-white">
                        {order.entry_price.toFixed(3)}
                      </span>
                      <span className="text-2xs text-primary-600">•</span>
                      <span className="text-2xs font-mono text-primary-300">
                        {(order.amount / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Data Info - Responsive */}
      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex items-center space-x-2 sm:space-x-4 text-2xs text-primary-400 font-mono">
        <span>{data.length} bars</span>
        <span className="opacity-50 hidden sm:inline">•</span>
        <span className="hidden sm:inline">Updated {new Date().toLocaleTimeString()}</span>
        {activeOrders.length > 0 && (
          <>
            <span className="opacity-50">•</span>
            <span className="text-accent">{activeOrders.length}</span>
          </>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison untuk prevent unnecessary re-renders
  return (
    prevProps.data.length === nextProps.data.length &&
    prevProps.currentPrice === nextProps.currentPrice &&
    (prevProps.activeOrders?.length || 0) === (nextProps.activeOrders?.length || 0) &&
    prevProps.height === nextProps.height
  );
});

TradingChart.displayName = 'TradingChart';

// ✅ Debounce helper
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