# Binary Trading Pro - Frontend V2 🚀

Professional real-time trading interface with Firebase integration for binary options trading.

## ✨ Features

### Real-time Features
- 📊 **Live Price Updates** - Real-time price streaming from Firebase
- 📈 **OHLC Charts** - Professional candlestick charts with Lightweight Charts
- ⚡ **Instant Sync** - Sub-second latency for price updates
- 🔄 **Auto Refresh** - Automatic order and balance updates
- 🎯 **Active Orders** - Real-time tracking with countdown timers

### Trading Features
- 💹 **CALL/PUT Orders** - Easy-to-use order placement
- ⏱️ **Multiple Durations** - 1m to 60m trading periods
- 💰 **Quick Amounts** - Preset investment amounts
- 📊 **Profit Calculator** - Real-time profit estimation
- 📖 **Order Book** - Active and historical orders

### Technical Features
- ⚛️ **React 18** + TypeScript
- 🔥 **Firebase Realtime Database** - Live data sync
- 🏪 **Zustand** - Efficient state management
- 📈 **Lightweight Charts** - Professional charting
- 🎨 **TailwindCSS** - Modern UI design
- 🍞 **React Hot Toast** - Elegant notifications

## 🚀 Quick Start

### 1. Run Setup Script

```bash
bash setupTradingFrontend.sh
cd trading-frontend-v2
```

### 2. Configure Environment

Edit `.env`:

```bash
# Backend API
VITE_API_URL=http://localhost:3000/api/v1

# Firebase (must match your simulator config)
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com/

# App Config
VITE_APP_NAME=Binary Trading Pro
VITE_ENABLE_FIREBASE_REALTIME=true
```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3002
```

### 4. Login

```
Email: superadmin@trading.com
Password: SuperAdmin123!
```

## 📊 Firebase Integration

### Data Flow

```
Firebase Realtime DB → Frontend
   ↓
/idx_stc/current_price → Live price updates
/idx_stc/ohlc → Chart data
   ↓
React Components → Real-time UI updates
```

### Subscription System

The app automatically subscribes to:
- **Price Updates**: Real-time current price
- **OHLC Data**: Candlestick chart updates
- **Auto Cleanup**: Unsubscribes on component unmount

### Performance

- **Update Latency**: < 100ms
- **Data Points**: Last 1000 candles
- **Memory Management**: Auto cleanup old data
- **Connection Status**: Live monitoring

## 🎯 Key Components

### TradingPage
Main trading interface with:
- Asset selection
- Balance display
- Connection status
- Chart and order panels

### TradingChart
Professional candlestick chart:
- Real-time updates
- Zoom and pan
- Crosshair cursor
- Time scale

### OrderPanel
Order placement interface:
- CALL/PUT selection
- Amount input
- Duration selection
- Profit calculator
- Validation

### OrderBook
Order management:
- Active orders with countdown
- Recent order history
- Progress indicators
- Profit/loss display

### PriceTicker
Live price display:
- Current price
- Price change indicator
- Connection status
- Last update time

## ⚙️ Configuration

### API Endpoints

```typescript
// tradingService.ts
const endpoints = {
  assets: '/assets',
  balance: '/balance/current',
  orders: '/binary-orders',
  login: '/auth/login',
};
```

### Firebase Paths

```
/${assetSymbol.toLowerCase()}/
  ├── current_price/     # Live price
  ├── ohlc/             # OHLC data
  └── stats/            # Statistics
