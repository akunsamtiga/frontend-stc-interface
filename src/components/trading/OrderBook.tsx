import React, { useEffect, useState, useMemo, memo, useCallback } from 'react';
import { Clock, ArrowUp, ArrowDown, CheckCircle, XCircle, Minus } from 'lucide-react';
import { Order } from '../../types';
import { formatCurrency, formatRemainingTime, calculateRemainingTime } from '../../utils/format';

interface OrderBookProps {
  orders: Order[];
  onRefresh?: () => void;
}

// Memoize OrderItem untuk prevent re-render
const OrderItem = memo<{ 
  order: Order; 
  remainingTime: number;
}>(({ order, remainingTime }) => {
  const remaining = remainingTime;
  const progress = order.status === 'ACTIVE' 
    ? ((order.duration * 60 - remaining) / (order.duration * 60)) * 100 
    : 100;

  return (
    <div className="bg-primary-900/30 border border-primary-800 hover:border-primary-700 rounded-lg p-3 sm:p-4 transition-all group">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className={`p-1 sm:p-1.5 rounded ${
            order.direction === 'CALL' ? 'bg-bull/10' : 'bg-bear/10'
          }`}>
            {order.direction === 'CALL' ? (
              <ArrowUp size={12} className="sm:w-3.5 sm:h-3.5 text-bull" />
            ) : (
              <ArrowDown size={12} className="sm:w-3.5 sm:h-3.5 text-bear" />
            )}
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-white">{order.asset_name}</span>
            <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5">
              <span className={`text-2xs font-bold ${
                order.direction === 'CALL' ? 'text-bull' : 'text-bear'
              }`}>
                {order.direction}
              </span>
              <span className="text-2xs text-primary-600">•</span>
              <span className="text-2xs text-primary-500 font-mono">{order.duration}m</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        {order.status === 'ACTIVE' ? (
          <div className="flex items-center space-x-1 sm:space-x-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-accent/10 border border-accent/20 rounded">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-2xs font-medium text-accent uppercase hidden sm:inline">Active</span>
          </div>
        ) : (
          <div className={`flex items-center space-x-0.5 sm:space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
            order.status === 'WON'
              ? 'bg-bull/10 text-bull border border-bull/20'
              : order.status === 'LOST'
              ? 'bg-bear/10 text-bear border border-bear/20'
              : 'bg-primary-800/50 text-primary-400 border border-primary-700'
          }`}>
            {order.status === 'WON' ? (
              <CheckCircle size={10} className="sm:w-3 sm:h-3" />
            ) : order.status === 'LOST' ? (
              <XCircle size={10} className="sm:w-3 sm:h-3" />
            ) : (
              <Minus size={10} className="sm:w-3 sm:h-3" />
            )}
            <span className="text-2xs font-medium uppercase">{order.status}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div>
          <div className="text-2xs text-primary-500 uppercase tracking-wide mb-0.5 sm:mb-1">Amount</div>
          <div className="text-2xs sm:text-xs font-mono text-white">{formatCurrency(order.amount)}</div>
        </div>
        <div>
          <div className="text-2xs text-primary-500 uppercase tracking-wide mb-0.5 sm:mb-1">Entry</div>
          <div className="text-2xs sm:text-xs font-mono text-white">{order.entry_price.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-2xs text-primary-500 uppercase tracking-wide mb-0.5 sm:mb-1">
            {order.status === 'ACTIVE' ? 'Rate' : 'Result'}
          </div>
          {order.status === 'ACTIVE' ? (
            <div className="text-2xs sm:text-xs font-mono text-accent">+{order.profitRate}%</div>
          ) : (
            <div className={`text-2xs sm:text-xs font-mono font-bold ${
              order.profit && order.profit > 0 
                ? 'text-bull' 
                : order.profit && order.profit < 0
                ? 'text-bear'
                : 'text-primary-400'
            }`}>
              {order.profit ? formatCurrency(order.profit) : '-'}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {order.status === 'ACTIVE' && (
        <div className="space-y-1 sm:space-y-1.5">
          <div className="flex justify-between items-center text-2xs">
            <div className="flex items-center space-x-1 text-primary-500">
              <Clock size={8} className="sm:w-2.5 sm:h-2.5" />
              <span className="hidden sm:inline">Time Remaining</span>
              <span className="sm:hidden">Time</span>
            </div>
            <span className="font-mono font-bold text-accent">
              {formatRemainingTime(remaining)}
            </span>
          </div>
          <div className="w-full bg-primary-800 rounded-full h-1 sm:h-1.5 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Exit Price */}
      {order.exit_price && order.status !== 'ACTIVE' && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-primary-800 flex items-center justify-between text-2xs">
          <span className="text-primary-500">Entry → Exit</span>
          <span className="font-mono text-primary-300">
            {order.entry_price.toFixed(3)} → {order.exit_price.toFixed(3)}
          </span>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison untuk prevent unnecessary re-renders
  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.remainingTime === nextProps.remainingTime
  );
});

OrderItem.displayName = 'OrderItem';

export const OrderBook: React.FC<OrderBookProps> = memo(({ orders, onRefresh }) => {
  const [remainingTimes, setRemainingTimes] = useState<{ [key: string]: number }>({});
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  
  // Memoize filtered orders
  const activeOrders = useMemo(() => 
    orders.filter(o => o.status === 'ACTIVE'),
    [orders]
  );
  
  const historyOrders = useMemo(() => 
    orders
      .filter(o => o.status !== 'ACTIVE' && o.status !== 'PENDING')
      .slice(0, 20), // Limit untuk performance
    [orders]
  );

  // Update remaining times - dengan throttling
  useEffect(() => {
    if (activeOrders.length === 0) {
      setRemainingTimes({});
      return;
    }

    const updateTimes = () => {
      const times: { [key: string]: number } = {};
      activeOrders.forEach(order => {
        times[order.id] = calculateRemainingTime(order.entry_time, order.duration);
      });
      setRemainingTimes(times);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, [activeOrders]);

  const displayOrders = useMemo(
    () => activeTab === 'active' ? activeOrders : historyOrders,
    [activeTab, activeOrders, historyOrders]
  );

  const handleTabChange = useCallback((tab: 'active' | 'history') => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center border border-primary-800 rounded-lg overflow-hidden">
          <button
            onClick={() => handleTabChange('active')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-2xs sm:text-xs font-medium uppercase tracking-wide transition-colors ${
              activeTab === 'active'
                ? 'bg-accent text-primary-950'
                : 'text-primary-400 hover:text-white hover:bg-primary-900/50'
            }`}
          >
            Active ({activeOrders.length})
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-2xs sm:text-xs font-medium uppercase tracking-wide transition-colors ${
              activeTab === 'history'
                ? 'bg-accent text-primary-950'
                : 'text-primary-400 hover:text-white hover:bg-primary-900/50'
            }`}
          >
            History
          </button>
        </div>

        {activeTab === 'active' && activeOrders.length > 0 && (
          <div className="flex items-center space-x-1 text-xs text-primary-500">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="font-mono hidden sm:inline">{activeOrders.length} running</span>
            <span className="font-mono sm:hidden">{activeOrders.length}</span>
          </div>
        )}
      </div>

      {/* Orders List */}
      {displayOrders.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-primary-900/20 border border-primary-800 rounded-lg">
          <div className="text-primary-600 mb-2">
            {activeTab === 'active' ? <Clock size={28} className="sm:w-8 sm:h-8 mx-auto" /> : <CheckCircle size={28} className="sm:w-8 sm:h-8 mx-auto" />}
          </div>
          <p className="text-xs sm:text-sm text-primary-500">
            {activeTab === 'active' ? 'No active orders' : 'No order history yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin">
          {displayOrders.map((order) => (
            <OrderItem 
              key={order.id}
              order={order}
              remainingTime={remainingTimes[order.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Shallow comparison untuk orders
  return (
    prevProps.orders.length === nextProps.orders.length &&
    prevProps.orders.map(o => o.id).join(',') === nextProps.orders.map(o => o.id).join(',')
  );
});

OrderBook.displayName = 'OrderBook';