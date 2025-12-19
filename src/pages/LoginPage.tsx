import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTradingStore } from '../stores/tradingStore';
import { tradingService } from '../services/tradingService';
import { TrendingUp, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useTradingStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await tradingService.login(email, password);
      setUser(response.user, response.token);
      toast.success('Authentication successful');
      navigate('/trading');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('superadmin@trading.com');
    setPassword('SuperAdmin123!');
  };

  return (
    <div className="min-h-screen bg-primary-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent to-accent/60 rounded-xl mb-6 shadow-glow">
            <TrendingUp size={32} className="text-primary-950" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-white tracking-tight">
            TRADING PRO
          </h1>
          <p className="text-sm text-primary-400 font-medium">Professional Trading Terminal</p>
        </div>

        {/* Login Card */}
        <div className="bg-primary-900/50 backdrop-blur-sm border border-primary-800 rounded-2xl p-8 shadow-2xl animate-slide-up">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-1">Sign In</h2>
            <p className="text-sm text-primary-500">Access your trading terminal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-2xs text-primary-400 uppercase tracking-wide mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-primary-900/50 border border-primary-800 rounded-lg px-4 py-3 text-sm text-white placeholder-primary-600 focus:outline-none focus:border-accent transition-colors"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-2xs text-primary-400 uppercase tracking-wide mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-primary-900/50 border border-primary-800 rounded-lg px-4 py-3 text-sm text-white placeholder-primary-600 focus:outline-none focus:border-accent transition-colors"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-primary-950 font-bold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center shadow-lg group"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Demo Account */}
          <div className="mt-6 pt-6 border-t border-primary-800">
            <button
              onClick={fillDemo}
              className="w-full text-sm text-primary-400 hover:text-accent transition-colors font-medium"
            >
              Use Demo Account
            </button>
            <div className="mt-3 p-3 bg-primary-900/30 border border-primary-800 rounded-lg">
              <div className="text-2xs text-primary-500 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-primary-400">superadmin@trading.com</span>
                </div>
                <div className="flex justify-between">
                  <span>Password:</span>
                  <span className="text-primary-400">SuperAdmin123!</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-2xs text-primary-600 font-medium">
            © 2024 Trading Pro. Professional terminal for serious traders.
          </p>
        </div>
      </div>
    </div>
  );
};