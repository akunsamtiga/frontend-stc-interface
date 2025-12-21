import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, IPriceLine } from 'lightweight-charts';
import { OHLCData, Order } from '../../types';
import { Activity, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TradingChartProps {
  data: OHLCData[];
  currentPrice: number | null;
  activeOrders?: Order[];
  height?: number;
}

// Memoize component untuk prevent unnecessary re-renders
export const TradingChart = memo<TradingChartProps>(({ 
  data, 
  currentPrice,
  activeOrders = [],
  height = 600 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const lastDataLengthRef = useRef(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [timeframe, setTimeframe] = useState('1M');
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile dengan debounce
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    
    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkMobile, 150);
    };
    
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', debouncedResize);
    };
  }, []);

  // Memoize chart options
  const chartOptions = useMemo(() => ({
    layout: {
      background: { color: 'transparent' },
      textColor: '#6c757d',
    },
    grid: {
      vertLines: { color: 'rgba(108, 117, 125, 0.05)' },
      horzLines: { color: 'rgba(108, 117, 125, 0.05)' },
    },
    width: chartContainerRef.current?.clientWidth || 800,
    height: isMobile ? Math.min(height, 400) : height,
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
      mode: 1 as const,
      vertLine: {
        color: 'rgba(0, 212, 255, 0.3)',
        width: 1 as const,
        style: 2 as const,
      },
      horzLine: {
        color: 'rgba(0, 212, 255, 0.3)',
        width: 1 as const,
        style: 2 as const,
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
  }), [isMobile, height]);

  // Initialize chart - hanya sekali
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, chartOptions);

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

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }
    };
  }, []);

  // Update chart options saat resize
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return;

    const handleResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;
      
      // Debounce resize
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        if (!chartContainerRef.current || !chartRef.current) return;
        
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = window.innerWidth < 768 ? Math.min(height, 400) : height;
        
        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight,
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [height]);

  // Memoize chart data transformation
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    try {
      return data
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(d => ({
          time: d.timestamp as UTCTimestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));
    } catch (error) {
      console.error('Error transforming chart data:', error);
      return [];
    }
  }, [data]);

  // Update chart data - dengan throttling
  useEffect(() => {
    if (!candleSeriesRef.current || chartData.length === 0) return;

    // Skip update jika data length sama (berarti data tidak berubah)
    if (chartData.length === lastDataLengthRef.current && chartData.length > 0) {
      // Update hanya candle terakhir
      try {
        const lastCandle = chartData[chartData.length - 1];
        candleSeriesRef.current.update(lastCandle);
      } catch (error) {
        console.error('Error updating last candle:', error);
      }
      return;
    }

    // Debounce full data update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      if (!candleSeriesRef.current) return;
      
      try {
        candleSeriesRef.current.setData(chartData);
        
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }

        lastDataLengthRef.current = chartData.length;

        // Calculate price change
        if (chartData.length >= 2) {
          const firstPrice = chartData[0].close;
          const lastPrice = chartData[chartData.length - 1].close;
          const change = lastPrice - firstPrice;
          const changePercent = (change / firstPrice) * 100;
          setPriceChange(change);
          setPriceChangePercent(changePercent);
        }
      } catch (error) {
        console.error('Error setting chart data:', error);
      }
    }, 200); // 200ms debounce

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [chartData]);

  // Update price lines untuk orders - dengan memoization
  const ordersToShow = useMemo(() => {
    return isMobile ? activeOrders.slice(0, 3) : activeOrders;
  }, [activeOrders, isMobile]);

  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    // Clear existing price lines
    priceLinesRef.current.forEach(line => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch (e) {
        // Ignore errors jika line sudah di-remove
      }
    });
    priceLinesRef.current.clear();

    // Add price lines
    ordersToShow.forEach(order => {
      if (!candleSeriesRef.current) return;
      
      const isCall = order.direction === 'CALL';
      
      try {
        const priceLine = candleSeriesRef.current.createPriceLine({
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
      } catch (error) {
        console.error('Error creating price line:', error);
      }
    });

    return () => {
      priceLinesRef.current.forEach(line => {
        try {
          candleSeriesRef.current?.removePriceLine(line);
        } catch (e) {
          // Ignore
        }
      });
      priceLinesRef.current.clear();
    };
  }, [ordersToShow, isMobile]);

  const isPositive = priceChange >= 0;

  return (
    <div className="relative group">
      {/* Chart Header */}
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

      {/* Active Orders Badge */}
      {activeOrders.length > 0 && !isMobile && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center space-x-2 bg-primary-900/90 backdrop-blur-sm border border-primary-700/50 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-2xs sm:text-xs font-medium text-white">{activeOrders.length} Active</span>
            </div>
            
            <div className="h-3 sm:h-4 w-px bg-primary-700" />
            
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

      {/* Chart Controls */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 flex items-center space-x-1 sm:space-x-2">
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

      {/* Order Pins Legend */}
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

      {/* Data Info */}
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
  // Custom comparison untuk prevent unnecessary re-renders
  return (
    prevProps.currentPrice === nextProps.currentPrice &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.activeOrders?.length === nextProps.activeOrders?.length &&
    prevProps.height === nextProps.height
  );
});

TradingChart.displayName = 'TradingChart';