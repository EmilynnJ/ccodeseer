import { Router } from 'express';
import { requireAuth, requireUser, requireRole } from '../middleware/auth.js';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import { db } from '../db/index.js';
import { users, clientProfiles, readerProfiles, favoriteReaders } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Get user profile by ID
router.get('/:userId', requireAuth(), asyncHandler(async (req, res) => {
  const userId = req.params.userId as string;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      profileImage: users.profileImage,
      role: users.role,
      isOnline: users.isOnline,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json({
    success: true,
    data: user,
  });
}));

// Update user profile
router.patch('/profile', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const { fullName, username, profileImage } = req.body;

  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (fullName) updateData.fullName = fullName;
  if (username) updateData.username = username;
  if (profileImage) updateData.profileImage = profileImage;

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, req.userId!))
    .returning();

  res.json({
    success: true,
    data: updatedUser,
  });
}));

// Get client profile (balance, preferences, etc.)
router.get('/client/profile', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (!profile) {
    throw new NotFoundError('Client profile');
  }

  res.json({
    success: true,
    data: profile,
  });
}));

// Update client preferences
router.patch('/client/preferences', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const { autoReloadEnabled, autoReloadAmount, autoReloadThreshold } = req.body;

  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (autoReloadEnabled !== undefined) updateData.autoReloadEnabled = autoReloadEnabled;
  if (autoReloadAmount !== undefined) updateData.autoReloadAmount = autoReloadAmount;
  if (autoReloadThreshold !== undefined) updateData.autoReloadThreshold = autoReloadThreshold;

  const [updatedProfile] = await db
    .update(clientProfiles)
    .set(updateData)
    .where(eq(clientProfiles.userId, req.userId!))
    .returning();

  res.json({
    success: true,
    data: updatedProfile,
  });
}));

// Get favorite readers
router.get('/favorites', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const favorites = await db
    .select({
      readerId: favoriteReaders.readerId,
      addedAt: favoriteReaders.createdAt,
      reader: {
        id: readerProfiles.id,
        displayName: readerProfiles.displayName,
        slug: readerProfiles.slug,
        profileImage: readerProfiles.profileImage,
        specialties: readerProfiles.specialties,
        rating: readerProfiles.rating,
        status: readerProfiles.status,
        chatRatePerMin: readerProfiles.chatRatePerMin,
        voiceRatePerMin: readerProfiles.voiceRatePerMin,
        videoRatePerMin: readerProfiles.videoRatePerMin,
      },
    })
    .from(favoriteReaders)
    .innerJoin(readerProfiles, eq(favoriteReaders.readerId, readerProfiles.userId))
    .where(eq(favoriteReaders.clientId, req.userId!));

  res.json({
    success: true,
    data: favorites,
  });
}));

// Add reader to favorites
router.post('/favorites/:readerId', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const readerId = req.params.readerId as string;

  // Check if already favorited
  const [existing] = await db
    .select()
    .from(favoriteReaders)
    .where(
      and(
        eq(favoriteReaders.clientId, req.userId!),
        eq(favoriteReaders.readerId, readerId)
      )
    )
    .limit(1);

  if (existing) {
    return res.json({
      success: true,
      message: 'Already in favorites',
    });
  }

  await db.insert(favoriteReaders).values({
    clientId: req.userId!,
    readerId,
  });

  res.status(201).json({
    success: true,
    message: 'Added to favorites',
  });
}));

// Remove reader from favorites
router.delete('/favorites/:readerId', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const readerId = req.params.readerId as string;

  await db
    .delete(favoriteReaders)
    .where(
      and(
        eq(favoriteReaders.clientId, req.userId!),
        eq(favoriteReaders.readerId, readerId)
      )
    );

  res.json({
    success: true,
    message: 'Removed from favorites',
  });
}));

export default router;
