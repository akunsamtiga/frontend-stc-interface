import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTradingStore } from './stores/tradingStore';
import { LoginPage } from './pages/LoginPage';
import { TradingPage } from './pages/TradingPage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useTradingStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/trading"
            element={
              <PrivateRoute>
                <TradingPage />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/trading" replace />} />
        </Routes>
      </BrowserRouter>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e222d',
            color: '#fff',
            border: '1px solid #2a2e39',
          },
          success: {
            iconTheme: {
              primary: '#26a69a',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef5350',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
};

export default App;
