import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';

interface MobileOrderPanelProps {
  currentPrice: number | null;
  profitRate: number;
  balance: number;
  onPlaceOrder: (direction: 'CALL' | 'PUT', amount: number, duration: number) => Promise<void>;
  disabled?: boolean;
}

const DURATIONS = [1, 2, 3, 5, 15, 30];
const QUICK_AMOUNTS = [10000, 50000, 100000, 500000, 1000000];

export const MobileOrderPanel: React.FC<MobileOrderPanelProps> = ({
  currentPrice,
  profitRate,
  balance,
  onPlaceOrder,
  disabled = false,
}) => {
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAmountPicker, setShowAmountPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const potentialProfit = amount ? (Number(amount) * profitRate) / 100 : 0;
  const potentialReturn = amount ? Number(amount) + potentialProfit : 0;

  const handlePlaceOrder = async (direction: 'CALL' | 'PUT') => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Masukkan jumlah taruhan');
      return;
    }

    const numAmount = Number(amount);

    if (numAmount > balance) {
      toast.error('Saldo tidak cukup');
      return;
    }

    if (numAmount < 10000) {
      toast.error('Minimal Rp 10,000');
      return;
    }

    try {
      setIsSubmitting(true);
      await onPlaceOrder(direction, numAmount, duration);
      setAmount('');
      toast.success('Order berhasil!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal membuat order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lg:hidden w-full">
      {/* Grid 2 Kolom x 3 Baris */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {/* Baris 1 Kolom 1: Duration Picker */}
        <div className="relative">
          <button
            onClick={() => setShowDurationPicker(!showDurationPicker)}
            disabled={disabled}
            className="w-full bg-primary-900/50 border border-primary-800 rounded-lg px-3 py-3 text-left flex items-center justify-between hover:border-accent transition-colors disabled:opacity-50"
          >
            <div>
              <div className="text-2xs text-primary-500 mb-0.5">Waktu</div>
              <div className="text-sm font-bold text-white">{duration}m</div>
            </div>
            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Duration Dropdown */}
          {showDurationPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-primary-900 border border-primary-800 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDuration(d);
                    setShowDurationPicker(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    duration === d
                      ? 'bg-accent text-primary-950 font-bold'
                      : 'text-white hover:bg-primary-800'
                  }`}
                >
                  {d} Menit
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Baris 1 Kolom 2: Amount Picker */}
        <div className="relative">
          <button
            onClick={() => setShowAmountPicker(!showAmountPicker)}
            disabled={disabled}
            className="w-full bg-primary-900/50 border border-primary-800 rounded-lg px-3 py-3 text-left flex items-center justify-between hover:border-accent transition-colors disabled:opacity-50"
          >
            <div className="flex-1 min-w-0">
              <div className="text-2xs text-primary-500 mb-0.5">Jumlah</div>
              <div className="text-sm font-bold text-white font-mono truncate">
                {amount ? `${(Number(amount) / 1000).toFixed(0)}K` : '0'}
              </div>
            </div>
            <svg className="w-4 h-4 text-primary-500 flex-shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Amount Dropdown */}
          {showAmountPicker && (
            <div className="absolute top-full right-0 left-0 mt-1 bg-primary-900 border border-primary-800 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
              {/* Custom Input */}
              <div className="p-2 border-b border-primary-800">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Custom"
                  className="w-full bg-primary-950 border border-primary-800 rounded px-2 py-1.5 text-sm text-white placeholder-primary-600 focus:outline-none focus:border-accent"
                />
              </div>
              {/* Quick Amounts */}
              {QUICK_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setAmount(preset.toString());
                    setShowAmountPicker(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    Number(amount) === preset
                      ? 'bg-accent text-primary-950 font-bold'
                      : 'text-white hover:bg-primary-800'
                  }`}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Baris 2: Info Rate & Profit (Span 2 Kolom) */}
        <div className="col-span-2 bg-primary-900/30 border border-primary-800 rounded-lg px-3 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs text-primary-500">Rate Profit</span>
            <span className="text-xs font-bold text-accent">{profitRate}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xs text-primary-500">Potensi Hasil</span>
            <span className="text-sm font-bold text-bull font-mono">
              {formatCurrency(potentialReturn)}
            </span>
          </div>
        </div>

        {/* Baris 3: Buy & Sell Buttons */}
        <button
          onClick={() => handlePlaceOrder('CALL')}
          disabled={disabled || isSubmitting || !currentPrice}
          className="bg-bull hover:bg-bull/90 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center space-y-1 shadow-lg active:scale-95"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <ArrowUp size={24} strokeWidth={3} />
              <span className="text-xs">BUY</span>
            </>
          )}
        </button>

        <button
          onClick={() => handlePlaceOrder('PUT')}
          disabled={disabled || isSubmitting || !currentPrice}
          className="bg-bear hover:bg-bear/90 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center space-y-1 shadow-lg active:scale-95"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <ArrowDown size={24} strokeWidth={3} />
              <span className="text-xs">SELL</span>
            </>
          )}
        </button>
      </div>

      {/* Warning jika tidak ada price */}
      {!currentPrice && (
        <div className="px-3 pb-3">
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            <span className="text-2xs text-warning">Menunggu data harga...</span>
          </div>
        </div>
      )}
    </div>
  );
};