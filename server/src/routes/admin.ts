import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler.js';
import { db } from '../db/index.js';
import {
  users, readerProfiles, clientProfiles, readingSessions, transactions,
  liveStreams, shopProducts, orders, notifications, gifts
} from '../db/schema.js';
import { eq, desc, sql, and, count, sum, gte, lte } from 'drizzle-orm';
import { createConnectAccount } from '../config/stripe.js';

const router = Router();

// ===== Dashboard Stats =====
router.get('/stats', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  let startDate: Date;
  switch (period) {
    case '7d':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Total users
  const [{ totalUsers }] = await db
    .select({ totalUsers: count() })
    .from(users);

  // Total readers
  const [{ totalReaders }] = await db
    .select({ totalReaders: count() })
    .from(readerProfiles);

  // Total revenue in period
  const [{ totalRevenue }] = await db
    .select({ totalRevenue: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'reading_payment'),
        gte(transactions.createdAt, startDate)
      )
    );

  // Platform fees in period
  const [{ platformFees }] = await db
    .select({ platformFees: sql<number>`COALESCE(SUM(${readingSessions.platformFee}), 0)` })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.status, 'completed'),
        gte(readingSessions.createdAt, startDate)
      )
    );

  // Active sessions today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [{ activeSessions }] = await db
    .select({ activeSessions: count() })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.status, 'active')
      )
    );

  // Live streams active
  const [{ activeStreams }] = await db
    .select({ activeStreams: count() })
    .from(liveStreams)
    .where(eq(liveStreams.status, 'live'));

  // New users in period
  const [{ newUsers }] = await db
    .select({ newUsers: count() })
    .from(users)
    .where(gte(users.createdAt, startDate));

  res.json({
    success: true,
    data: {
      totalUsers,
      totalReaders,
      totalRevenue: Number(totalRevenue),
      platformFees: Number(platformFees),
      activeSessions,
      activeStreams,
      newUsers,
      period,
    },
  });
}));

// ===== User Management =====

// Get all users
router.get('/users', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const allUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(Number(limit))
    .offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(users);

  res.json({
    success: true,
    data: allUsers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Get single user details
router.get('/users/:userId', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const userId = req.params.userId as string;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User');
  }

  // Get role-specific profile
  let profile = null;
  if (user.role === 'reader') {
    [profile] = await db
      .select()
      .from(readerProfiles)
      .where(eq(readerProfiles.userId, userId))
      .limit(1);
  } else {
    [profile] = await db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.userId, userId))
      .limit(1);
  }

  // Get transaction history
  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  res.json({
    success: true,
    data: {
      user,
      profile,
      recentTransactions,
    },
  });
}));

// Update user
router.patch('/users/:userId', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const userId = req.params.userId as string;
  const { role, fullName, email, isOnline } = req.body;

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (role) updateData.role = role;
  if (fullName) updateData.fullName = fullName;
  if (email) updateData.email = email;
  if (isOnline !== undefined) updateData.isOnline = isOnline;

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId as string))
    .returning();

  res.json({
    success: true,
    data: updated,
  });
}));

// Create reader account
router.post('/readers', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const {
    email,
    username,
    fullName,
    displayName,
    bio,
    specialties,
    profileImage,
    chatRatePerMin,
    voiceRatePerMin,
    videoRatePerMin,
  } = req.body;

  if (!email || !username || !fullName || !displayName || !bio) {
    throw new ValidationError('Missing required fields');
  }

  // Check if user exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Create user with reader role
  const [user] = await db
    .insert(users)
    .values({
      clerkId: `admin_created_${Date.now()}`, // Placeholder until Clerk sync
      email,
      username,
      fullName,
      profileImage,
      role: 'reader',
    })
    .returning();

  // Create slug from display name
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Create reader profile
  const [readerProfile] = await db
    .insert(readerProfiles)
    .values({
      userId: user.id,
      displayName,
      slug: `${slug}-${user.id.slice(0, 8)}`,
      bio,
      specialties: specialties || [],
      profileImage: profileImage || 'https://via.placeholder.com/200',
      chatRatePerMin: chatRatePerMin?.toString() || '3.99',
      voiceRatePerMin: voiceRatePerMin?.toString() || '4.99',
      videoRatePerMin: videoRatePerMin?.toString() || '5.99',
    })
    .returning();

  res.status(201).json({
    success: true,
    data: {
      user,
      readerProfile,
    },
  });
}));

