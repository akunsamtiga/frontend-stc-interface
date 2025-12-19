export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPrice = (price: number, decimals: number = 3): string => {
  return price.toFixed(decimals);
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatTime = (date: string | Date): string => {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const formatRemainingTime = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const calculateRemainingTime = (entryTime: string, duration: number): number => {
  const entry = new Date(entryTime).getTime();
  const now = Date.now();
  const expiryTime = entry + duration * 60 * 1000;
  const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
  return remaining;
};
