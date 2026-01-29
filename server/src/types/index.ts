export type UserRole = 'client' | 'reader' | 'admin';

export interface User {
  id: string;
  clerkId: string;
  email: string;
  username: string;
  fullName: string;
  profileImage?: string;
  role: UserRole;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReaderProfile {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  bio: string;
  specialties: string[];
  profileImage: string;
  coverImage?: string;
  chatRatePerMin: number;
  voiceRatePerMin: number;
  videoRatePerMin: number;
  isAvailable: boolean;
  status: 'online' | 'offline' | 'busy' | 'in_session';
  rating: number;
  totalReviews: number;
  totalReadings: number;
  stripeAccountId?: string;
  stripeAccountStatus: 'pending' | 'active' | 'restricted';
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientProfile {
  id: string;
  userId: string;
  balance: number;
  totalSpent: number;
  autoReloadEnabled: boolean;
  autoReloadAmount?: number;
  autoReloadThreshold?: number;
  favoriteReaders: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadingSession {
  id: string;
  clientId: string;
  readerId: string;
  type: 'chat' | 'voice' | 'video';
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
  ratePerMin: number;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  totalAmount: number;
  platformFee: number;
  readerEarnings: number;
  agoraChannelName?: string;
  ablyChannelName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  sessionId?: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'system';
  isRead: boolean;
  isPaid: boolean;
  createdAt: Date;
}

export interface Review {
  id: string;
  sessionId: string;
  clientId: string;
  readerId: string;
  rating: number;
  comment?: string;
  readerResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'reading_payment' | 'reading_earning' | 'payout' | 'refund' | 'gift' | 'shop_purchase';
  amount: number;
  fee: number;
  netAmount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface LiveStream {
  id: string;
  readerId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  status: 'scheduled' | 'live' | 'ended';
  type: 'public' | 'premium' | 'private';
  scheduledStart?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  viewerCount: number;
  peakViewerCount: number;
  totalGiftsValue: number;
  agoraChannelName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Gift {
  id: string;
  name: string;
  imageUrl: string;
  animationUrl?: string;
  price: number;
  isActive: boolean;
  createdAt: Date;
}

export interface GiftTransaction {
  id: string;
  giftId: string;
  senderId: string;
  receiverId: string;
  streamId?: string;
  sessionId?: string;
  quantity: number;
  totalPrice: number;
  createdAt: Date;
}

export interface ShopProduct {
  id: string;
  readerId?: string;
  stripeProductId: string;
  stripePriceId: string;
  name: string;
  description: string;
  images: string[];
  type: 'physical' | 'digital' | 'service';
  category: string;
  price: number;
  inventory?: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  customerId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress?: ShippingAddress;
  stripePaymentIntentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  readerId?: string;
  readerEarnings?: number;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ForumPost {
  id: string;
  authorId: string;
  categoryId: string;
  title: string;
  content: string;
  images?: string[];
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  parentReplyId?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}
