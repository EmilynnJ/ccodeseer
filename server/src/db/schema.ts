import { pgTable, uuid, varchar, text, timestamp, boolean, decimal, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['client', 'reader', 'admin']);
export const readerStatusEnum = pgEnum('reader_status', ['online', 'offline', 'busy', 'in_session']);
export const stripeStatusEnum = pgEnum('stripe_status', ['pending', 'active', 'restricted']);
export const sessionTypeEnum = pgEnum('session_type', ['chat', 'voice', 'video']);
export const sessionStatusEnum = pgEnum('session_status', ['pending', 'active', 'completed', 'cancelled', 'disputed']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'audio', 'system']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'reading_payment', 'reading_earning', 'payout', 'refund', 'gift', 'shop_purchase']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed', 'refunded']);
export const streamTypeEnum = pgEnum('stream_type', ['public', 'premium', 'private']);
export const streamStatusEnum = pgEnum('stream_status', ['scheduled', 'live', 'ended']);
export const productTypeEnum = pgEnum('product_type', ['physical', 'digital', 'service']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  username: varchar('username', { length: 100 }).unique().notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  profileImage: text('profile_image'),
  role: userRoleEnum('role').default('client').notNull(),
  isOnline: boolean('is_online').default(false).notNull(),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Reader profiles table
export const readerProfiles = pgTable('reader_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  bio: text('bio').notNull(),
  specialties: jsonb('specialties').$type<string[]>().default([]).notNull(),
  profileImage: text('profile_image').notNull(),
  coverImage: text('cover_image'),
  chatRatePerMin: decimal('chat_rate_per_min', { precision: 10, scale: 2 }).notNull(),
  voiceRatePerMin: decimal('voice_rate_per_min', { precision: 10, scale: 2 }).notNull(),
  videoRatePerMin: decimal('video_rate_per_min', { precision: 10, scale: 2 }).notNull(),
  isAvailable: boolean('is_available').default(false).notNull(),
  status: readerStatusEnum('status').default('offline').notNull(),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0').notNull(),
  totalReviews: integer('total_reviews').default(0).notNull(),
  totalReadings: integer('total_readings').default(0).notNull(),
  pendingBalance: decimal('pending_balance', { precision: 10, scale: 2 }).default('0').notNull(),
  totalEarned: decimal('total_earned', { precision: 10, scale: 2 }).default('0').notNull(),
  totalPaidOut: decimal('total_paid_out', { precision: 10, scale: 2 }).default('0').notNull(),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  stripeAccountStatus: stripeStatusEnum('stripe_account_status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Client profiles table
export const clientProfiles = pgTable('client_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).unique().notNull(),
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0').notNull(),
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0').notNull(),
  autoReloadEnabled: boolean('auto_reload_enabled').default(false).notNull(),
  autoReloadAmount: decimal('auto_reload_amount', { precision: 10, scale: 2 }),
  autoReloadThreshold: decimal('auto_reload_threshold', { precision: 10, scale: 2 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  defaultPaymentMethodId: varchar('default_payment_method_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Favorite readers (client -> reader relationship)
export const favoriteReaders = pgTable('favorite_readers', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => users.id).notNull(),
  readerId: uuid('reader_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Reading sessions table
export const readingSessions = pgTable('reading_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => users.id).notNull(),
  readerId: uuid('reader_id').references(() => users.id).notNull(),
  type: sessionTypeEnum('type').notNull(),
  status: sessionStatusEnum('status').default('pending').notNull(),
  ratePerMin: decimal('rate_per_min', { precision: 10, scale: 2 }).notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  duration: integer('duration').default(0).notNull(), // in seconds
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  platformFee: decimal('platform_fee', { precision: 10, scale: 2 }).default('0').notNull(),
  readerEarnings: decimal('reader_earnings', { precision: 10, scale: 2 }).default('0').notNull(),
  agoraChannelName: varchar('agora_channel_name', { length: 255 }),
  ablyChannelName: varchar('ably_channel_name', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Session messages (for chat readings)
export const sessionMessages = pgTable('session_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => readingSessions.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  type: messageTypeEnum('type').default('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Conversations (for direct messaging outside readings)
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  participantOneId: uuid('participant_one_id').references(() => users.id).notNull(),
  participantTwoId: uuid('participant_two_id').references(() => users.id).notNull(),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Direct messages
export const directMessages = pgTable('direct_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  type: messageTypeEnum('type').default('text').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Reviews table
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => readingSessions.id).notNull(),
  clientId: uuid('client_id').references(() => users.id).notNull(),
  readerId: uuid('reader_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  readerResponse: text('reader_response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  sessionId: uuid('session_id').references(() => readingSessions.id),
  type: transactionTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  fee: decimal('fee', { precision: 10, scale: 2 }).default('0').notNull(),
  netAmount: decimal('net_amount', { precision: 10, scale: 2 }).notNull(),
  status: transactionStatusEnum('status').default('pending').notNull(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
  description: text('description').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Pending payouts for readers
export const pendingPayouts = pgTable('pending_payouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  readerId: uuid('reader_id').references(() => users.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Live streams table
export const liveStreams = pgTable('live_streams', {
  id: uuid('id').defaultRandom().primaryKey(),
  readerId: uuid('reader_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  status: streamStatusEnum('status').default('scheduled').notNull(),
  type: streamTypeEnum('type').default('public').notNull(),
  scheduledStart: timestamp('scheduled_start'),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  viewerCount: integer('viewer_count').default(0).notNull(),
  peakViewerCount: integer('peak_viewer_count').default(0).notNull(),
  totalGiftsValue: decimal('total_gifts_value', { precision: 10, scale: 2 }).default('0').notNull(),
  agoraChannelName: varchar('agora_channel_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Gifts table
export const gifts = pgTable('gifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  imageUrl: text('image_url').notNull(),
  animationUrl: text('animation_url'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Gift transactions table
export const giftTransactions = pgTable('gift_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  giftId: uuid('gift_id').references(() => gifts.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  receiverId: uuid('receiver_id').references(() => users.id).notNull(),
  streamId: uuid('stream_id').references(() => liveStreams.id),
  sessionId: uuid('session_id').references(() => readingSessions.id),
  quantity: integer('quantity').default(1).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Shop products table
export const shopProducts = pgTable('shop_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  readerId: uuid('reader_id').references(() => users.id),
  stripeProductId: varchar('stripe_product_id', { length: 255 }).notNull(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  type: productTypeEnum('type').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  inventory: integer('inventory'),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Orders table
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => users.id).notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0').notNull(),
  shipping: decimal('shipping', { precision: 10, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb('shipping_address'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Order items table
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: uuid('product_id').references(() => shopProducts.id).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  readerId: uuid('reader_id').references(() => users.id),
  readerEarnings: decimal('reader_earnings', { precision: 10, scale: 2 }),
});

// Forum categories table
export const forumCategories = pgTable('forum_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Forum posts table
export const forumPosts = pgTable('forum_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  categoryId: uuid('category_id').references(() => forumCategories.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  images: jsonb('images').$type<string[]>().default([]),
  isPinned: boolean('is_pinned').default(false).notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  replyCount: integer('reply_count').default(0).notNull(),
  lastReplyAt: timestamp('last_reply_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Forum replies table
export const forumReplies = pgTable('forum_replies', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => forumPosts.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  parentReplyId: uuid('parent_reply_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  readerProfile: one(readerProfiles, {
    fields: [users.id],
    references: [readerProfiles.userId],
  }),
  clientProfile: one(clientProfiles, {
    fields: [users.id],
    references: [clientProfiles.userId],
  }),
  notifications: many(notifications),
}));

export const readerProfilesRelations = relations(readerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [readerProfiles.userId],
    references: [users.id],
  }),
}));

export const clientProfilesRelations = relations(clientProfiles, ({ one }) => ({
  user: one(users, {
    fields: [clientProfiles.userId],
    references: [users.id],
  }),
}));
