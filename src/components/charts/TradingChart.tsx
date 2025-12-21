import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { OHLCData, Order } from '../../types';
import { Activity, TrendingUp, TrendingDown, ZoomIn, ZoomOut } from 'lucide-react';

interface TradingChartProps {
  data: OHLCData[];
  currentPrice: number | null;
  activeOrders?: Order[];
  height?: number;
}

// ✅ CUSTOM CANVAS CHART - Super Lightweight & Fast
export const TradingChart = React.memo<TradingChartProps>(({ 
  data, 
  currentPrice,
  activeOrders = [],
  height = 600 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredCandle, setHoveredCandle] = useState<OHLCData | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Track last render untuk prevent duplicate draws
  const lastRenderTime = useRef(0);
  const renderThrottle = 100; // Max 10 FPS
  
  // Animation frame reference
  const animationFrameRef = useRef<number>();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ Calculate visible data dengan zoom
  const visibleData = useMemo(() => {
    if (data.length === 0) return [];
    
    const candlesToShow = Math.floor(100 / zoom);
    return data.slice(-candlesToShow);
  }, [data, zoom]);

  // ✅ Calculate price range
  const priceRange = useMemo(() => {
    if (visibleData.length === 0) return { min: 0, max: 0 };
    
    const prices = visibleData.flatMap(d => [d.high, d.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1; // 10% padding
    
    return {
      min: min - padding,
      max: max + padding
    };
  }, [visibleData]);

  // ✅ Calculate price change
  useEffect(() => {
    if (data.length >= 2) {
      const firstPrice = data[0].close;
      const lastPrice = data[data.length - 1].close;
      const change = lastPrice - firstPrice;
      const changePercent = (change / firstPrice) * 100;
      setPriceChange(change);
      setPriceChangePercent(changePercent);
    }
  }, [data]);

  // ✅ Draw chart function (optimized)
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || visibleData.length === 0) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = rect.height;
    const padding = { top: 40, right: 80, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Clear canvas
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, width, chartHeight);

    // ✅ Draw grid (simple)
    ctx.strokeStyle = 'rgba(108, 117, 125, 0.05)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (5 lines)
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (innerHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines (based on candles)
    const candleWidth = chartWidth / visibleData.length;
    for (let i = 0; i < visibleData.length; i += Math.max(1, Math.floor(visibleData.length / 10))) {
      const x = padding.left + i * candleWidth + candleWidth / 2;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, chartHeight - padding.bottom);
      ctx.stroke();
    }

    // ✅ Helper functions
    const priceToY = (price: number) => {
      const range = priceRange.max - priceRange.min;
      return padding.top + innerHeight - ((price - priceRange.min) / range) * innerHeight;
    };

    // ✅ Draw candlesticks (optimized)
    visibleData.forEach((candle, index) => {
      const x = padding.left + index * candleWidth + candleWidth / 2;
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#10b981' : '#ef4444';
      
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);

      // Draw wick (thin line)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body (rectangle)
      const bodyWidth = Math.max(2, candleWidth * 0.7);
      const bodyHeight = Math.abs(closeY - openY);
      const bodyY = Math.min(openY, closeY);
      
      ctx.fillStyle = color;
      ctx.fillRect(x - bodyWidth / 2, bodyY, bodyWidth, Math.max(1, bodyHeight));
      
      // Highlight hovered candle
      if (hoveredCandle && hoveredCandle.timestamp === candle.timestamp) {
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - bodyWidth / 2 - 2, bodyY - 2, bodyWidth + 4, bodyHeight + 4);
      }
    });

    // ✅ Draw current price line
    if (currentPrice && currentPrice >= priceRange.min && currentPrice <= priceRange.max) {
      const y = priceToY(currentPrice);
      
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = '#00d4ff';
      ctx.fillRect(width - padding.right + 2, y - 10, 75, 20);
      ctx.fillStyle = '#0a0e17';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(currentPrice.toFixed(3), width - padding.right + 39, y + 4);
    }

    // ✅ Draw price scale (right side)
    ctx.fillStyle = '#6c757d';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 5; i++) {
      const price = priceRange.min + (priceRange.max - priceRange.min) * (i / 5);
      const y = priceToY(price);
      ctx.fillText(price.toFixed(3), width - padding.right + 5, y + 4);
    }

    // ✅ Draw active order lines (max 5 untuk performance)
    activeOrders.slice(0, 5).forEach(order => {
      if (order.entry_price >= priceRange.min && order.entry_price <= priceRange.max) {
        const y = priceToY(order.entry_price);
        const color = order.direction === 'CALL' ? '#10b981' : '#ef4444';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Order label
        ctx.fillStyle = color;
        ctx.fillRect(padding.left, y - 8, 40, 16);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(order.direction, padding.left + 20, y + 4);
      }
    });

    // ✅ Draw tooltip if hovering
    if (hoveredCandle) {
      const tooltipX = 10;
      const tooltipY = 50;
      const tooltipWidth = 180;
      const tooltipHeight = 100;
      
      ctx.fillStyle = 'rgba(10, 14, 23, 0.95)';
      ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
      
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      
      let yOffset = tooltipY + 15;
      const lineHeight = 16;
      
      ctx.fillText(`Time: ${hoveredCandle.datetime}`, tooltipX + 10, yOffset);
      yOffset += lineHeight;
      ctx.fillStyle = '#10b981';
      ctx.fillText(`Open: ${hoveredCandle.open.toFixed(3)}`, tooltipX + 10, yOffset);
      yOffset += lineHeight;
      ctx.fillText(`High: ${hoveredCandle.high.toFixed(3)}`, tooltipX + 10, yOffset);
      yOffset += lineHeight;
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`Low: ${hoveredCandle.low.toFixed(3)}`, tooltipX + 10, yOffset);
      yOffset += lineHeight;
      ctx.fillStyle = '#00d4ff';
      ctx.fillText(`Close: ${hoveredCandle.close.toFixed(3)}`, tooltipX + 10, yOffset);
    }

  }, [visibleData, priceRange, currentPrice, activeOrders, hoveredCandle]);

  // ✅ Throttled render (max 10 FPS)
  useEffect(() => {
    const now = Date.now();
    if (now - lastRenderTime.current < renderThrottle) {
      // Schedule next render
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        drawChart();
        lastRenderTime.current = Date.now();
      });
    } else {
      drawChart();
      lastRenderTime.current = now;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawChart]);

  // ✅ Handle resize
  useEffect(() => {
    const handleResize = () => {
      drawChart();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  // ✅ Handle mouse move (for tooltip)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || visibleData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    const padding = { left: 10, right: 80 };
    const chartWidth = rect.width - padding.left - padding.right;
    const candleWidth = chartWidth / visibleData.length;
    
    const index = Math.floor((x - padding.left) / candleWidth);
    
    if (index >= 0 && index < visibleData.length) {
      setHoveredCandle(visibleData[index]);
    } else {
      setHoveredCandle(null);
    }
  }, [visibleData]);

  const handleMouseLeave = useCallback(() => {
    setHoveredCandle(null);
  }, []);

  // ✅ Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const isPositive = priceChange >= 0;

  return (
    <div className="relative group">
      {/* Chart Header */}
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
              <span className="font-mono">Canvas Chart</span>
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
          </div>
        </div>
      )}

      {/* Zoom Controls - Desktop Only */}
      {!isMobile && (
        <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-primary-900/80 backdrop-blur-sm border border-primary-700/50 rounded-lg hover:bg-primary-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={16} className="text-primary-300" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-primary-900/80 backdrop-blur-sm border border-primary-700/50 rounded-lg hover:bg-primary-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={16} className="text-primary-300" />
          </button>
          <div className="text-2xs text-primary-500 text-center font-mono">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      )}
      
      {/* Canvas Container */}
      <div 
        ref={containerRef} 
        className="rounded-lg overflow-hidden bg-primary-900/30"
        style={{ height: `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
        />
      </div>

      {/* Data Info */}
      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex items-center space-x-2 sm:space-x-4 text-2xs text-primary-400 font-mono">
        <span>{data.length} bars</span>
        <span className="opacity-50">•</span>
        <span>Showing {visibleData.length}</span>
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