import api, { retryRequest } from './api';

export const tradingService = {
  // ✅ Get assets dengan retry
  async getAssets() {
    return retryRequest(async () => {
      const response = await api.get('/assets', { params: { activeOnly: true } });
      return response.data;
    }, 2);
  },

  // ✅ Get balance dengan retry
  async getBalance() {
    return retryRequest(async () => {
      const response = await api.get('/balance/current');
      return response.data;
    }, 2);
  },

  // ✅ Create order - NO RETRY untuk prevent duplicate orders
  async createOrder(orderData: {
    asset_id: string;
    direction: 'CALL' | 'PUT';
    amount: number;
    duration: number;
  }) {
    // ✅ NO RETRY untuk create order!
    const response = await api.post('/binary-orders', orderData, {
      timeout: 15000, // Longer timeout untuk order
    });
    return response.data;
  },

  // ✅ Get orders dengan retry dan caching
  async getOrders(status?: string) {
    return retryRequest(async () => {
      const params: any = { limit: 100 };
      if (status) {
        params.status = status;
      }
      const response = await api.get('/binary-orders', { 
        params,
        timeout: 8000, // Shorter timeout
      });
      return response.data;
    }, 1); // Only 1 retry
  },

  // ✅ Get order by ID
  async getOrderById(orderId: string) {
    return retryRequest(async () => {
      const response = await api.get(`/binary-orders/${orderId}`);
      return response.data;
    }, 2);
  },

  // ✅ Login - NO RETRY
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // ✅ Get user profile dengan retry
  async getUserProfile() {
    return retryRequest(async () => {
      const response = await api.get('/user/profile');
      return response.data;
    }, 2);
  },
};