import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// Get user notifications
router.get('/', requireAuth(), asyncHandler(async (req, res) => {
  const userId = req.userId!;
  const { limit = 50, offset = 0 } = req.query;

  const userNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

  res.json({
    success: true,
    data: userNotifications,
  });
}));

// Mark notification as read
router.patch('/:notificationId/read', requireAuth(), asyncHandler(async (req, res) => {
  const notificationId = req.params.notificationId as string;
  const userId = req.userId!;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    );

  res.json({ success: true });
}));

// Mark all notifications as read
router.patch('/read-all', requireAuth(), asyncHandler(async (req, res) => {
  const userId = req.userId!;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );

  res.json({ success: true });
}));

export default router;
