import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Set auth token
  setAuthToken(token: string | null) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  // Auth
  async syncUser(data: { email: string; username: string; fullName: string; profileImage?: string }) {
    return this.client.post('/auth/sync', data);
  }

  async getMe() {
    return this.client.get('/auth/me');
  }

  async getAblyToken() {
    return this.client.get('/auth/ably-token');
  }

  async updateStatus(isOnline: boolean) {
    return this.client.patch('/auth/status', { isOnline });
  }

  // Users
  async getUserProfile(userId: string) {
    return this.client.get(`/users/${userId}`);
  }

  async updateProfile(data: { fullName?: string; username?: string; profileImage?: string }) {
    return this.client.patch('/users/profile', data);
  }

  async getClientProfile() {
    return this.client.get('/users/client/profile');
  }

  async getFavorites() {
    return this.client.get('/users/favorites');
  }

  async addFavorite(readerId: string) {
    return this.client.post(`/users/favorites/${readerId}`);
  }

  async removeFavorite(readerId: string) {
    return this.client.delete(`/users/favorites/${readerId}`);
  }

  // Readers
  async getReaders(params?: { specialty?: string; status?: string; page?: number; limit?: number }) {
    return this.client.get('/readers', { params });
  }

  async getOnlineReaders() {
    return this.client.get('/readers/online');
  }

  async getReaderProfile(slug: string) {
    return this.client.get(`/readers/profile/${slug}`);
  }

  async getMyReaderProfile() {
    return this.client.get('/readers/me');
  }

  async updateReaderProfile(data: any) {
    return this.client.patch('/readers/me', data);
  }

  async updateReaderStatus(status: 'online' | 'offline' | 'busy' | 'in_session') {
    return this.client.patch('/readers/me/status', { status });
  }

  async getReaderEarnings(period?: string) {
    return this.client.get('/readers/me/earnings', { params: { period } });
  }

  // Sessions
  async requestSession(readerId: string, type: 'chat' | 'voice' | 'video') {
    return this.client.post('/sessions/request', { readerId, type });
  }

  async acceptSession(sessionId: string) {
    return this.client.post(`/sessions/${sessionId}/accept`);
  }

  async declineSession(sessionId: string, reason?: string) {
    return this.client.post(`/sessions/${sessionId}/decline`, { reason });
  }

  async endSession(sessionId: string) {
    return this.client.post(`/sessions/${sessionId}/end`);
  }

  async getSession(sessionId: string) {
    return this.client.get(`/sessions/${sessionId}`);
  }

  async sendSessionMessage(sessionId: string, content: string, type?: string) {
    return this.client.post(`/sessions/${sessionId}/messages`, { content, type });
  }

  async getSessionMessages(sessionId: string) {
    return this.client.get(`/sessions/${sessionId}/messages`);
  }

  async submitReview(sessionId: string, rating: number, comment?: string) {
    return this.client.post(`/sessions/${sessionId}/review`, { rating, comment });
  }

  async getSessionHistory(role: 'client' | 'reader', page?: number, limit?: number) {
    return this.client.get('/sessions', { params: { role, page, limit } });
  }

  // Payments
  async addFunds(amount: number) {
    return this.client.post('/payments/add-funds', { amount });
  }

  async getBalance() {
    return this.client.get('/payments/balance');
  }

  async getPaymentMethods() {
    return this.client.get('/payments/methods');
  }

  async setDefaultPaymentMethod(methodId: string) {
    return this.client.patch(`/payments/methods/${methodId}/default`);
  }

  async deletePaymentMethod(methodId: string) {
    return this.client.delete(`/payments/methods/${methodId}`);
  }

  async getTransactions(page?: number, limit?: number) {
    return this.client.get('/payments/transactions', { params: { page, limit } });
  }

  async getReaderEarningsData() {
    return this.client.get('/payments/reader/earnings');
  }

  async setupStripeConnect() {
    return this.client.post('/payments/reader/connect/setup');
  }

  async getConnectStatus() {
    return this.client.get('/payments/reader/connect/status');
  }

  async requestPayout() {
    return this.client.post('/payments/reader/payout');
  }

  // Live Streams
  async getLiveStreams() {
    return this.client.get('/streams/live');
  }

  async getScheduledStreams() {
    return this.client.get('/streams/scheduled');
  }

  async getStream(streamId: string) {
    return this.client.get(`/streams/${streamId}`);
  }

  async createStream(data: { title: string; description?: string; type?: string; scheduledStart?: string }) {
    return this.client.post('/streams', data);
  }

  async startStream(streamId: string) {
    return this.client.post(`/streams/${streamId}/start`);
  }

  async endStream(streamId: string) {
    return this.client.post(`/streams/${streamId}/end`);
  }

  async joinStream(streamId: string) {
    return this.client.post(`/streams/${streamId}/join`);
  }

  async leaveStream(streamId: string) {
    return this.client.post(`/streams/${streamId}/leave`);
  }

  async getGifts() {
    return this.client.get('/streams/gifts/list');
  }

  async sendGift(streamId: string, giftId: string, quantity?: number) {
    return this.client.post(`/streams/${streamId}/gift`, { giftId, quantity });
  }

  // Shop
  async getProducts(params?: { category?: string; type?: string; page?: number; limit?: number }) {
    return this.client.get('/shop/products', { params });
  }

  async getProduct(productId: string) {
    return this.client.get(`/shop/products/${productId}`);
  }

  async getCategories() {
    return this.client.get('/shop/categories');
  }

  async checkout(items: Array<{ productId: string; quantity: number }>, shippingAddress?: any) {
    return this.client.post('/shop/checkout', { items, shippingAddress });
  }

  async getOrders(page?: number, limit?: number) {
    return this.client.get('/shop/orders', { params: { page, limit } });
  }

  async getOrder(orderId: string) {
    return this.client.get(`/shop/orders/${orderId}`);
  }

  // Messages
  async getConversations() {
    return this.client.get('/messages/conversations');
  }

  async getOrCreateConversation(userId: string) {
    return this.client.post('/messages/conversations', { userId });
  }

  async getMessages(conversationId: string, page?: number, limit?: number) {
    return this.client.get(`/messages/conversations/${conversationId}`, { params: { page, limit } });
  }

  async sendMessage(conversationId: string, content: string, type?: string, isPaid?: boolean, price?: number) {
    return this.client.post(`/messages/conversations/${conversationId}/messages`, { content, type, isPaid, price });
  }

  async markAsRead(conversationId: string) {
    return this.client.patch(`/messages/conversations/${conversationId}/read`);
  }

  async getUnreadCount() {
    return this.client.get('/messages/unread-count');
  }

  // Forum
  async getForumCategories() {
    return this.client.get('/forum/categories');
  }

  async getForumPosts(categoryId: string, page?: number, limit?: number) {
    return this.client.get(`/forum/categories/${categoryId}/posts`, { params: { page, limit } });
  }

  async getForumPost(postId: string) {
    return this.client.get(`/forum/posts/${postId}`);
  }

  async createForumPost(categoryId: string, title: string, content: string, images?: string[]) {
    return this.client.post('/forum/posts', { categoryId, title, content, images });
  }

  async createForumReply(postId: string, content: string, parentReplyId?: string) {
    return this.client.post(`/forum/posts/${postId}/replies`, { content, parentReplyId });
  }

  // Admin
  async getAdminStats(period?: string) {
    return this.client.get('/admin/stats', { params: { period } });
  }

  async getAdminUsers(params?: { page?: number; limit?: number; role?: string }) {
    return this.client.get('/admin/users', { params });
  }

  async createReaderAccount(data: any) {
    return this.client.post('/admin/readers', data);
  }

  async updateReaderAccount(readerId: string, data: any) {
    return this.client.patch(`/admin/readers/${readerId}`, data);
  }

  // ===== Notifications =====
  async getNotifications(params?: { limit?: number; offset?: number }) {
    return this.client.get('/notifications', { params });
  }

  async markNotificationRead(notificationId: string) {
    return this.client.patch(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsRead() {
    return this.client.patch('/notifications/read-all');
  }
}

export const api = new ApiService();
export default api;
