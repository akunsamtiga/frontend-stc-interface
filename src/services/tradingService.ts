import api from './api';

export const tradingService = {
  async getAssets() {
    const response = await api.get('/assets', { params: { activeOnly: true } });
    return response.data;
  },

  async getBalance() {
    const response = await api.get('/balance/current');
    return response.data;
  },

  async createOrder(orderData: {
    asset_id: string;
    direction: 'CALL' | 'PUT';
    amount: number;
    duration: number;
  }) {
    const response = await api.post('/binary-orders', orderData);
    return response.data;
  },

  // FIX: Removed invalid 'sort' parameter
  async getOrders(status?: string) {
    const params: any = { limit: 100 };
    if (status) {
      params.status = status;
    }
    const response = await api.get('/binary-orders', { params });
    return response.data;
  },

  async getOrderById(orderId: string) {
    const response = await api.get(`/binary-orders/${orderId}`);
    return response.data;
  },

  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async getUserProfile() {
    const response = await api.get('/user/profile');
    return response.data;
  },
};
