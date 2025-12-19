import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Circle } from 'lucide-react';

interface PriceTickerProps {
  assetName: string;
  assetSymbol: string;
  currentPrice: number | null;
  change?: number;
  isConnected: boolean;
  lastUpdate: Date | null;
}

export const PriceTicker: React.FC<PriceTickerProps> = ({
  assetName,
  assetSymbol,
  currentPrice,
  change = 0,
  isConnected,
  lastUpdate,
}) => {
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (currentPrice !== null && prevPrice !== null) {
      if (currentPrice > prevPrice) {
        setPriceDirection('up');
        setFlash(true);
      } else if (currentPrice < prevPrice) {
        setPriceDirection('down');
        setFlash(true);
      }
      
      const timer = setTimeout(() => {
        setPriceDirection('neutral');
        setFlash(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
    
    if (currentPrice !== null) {
      setPrevPrice(currentPrice);
    }
  }, [currentPrice]);

  const isPositive = change >= 0;

  return (
    <div className="relative">
      {/* Connection Indicator - Subtle */}
      <div className="absolute -top-1 -right-1 z-10">
        <Circle 
          size={8} 
          className={`${isConnected ? 'text-accent fill-accent animate-pulse-slow' : 'text-primary-600 fill-primary-600'}`}
        />
      </div>

      {/* Main Ticker - Responsive */}
      <div className={`relative border border-primary-800 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-300 ${
        flash 
          ? priceDirection === 'up' 
            ? 'bg-bull/5 border-bull/30' 
            : 'bg-bear/5 border-bear/30'
          : 'bg-primary-900/30 backdrop-blur-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-start sm:justify-between space-y-3 sm:space-y-0">
          {/* Left - Asset Info */}
          <div className="space-y-1 w-full sm:w-auto">
            <div className="flex items-baseline space-x-2 sm:space-x-3">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight">{assetName}</h2>
              <span className="text-xs sm:text-sm text-primary-400 font-mono">{assetSymbol}</span>
            </div>
            
            {/* Price Display - Responsive */}
            <div className="flex items-baseline space-x-2 sm:space-x-3 lg:space-x-4 mt-2 sm:mt-3">
              <span 
                className={`text-3xl sm:text-4xl lg:text-5xl font-bold font-mono tracking-tight transition-colors duration-300 ${
                  priceDirection === 'up' ? 'text-bull' :
                  priceDirection === 'down' ? 'text-bear' :
                  'text-white'
                }`}
              >
                {currentPrice ? currentPrice.toFixed(3) : '----.---'}
              </span>
              
              {/* Change Badge - Responsive */}
              <div className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors ${
                isPositive 
                  ? 'bg-bull/10 text-bull border border-bull/20' 
                  : 'bg-bear/10 text-bear border border-bear/20'
              }`}>
                {isPositive ? <TrendingUp size={14} className="sm:w-4 sm:h-4" /> : <TrendingDown size={14} className="sm:w-4 sm:h-4" />}
                <span className="font-bold font-mono text-xs sm:text-sm">
                  {isPositive ? '+' : ''}{change.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right - Stats - Responsive */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto space-x-4 sm:space-x-0 sm:space-y-2">
            <div className="flex items-center justify-end space-x-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-accent animate-pulse' : 'bg-primary-600'
              }`} />
              <span className="text-xs text-primary-400 font-medium uppercase tracking-wide">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            
            {lastUpdate && (
              <div className="text-2xs text-primary-500 font-mono">
                {lastUpdate.toLocaleTimeString('en-US', { 
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Stats Bar - Responsive */}
        <div className="mt-3 sm:mt-4 lg:mt-6 pt-3 sm:pt-4 border-t border-primary-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6 text-xs overflow-x-auto w-full sm:w-auto">
            <div className="flex items-center space-x-2 whitespace-nowrap">
              <span className="text-primary-500 uppercase tracking-wide">Vol</span>
              <span className="text-white font-mono">---</span>
            </div>
            <div className="flex items-center space-x-2 whitespace-nowrap">
              <span className="text-primary-500 uppercase tracking-wide">High</span>
              <span className="text-white font-mono">---</span>
            </div>
            <div className="flex items-center space-x-2 whitespace-nowrap">
              <span className="text-primary-500 uppercase tracking-wide">Low</span>
              <span className="text-white font-mono">---</span>
            </div>
          </div>
          
          <div className="text-2xs text-primary-500 font-mono">
            Last updated: {lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : 0}s ago
          </div>
        </div>
      </div>
    </div>
  );
};