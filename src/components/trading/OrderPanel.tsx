import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Loader2, Calculator } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';

interface OrderPanelProps {
  assetName: string;
  currentPrice: number | null;
  profitRate: number;
  balance: number;
  onPlaceOrder: (direction: 'CALL' | 'PUT', amount: number, duration: number) => Promise<void>;
  disabled?: boolean;
}

const DURATIONS = [1, 2, 3, 5, 15, 30, 60];
const QUICK_AMOUNTS = [10000, 50000, 100000, 500000];

export const OrderPanel: React.FC<OrderPanelProps> = ({
  assetName,
  currentPrice,
  profitRate,
  balance,
  onPlaceOrder,
  disabled = false,
}) => {
  const [direction, setDirection] = useState<'CALL' | 'PUT'>('CALL');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const potentialProfit = amount ? (Number(amount) * profitRate) / 100 : 0;
  const potentialReturn = amount ? Number(amount) + potentialProfit : 0;

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter valid amount');
      return;
    }

    const numAmount = Number(amount);

    if (numAmount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (numAmount < 10000) {
      toast.error('Minimum order: Rp 10,000');
      return;
    }

    try {
      setIsSubmitting(true);
      await onPlaceOrder(direction, numAmount, duration);
      setAmount('');
      toast.success('Order placed successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || isSubmitting || !currentPrice;

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h3 className="text-xs sm:text-sm font-medium text-primary-300 uppercase tracking-wide">New Order</h3>
        <div className="text-left sm:text-right w-full sm:w-auto">
          <div className="text-2xs text-primary-500 uppercase tracking-wide">Available</div>
          <div className="text-sm font-bold font-mono text-white">{formatCurrency(balance)}</div>
        </div>
      </div>

      {/* Direction Selection - Responsive */}
      <div>
        <label className="block text-2xs text-primary-500 uppercase tracking-wide mb-2 sm:mb-3">Direction</label>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            onClick={() => setDirection('CALL')}
            disabled={isDisabled}
            className={`relative p-3 sm:p-4 rounded-lg border transition-all ${
              direction === 'CALL'
                ? 'border-bull bg-bull/10'
                : 'border-primary-800 hover:border-primary-700'
            } disabled:opacity-50 disabled:cursor-not-allowed group`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
              <ArrowUp size={18} className={`sm:w-5 sm:h-5 ${direction === 'CALL' ? 'text-bull' : 'text-primary-400 group-hover:text-bull'}`} />
              <span className={`font-bold text-sm sm:text-base ${direction === 'CALL' ? 'text-bull' : 'text-primary-300'}`}>CALL</span>
            </div>
            <p className="text-2xs text-center text-primary-500">Price goes up</p>
          </button>

          <button
            onClick={() => setDirection('PUT')}
            disabled={isDisabled}
            className={`relative p-3 sm:p-4 rounded-lg border transition-all ${
              direction === 'PUT'
                ? 'border-bear bg-bear/10'
                : 'border-primary-800 hover:border-primary-700'
            } disabled:opacity-50 disabled:cursor-not-allowed group`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
              <ArrowDown size={18} className={`sm:w-5 sm:h-5 ${direction === 'PUT' ? 'text-bear' : 'text-primary-400 group-hover:text-bear'}`} />
              <span className={`font-bold text-sm sm:text-base ${direction === 'PUT' ? 'text-bear' : 'text-primary-300'}`}>PUT</span>
            </div>
            <p className="text-2xs text-center text-primary-500">Price goes down</p>
          </button>
        </div>
      </div>

      {/* Amount Input - Responsive */}
      <div>
        <label className="block text-2xs text-primary-500 uppercase tracking-wide mb-2 sm:mb-3">Amount</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            disabled={isDisabled}
            className="w-full bg-primary-900/50 border border-primary-800 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg font-mono text-white placeholder-primary-600 focus:outline-none focus:border-accent focus:bg-primary-900 transition-colors disabled:opacity-50"
          />
          <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-primary-500">IDR</span>
        </div>
        
        {/* Quick Amounts - Responsive */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-2">
          {QUICK_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              disabled={isDisabled}
              className="bg-primary-900/50 border border-primary-800 rounded px-1.5 sm:px-2 py-1 sm:py-1.5 text-2xs font-mono text-primary-300 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
            >
              {(preset / 1000)}K
            </button>
          ))}
        </div>
      </div>

      {/* Duration Selection - Responsive */}
      <div>
        <label className="block text-2xs text-primary-500 uppercase tracking-wide mb-2 sm:mb-3">Duration</label>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              disabled={isDisabled}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all disabled:opacity-50 ${
                duration === d
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-primary-800 text-primary-300 hover:border-primary-700 hover:text-white'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      {/* Calculation Summary - Responsive */}
      <div className="bg-primary-900/30 border border-primary-800 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex items-center space-x-2 text-xs text-primary-400 mb-2">
          <Calculator size={12} className="sm:w-3.5 sm:h-3.5" />
          <span className="uppercase tracking-wide">Calculation</span>
        </div>
        
        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-primary-500">Investment</span>
            <span className="font-mono text-white">{formatCurrency(Number(amount) || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-primary-500">Profit Rate</span>
            <span className="font-mono text-accent">{profitRate}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-primary-500">Potential Profit</span>
            <span className="font-mono text-bull">+{formatCurrency(potentialProfit)}</span>
          </div>
          
          <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-primary-800 flex justify-between items-center">
            <span className="font-medium text-white">Potential Return</span>
            <span className="text-base sm:text-lg font-bold font-mono text-accent">
              {formatCurrency(potentialReturn)}
            </span>
          </div>
        </div>
      </div>

      {/* Submit Button - Responsive */}
      <button
        onClick={handleSubmit}
        disabled={isDisabled}
        className={`w-full py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base transition-all flex items-center justify-center ${
          direction === 'CALL'
            ? 'bg-bull hover:bg-bull/90 text-white'
            : 'bg-bear hover:bg-bear/90 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin mr-2" size={18} />
            Processing...
          </>
        ) : (
          `Execute ${direction}`
        )}
      </button>

      {!currentPrice && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            <span>Waiting for price data...</span>
          </div>
        </div>
      )}
    </div>
  );
};