```

### Update Intervals

```typescript
// Auto-refresh intervals
const ORDERS_REFRESH = 10000;  // 10 seconds
const FIREBASE_REALTIME = true; // Instant updates
```

## 🎨 UI/UX Features

### Responsive Design
- Desktop optimized (1920px max-width)
- Mobile friendly
- Adaptive layouts

### Animations
- Smooth transitions
- Slide-up effects
- Fade-in animations
- Progress bars
- Pulse indicators

### Color Scheme
```css
trading-bg: #0a0e17      // Background
trading-card: #131722    // Cards
trading-hover: #1e222d   // Hover states
trading-border: #2a2e39  // Borders
trading-up: #26a69a      // Bullish/CALL
trading-down: #ef5350    // Bearish/PUT
```

### Notifications
- Success toasts (green)
- Error toasts (red)
- Info toasts (blue)
- Auto-dismiss (3s)

## 🔧 Development

### Project Structure

```
src/
├── components/
│   ├── charts/
│   │   └── TradingChart.tsx
│   ├── trading/
│   │   ├── PriceTicker.tsx
│   │   ├── OrderPanel.tsx
│   │   └── OrderBook.tsx
│   └── common/
│       └── ConnectionStatus.tsx
├── pages/
│   ├── LoginPage.tsx
│   └── TradingPage.tsx
├── services/
│   ├── api.ts
│   ├── tradingService.ts
│   └── firebaseService.ts
├── stores/
│   └── tradingStore.ts
├── config/
│   └── firebase.ts
├── types/
│   └── index.ts
└── utils/
    └── format.ts
```

### Build for Production

```bash
npm run build
npm run preview
```

### Environment Variables

```bash
# Development
.env

# Production
.env.production
```

## 🔌 Integration Guide

### With Simulator

1. Start simulator first:
```bash
cd trading-simulator
npm start
```

2. Start frontend:
```bash
cd trading-frontend-v2
npm run dev
```

3. Ensure same Firebase database URL in both

### With Backend API

Backend must be running at `http://localhost:3000`:
- `/api/v1/auth/login` - Authentication
- `/api/v1/assets` - Asset list
- `/api/v1/binary-orders` - Order management
- `/api/v1/balance/current` - Balance info

## 📱 Usage Guide

### 1. Login
- Enter email and password
- Or use "Demo Account" button
- Auto-redirect to trading page

### 2. Select Asset
- Choose from dropdown in header
- Price updates automatically
- Chart loads historical data

### 3. Place Order
- Select CALL (up) or PUT (down)
- Enter amount or use presets
- Choose duration (1-60 minutes)
- Click "Place Order"
- Confirm in order book

### 4. Monitor Orders
- Active orders show countdown
- Progress bar indicates time remaining
- Auto-refreshes every 10 seconds
- Win/loss calculated at expiry

### 5. Check Results
- Recent orders show in order book
- Green = Won, Red = Lost
- Profit/loss displayed
- Balance updates automatically

## 🐛 Troubleshooting

### Firebase Connection Issues

```bash
# Check Firebase URL
echo $VITE_FIREBASE_DATABASE_URL

# Test Firebase connection
# Open browser console, should see:
# "Firebase initialized successfully"
```

### Price Not Updating

1. Check simulator is running
2. Verify Firebase database URL matches
3. Check browser console for errors
4. Look for "Connected" status in UI

### Orders Not Appearing

1. Check backend API is running
2. Verify authentication token
3. Check network tab for API calls
4. Refresh orders manually

### Chart Not Loading

1. Wait for OHLC data (may take few seconds)
2. Check browser console for errors
3. Verify OHLC data in Firebase
4. Refresh page

## 📊 Performance Tips

### Optimize Bundle Size
```javascript
// vite.config.ts already configured with:
manualChunks: {
  'react-vendor': ['react', 'react-dom'],
  'firebase-vendor': ['firebase'],
  'chart-vendor': ['lightweight-charts']
}
```

### Reduce Memory Usage
- OHLC data limited to 1000 candles
- Price history capped at 1000 points
- Auto-cleanup of old subscriptions

### Improve Load Time
- Code splitting enabled
- Lazy loading for routes
- Optimized images
- Compressed assets

## 📝 License

MIT

## 🤝 Support

For issues:
1. Check browser console
2. Verify Firebase connection
3. Test backend API
4. Review network requests

---

**Binary Trading Pro V2** - Real-time Trading Excellence 🚀📊
