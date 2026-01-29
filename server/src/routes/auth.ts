import { Router } from 'express';
import { requireAuth, loadUser, requireUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { db } from '../db/index.js';
import { users, clientProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateAblyToken } from '../config/ably.js';
import { createCustomer } from '../config/stripe.js';

const router = Router();

// Sync user from Clerk to our database (called after Clerk authentication)
router.post('/sync', requireAuth(), authLimiter, asyncHandler(async (req, res) => {
  const clerkId = req.auth?.userId;
  const { email, username, fullName, profileImage } = req.body;

  if (!clerkId) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (existingUser) {
    // Update existing user
    const [updatedUser] = await db
      .update(users)
      .set({
        email,
        fullName,
        profileImage,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, clerkId))
      .returning();

    return res.json({
      success: true,
      data: updatedUser,
      isNew: false,
    });
  }

  // Create new user (default role: client)
  const [newUser] = await db
    .insert(users)
    .values({
      clerkId,
      email,
      username: username || email.split('@')[0],
      fullName,
      profileImage,
      role: 'client',
    })
    .returning();

  // Create Stripe customer for the new user
  const stripeCustomer = await createCustomer(email, fullName);

  // Create client profile
  await db.insert(clientProfiles).values({
    userId: newUser.id,
    stripeCustomerId: stripeCustomer.id,
    balance: '0',
  });

  res.status(201).json({
    success: true,
    data: newUser,
    isNew: true,
  });
}));

// Get current user profile
router.get('/me', requireAuth(), asyncHandler(async (req, res) => {
  const clerkId = req.auth?.userId;

  if (!clerkId) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found. Please complete registration.',
    });
  }

  res.json({
    success: true,
    data: user,
  });
}));

// Get Ably token for real-time features
router.get('/ably-token', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const token = await generateAblyToken(req.userId!);

  res.json({
    success: true,
    data: token,
  });
}));

// Update online status
router.patch('/status', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const { isOnline } = req.body;

  const [updatedUser] = await db
    .update(users)
    .set({
      isOnline,
      lastSeen: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, req.userId!))
    .returning();

  res.json({
    success: true,
    data: updatedUser,
  });
}));

export default router;