// Update reader profile
router.patch('/readers/:readerId', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const readerId = req.params.readerId as string;
  const updates = req.body;

  const updateData: Record<string, any> = { updatedAt: new Date() };

  const allowedFields = [
    'displayName', 'bio', 'specialties', 'profileImage', 'coverImage',
    'chatRatePerMin', 'voiceRatePerMin', 'videoRatePerMin', 'isAvailable', 'status'
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  const [updated] = await db
    .update(readerProfiles)
    .set(updateData)
    .where(eq(readerProfiles.id, readerId as string))
    .returning();

  if (!updated) {
    throw new NotFoundError('Reader profile');
  }

  res.json({
    success: true,
    data: updated,
  });
}));

// ===== Transaction Management =====

router.get('/transactions', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, type, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const txns = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(Number(limit))
    .offset(offset);

  res.json({
    success: true,
    data: txns,
  });
}));

// Issue refund
router.post('/transactions/:transactionId/refund', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const transactionId = req.params.transactionId as string;
  const { reason } = req.body;

  const [txn] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId as string))
    .limit(1);

  if (!txn) {
    throw new NotFoundError('Transaction');
  }

  if (txn.status === 'refunded') {
    throw new ValidationError('Transaction already refunded');
  }

  // Update transaction
  await db
    .update(transactions)
    .set({ status: 'refunded' })
    .where(eq(transactions.id, transactionId as string));

  // Create refund transaction
  await db.insert(transactions).values({
    userId: txn.userId,
    type: 'refund',
    amount: txn.amount,
    fee: '0',
    netAmount: txn.amount,
    status: 'completed',
    description: `Refund: ${reason || 'Admin initiated'}`,
    metadata: { originalTransactionId: transactionId },
  });

  // Add back to client balance if applicable
  if (txn.type === 'reading_payment' || txn.type === 'deposit') {
    await db
      .update(clientProfiles)
      .set({
        balance: sql`${clientProfiles.balance} + ${txn.amount}`,
      })
      .where(eq(clientProfiles.userId, txn.userId));
  }

  res.json({
    success: true,
    message: 'Refund processed',
  });
}));

// ===== Gift Management =====

router.get('/gifts', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const allGifts = await db.select().from(gifts).orderBy(gifts.price);

  res.json({
    success: true,
    data: allGifts,
  });
}));

router.post('/gifts', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const { name, imageUrl, animationUrl, price } = req.body;

  if (!name || !imageUrl || !price) {
    throw new ValidationError('Name, image URL, and price are required');
  }

  const [gift] = await db
    .insert(gifts)
    .values({ name, imageUrl, animationUrl, price: price.toString() })
    .returning();

  res.status(201).json({
    success: true,
    data: gift,
  });
}));

router.patch('/gifts/:giftId', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const giftId = req.params.giftId as string;
  const { name, imageUrl, animationUrl, price, isActive } = req.body;

  const updateData: Record<string, any> = {};
  if (name) updateData.name = name;
  if (imageUrl) updateData.imageUrl = imageUrl;
  if (animationUrl !== undefined) updateData.animationUrl = animationUrl;
  if (price) updateData.price = price.toString();
  if (isActive !== undefined) updateData.isActive = isActive;

  const [updated] = await db
    .update(gifts)
    .set(updateData)
    .where(eq(gifts.id, giftId as string))
    .returning();

  res.json({
    success: true,
    data: updated,
  });
}));

// ===== Session Management =====

router.get('/sessions', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const sessions = await db
    .select()
    .from(readingSessions)
    .orderBy(desc(readingSessions.createdAt))
    .limit(Number(limit))
    .offset(offset);

  res.json({
    success: true,
    data: sessions,
  });
}));

// ===== Order Management =====

router.get('/orders', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const allOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(Number(limit))
    .offset(offset);

  res.json({
    success: true,
    data: allOrders,
  });
}));

router.patch('/orders/:orderId/status', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const orderId = req.params.orderId as string;
  const { status } = req.body;

  const [updated] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId as string))
    .returning();

  res.json({
    success: true,
    data: updated,
  });
}));

// ===== Notifications =====

router.post('/notifications/broadcast', requireAuth(), requireAdmin, asyncHandler(async (req, res) => {
  const { title, message, type = 'announcement', targetRole } = req.body;

  if (!title || !message) {
    throw new ValidationError('Title and message are required');
  }

  // Get target users
  let targetUsers;
  if (targetRole) {
    targetUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, targetRole));
  } else {
    targetUsers = await db.select({ id: users.id }).from(users);
  }

  // Create notifications for all target users
  for (const user of targetUsers) {
    await db.insert(notifications).values({
      userId: user.id,
      type,
      title,
      message,
    });
  }

  res.json({
    success: true,
    message: `Notification sent to ${targetUsers.length} users`,
  });
}));

export default router;
