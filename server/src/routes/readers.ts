import { Router } from 'express';
import { requireAuth, requireUser, requireReader } from '../middleware/auth.js';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import { db } from '../db/index.js';
import { users, readerProfiles, reviews, readingSessions } from '../db/schema.js';
import { eq, desc, sql, and, avg, count } from 'drizzle-orm';
import { publishReaderStatus } from '../config/ably.js';

const router = Router();

// Get all available readers (public)
router.get('/', asyncHandler(async (req, res) => {
  const { specialty, status, sortBy = 'rating', page = 1, limit = 20 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  let query = db
    .select({
      id: readerProfiles.id,
      userId: readerProfiles.userId,
      displayName: readerProfiles.displayName,
      slug: readerProfiles.slug,
      bio: readerProfiles.bio,
      specialties: readerProfiles.specialties,
      profileImage: readerProfiles.profileImage,
      chatRatePerMin: readerProfiles.chatRatePerMin,
      voiceRatePerMin: readerProfiles.voiceRatePerMin,
      videoRatePerMin: readerProfiles.videoRatePerMin,
      status: readerProfiles.status,
      rating: readerProfiles.rating,
      totalReviews: readerProfiles.totalReviews,
      totalReadings: readerProfiles.totalReadings,
    })
    .from(readerProfiles)
    .where(eq(readerProfiles.isAvailable, true))
    .limit(Number(limit))
    .offset(offset);

  const readers = await query;

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(readerProfiles)
    .where(eq(readerProfiles.isAvailable, true));

  res.json({
    success: true,
    data: readers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Get online readers
router.get('/online', asyncHandler(async (req, res) => {
  const readers = await db
    .select({
      id: readerProfiles.id,
      userId: readerProfiles.userId,
      displayName: readerProfiles.displayName,
      slug: readerProfiles.slug,
      profileImage: readerProfiles.profileImage,
      specialties: readerProfiles.specialties,
      chatRatePerMin: readerProfiles.chatRatePerMin,
      voiceRatePerMin: readerProfiles.voiceRatePerMin,
      videoRatePerMin: readerProfiles.videoRatePerMin,
      status: readerProfiles.status,
      rating: readerProfiles.rating,
      totalReviews: readerProfiles.totalReviews,
    })
    .from(readerProfiles)
    .where(eq(readerProfiles.status, 'online'))
    .orderBy(desc(readerProfiles.rating));

  res.json({
    success: true,
    data: readers,
  });
}));

// Get reader by slug (public profile)
router.get('/profile/:slug', asyncHandler(async (req, res) => {
  const slug = req.params.slug as string;

  const [reader] = await db
    .select()
    .from(readerProfiles)
    .where(eq(readerProfiles.slug, slug))
    .limit(1);

  if (!reader) {
    throw new NotFoundError('Reader');
  }

  // Get user info
  const [user] = await db
    .select({
      fullName: users.fullName,
      isOnline: users.isOnline,
    })
    .from(users)
    .where(eq(users.id, reader.userId))
    .limit(1);

  // Get recent reviews
  const recentReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      readerResponse: reviews.readerResponse,
      createdAt: reviews.createdAt,
      clientName: users.fullName,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.clientId, users.id))
    .where(eq(reviews.readerId, reader.userId))
    .orderBy(desc(reviews.createdAt))
    .limit(10);

  res.json({
    success: true,
    data: {
      ...reader,
      user,
      reviews: recentReviews,
    },
  });
}));

// Get reader's own profile (for dashboard)
router.get('/me', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const [profile] = await db
    .select()
    .from(readerProfiles)
    .where(eq(readerProfiles.userId, req.userId!))
    .limit(1);

  if (!profile) {
    throw new NotFoundError('Reader profile');
  }

  res.json({
    success: true,
    data: profile,
  });
}));

// Update reader profile
router.patch('/me', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const {
    displayName,
    bio,
    specialties,
    profileImage,
    coverImage,
    chatRatePerMin,
    voiceRatePerMin,
    videoRatePerMin,
    isAvailable,
  } = req.body;

  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (displayName) updateData.displayName = displayName;
  if (bio) updateData.bio = bio;
  if (specialties) updateData.specialties = specialties;
  if (profileImage) updateData.profileImage = profileImage;
  if (coverImage) updateData.coverImage = coverImage;
  if (chatRatePerMin !== undefined) updateData.chatRatePerMin = chatRatePerMin;
  if (voiceRatePerMin !== undefined) updateData.voiceRatePerMin = voiceRatePerMin;
  if (videoRatePerMin !== undefined) updateData.videoRatePerMin = videoRatePerMin;
  if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

  const [updatedProfile] = await db
    .update(readerProfiles)
    .set(updateData)
    .where(eq(readerProfiles.userId, req.userId!))
    .returning();

  res.json({
    success: true,
    data: updatedProfile,
  });
}));

// Update reader status (online/offline/busy)
router.patch('/me/status', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['online', 'offline', 'busy', 'in_session'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status',
    });
  }

  const [updatedProfile] = await db
    .update(readerProfiles)
    .set({ status, updatedAt: new Date() })
    .where(eq(readerProfiles.userId, req.userId!))
    .returning();

  // Also update user online status
  await db
    .update(users)
    .set({
      isOnline: status === 'online' || status === 'busy' || status === 'in_session',
      lastSeen: new Date(),
    })
    .where(eq(users.id, req.userId!));

  // Publish status update via Ably
  await publishReaderStatus(req.userId!, status);

  res.json({
    success: true,
    data: updatedProfile,
  });
}));

// Get reader earnings dashboard
router.get('/me/earnings', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  // Calculate date range
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

  // Get session stats
  const sessions = await db
    .select({
      totalEarnings: sql<number>`COALESCE(SUM(${readingSessions.readerEarnings}), 0)`,
      totalSessions: count(),
      avgDuration: avg(readingSessions.duration),
    })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.readerId, req.userId!),
        eq(readingSessions.status, 'completed'),
        sql`${readingSessions.createdAt} >= ${startDate}`
      )
    );

  // Get reader profile for pending balance
  const [profile] = await db
    .select()
    .from(readerProfiles)
    .where(eq(readerProfiles.userId, req.userId!))
    .limit(1);

  res.json({
    success: true,
    data: {
      period,
      earnings: sessions[0]?.totalEarnings || 0,
      totalSessions: sessions[0]?.totalSessions || 0,
      avgDuration: sessions[0]?.avgDuration || 0,
      rating: profile?.rating || 0,
      totalReviews: profile?.totalReviews || 0,
    },
  });
}));

// Get reader's reviews
router.get('/me/reviews', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const readerReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      readerResponse: reviews.readerResponse,
      createdAt: reviews.createdAt,
      clientName: users.fullName,
      clientImage: users.profileImage,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.clientId, users.id))
    .where(eq(reviews.readerId, req.userId!))
    .orderBy(desc(reviews.createdAt))
    .limit(Number(limit))
    .offset(offset);

  res.json({
    success: true,
    data: readerReviews,
  });
}));

// Respond to a review
router.patch('/reviews/:reviewId/respond', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const reviewId = req.params.reviewId as string;
  const { response } = req.body;

  // Verify the review belongs to this reader
  const [review] = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.id, reviewId),
        eq(reviews.readerId, req.userId!)
      )
    )
    .limit(1);

  if (!review) {
    throw new NotFoundError('Review');
  }

  const [updatedReview] = await db
    .update(reviews)
    .set({
      readerResponse: response,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  res.json({
    success: true,
    data: updatedReview,
  });
}));

export default router;
