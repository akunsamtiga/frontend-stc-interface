import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { OHLCData, Order } from '../../types';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface TradingChartProps {
  data: OHLCData[];
  currentPrice: number | null;
  activeOrders?: Order[];
  height?: number;
}

// ✅ MEMOIZED Component untuk prevent unnecessary re-renders
export const TradingChart = React.memo<TradingChartProps>(({ 
  data, 
  currentPrice,
  activeOrders = [],
  height = 600 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // ✅ Track last update untuk prevent duplicate updates
  const lastDataLength = useRef(0);
  const lastPrice = useRef<number | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ Initialize chart ONCE
  useEffect(() => {
    if (!chartContainerRef.current) return;

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
        scaleMargins: { top: 0.1, bottom: 0.1 },
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

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = window.innerWidth < 768 ? Math.min(height, 400) : height;
        chartRef.current.applyOptions({ width: newWidth, height: newHeight });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, isMobile]);

  // ✅ Update chart data HANYA jika benar-benar berubah
  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return;
    
    // ✅ Skip jika data length sama (belum ada update baru)
    if (data.length === lastDataLength.current) return;
    
    lastDataLength.current = data.length;

    try {
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
      
      const chartData = sortedData.map(d => ({
        time: d.timestamp as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      // ✅ Use update() instead of setData() untuk better performance
      if (chartData.length > 0) {
        const lastCandle = chartData[chartData.length - 1];
        candleSeriesRef.current.update(lastCandle);
      }

      // ✅ Calculate price change ONLY ketika data berubah
      if (sortedData.length >= 2) {
        const firstPrice = sortedData[0].close;
        const lastPrice = sortedData[sortedData.length - 1].close;
        const change = lastPrice - firstPrice;
        const changePercent = (change / firstPrice) * 100;
        setPriceChange(change);
        setPriceChangePercent(changePercent);
      }
    } catch (error) {
      console.error('Error updating chart:', error);
    }
  }, [data]);

  // ✅ Update current price indicator ONLY jika price berubah signifikan
  useEffect(() => {
    if (currentPrice === null || currentPrice === lastPrice.current) return;
    
    // ✅ Skip jika perubahan < 0.001
    if (lastPrice.current !== null && Math.abs(currentPrice - lastPrice.current) < 0.001) {
      return;
    }
    
    lastPrice.current = currentPrice;
    // Price indicator update logic here (optional)
  }, [currentPrice]);

  const isPositive = priceChange >= 0;

  return (
    <div className="relative group">
      {/* Chart Header - Simplified */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10">
        {currentPrice && (
          <div className="bg-primary-900/80 backdrop-blur-sm border border-primary-700/50 rounded-lg px-2 sm:px-4 py-2 sm:py-3">
            <div className="flex items-baseline space-x-2 sm:space-x-3">
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono text-white">
                {currentPrice.toFixed(3)}
              </span>
              <div className={`flex items-center space-x-0.5 sm:space-x-1 text-xs sm:text-sm font-medium ${
                isPositive ? 'text-bull' : 'text-bear'
              }`}>
                {isPositive ? <TrendingUp size={12} className="sm:w-4 sm:h-4" /> : <TrendingDown size={12} className="sm:w-4 sm:h-4" />}
                <span className="text-2xs sm:text-xs">({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 text-2xs text-primary-400 mt-1">
              <Activity size={10} className="sm:w-3 sm:h-3 opacity-50" />
              <span className="font-mono">Real-time</span>
            </div>
          </div>
        )}
      </div>

      {/* Active Orders Badge - Desktop Only */}
      {activeOrders.length > 0 && !isMobile && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center space-x-2 bg-primary-900/90 backdrop-blur-sm border border-primary-700/50 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-2xs sm:text-xs font-medium text-white">{activeOrders.length} Active</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Chart Container */}
      <div ref={chartContainerRef} className="rounded-lg" />

      {/* Data Info */}
      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex items-center space-x-2 sm:space-x-4 text-2xs text-primary-400 font-mono">
        <span>{data.length} bars</span>
        {activeOrders.length > 0 && (
          <>
            <span className="opacity-50">•</span>
            <span className="text-accent">{activeOrders.length} orders</span>
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