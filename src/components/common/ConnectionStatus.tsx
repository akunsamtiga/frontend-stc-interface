import React from 'react';
import { Circle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate: Date | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  lastUpdate 
}) => {
  return (
    <div className="inline-flex items-center space-x-2">
      <Circle 
        size={8} 
        className={`${
          isConnected 
            ? 'text-accent fill-accent animate-pulse-slow' 
            : 'text-primary-600 fill-primary-600'
        }`}
      />
      <span className={`text-2xs font-medium uppercase tracking-wide ${
        isConnected ? 'text-accent' : 'text-primary-600'
      }`}>
        {isConnected ? 'Live' : 'Offline'}
      </span>
      {lastUpdate && isConnected && (
        <span className="text-2xs text-primary-600 font-mono">
          • {lastUpdate.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </span>
      )}
    </div>
  );
};