import React from 'react';
import { Wallet, RefreshCw, User } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

interface MobileNavbarProps {
  balance: number;
  onRefresh: () => void;
  refreshing: boolean;
  onDashboardClick: () => void;
  onProfileClick: () => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({
  balance,
  onRefresh,
  refreshing,
  onDashboardClick,
  onProfileClick,
}) => {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-primary-900/95 backdrop-blur-sm border-b border-primary-800">
      <div className="flex items-center justify-between px-3 py-2.5">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent/60 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white">STC</span>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={`text-primary-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Balance */}
          <div className="bg-primary-800/50 rounded-lg px-3 py-1.5 flex items-center space-x-1.5">
            <Wallet size={14} className="text-accent" />
            <span className="text-xs font-bold font-mono text-white">
              {formatCurrency(balance)}
            </span>
          </div>

          {/* Dashboard Icon */}
          <button
            onClick={onDashboardClick}
            className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>

          {/* Avatar */}
          <button
            onClick={onProfileClick}
            className="w-8 h-8 bg-primary-800 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
          >
            <User size={16} className="text-primary-400" />
          </button>
        </div>
      </div>
    </div>
  );
};