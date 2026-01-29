import { Router } from 'express';
import { requireAuth, requireUser, requireReader } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { messageLimiter } from '../middleware/rateLimiter.js';
import { db } from '../db/index.js';
import { conversations, directMessages, users, readerProfiles, clientProfiles, transactions } from '../db/schema.js';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import { publishToChannel, channelNames } from '../config/ably.js';

const router = Router();

// Get all conversations
router.get('/conversations', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const convos = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.participantOneId, req.userId!),
        eq(conversations.participantTwoId, req.userId!)
      )
    )
    .orderBy(desc(conversations.lastMessageAt));

  // Fetch participant details for each conversation
  const conversationsWithDetails = await Promise.all(
    convos.map(async (conv) => {
      const otherUserId = conv.participantOneId === req.userId
        ? conv.participantTwoId
        : conv.participantOneId;

      const [otherUser] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          profileImage: users.profileImage,
          role: users.role,
          isOnline: users.isOnline,
        })
        .from(users)
        .where(eq(users.id, otherUserId))
        .limit(1);

      // Get unread count
      const [{ count }] = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(directMessages)
        .where(
          and(
            eq(directMessages.conversationId, conv.id),
            eq(directMessages.isRead, false),
            sql`${directMessages.senderId} != ${req.userId}`
          )
        );

      // Get last message
      const [lastMessage] = await db
        .select()
        .from(directMessages)
        .where(eq(directMessages.conversationId, conv.id))
        .orderBy(desc(directMessages.createdAt))
        .limit(1);

      return {
        ...conv,
        otherUser,
        unreadCount: count,
        lastMessage,
      };
    })
  );

  res.json({
    success: true,
    data: conversationsWithDetails,
  });
}));

// Get or create conversation with user
router.post('/conversations', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const { userId: otherUserId } = req.body;

  if (!otherUserId) {
    throw new ValidationError('User ID required');
  }

  if (otherUserId === req.userId) {
    throw new ValidationError('Cannot start conversation with yourself');
  }

  // Check if conversation exists
  const [existingConv] = await db
    .select()
    .from(conversations)
    .where(
      or(
        and(
          eq(conversations.participantOneId, req.userId!),
          eq(conversations.participantTwoId, otherUserId)
        ),
        and(
          eq(conversations.participantOneId, otherUserId),
          eq(conversations.participantTwoId, req.userId!)
        )
      )
    )
    .limit(1);

  if (existingConv) {
    return res.json({
      success: true,
      data: existingConv,
    });
  }

  // Create new conversation
  const [conv] = await db
    .insert(conversations)
    .values({
      participantOneId: req.userId!,
      participantTwoId: otherUserId,
    })
    .returning();

  res.status(201).json({
    success: true,
    data: conv,
  });
}));

// Get messages in conversation
router.get('/conversations/:conversationId', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId as string;
  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  // Verify user is part of conversation
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) {
    throw new NotFoundError('Conversation');
  }

  if (conv.participantOneId !== req.userId && conv.participantTwoId !== req.userId) {
    throw new ValidationError('Not authorized');
  }

  // Get messages
  const messages = await db
    .select()
    .from(directMessages)
    .where(eq(directMessages.conversationId, conversationId))
    .orderBy(desc(directMessages.createdAt))
    .limit(Number(limit))
    .offset(offset);

  // Mark as read
  await db
    .update(directMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(directMessages.conversationId, conversationId),
        sql`${directMessages.senderId} != ${req.userId}`
      )
    );

  res.json({
    success: true,
    data: messages.reverse(), // Return in chronological order
  });
}));

// Send message
router.post('/conversations/:conversationId/messages', requireAuth(), requireUser, messageLimiter, asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId as string;
  const { content, type = 'text', isPaid = false, price } = req.body;

  if (!content) {
    throw new ValidationError('Content required');
  }

  // Verify user is part of conversation
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) {
    throw new NotFoundError('Conversation');
  }

  if (conv.participantOneId !== req.userId && conv.participantTwoId !== req.userId) {
    throw new ValidationError('Not authorized');
  }

  // If this is a paid message, verify sender is a reader
  if (isPaid && price) {
    const [reader] = await db
      .select()
      .from(readerProfiles)
      .where(eq(readerProfiles.userId, req.userId!))
      .limit(1);

    if (!reader) {
      throw new ValidationError('Only readers can send paid messages');
    }
  }

  // Create message
  const [message] = await db
    .insert(directMessages)
    .values({
      conversationId,
      senderId: req.userId!,
      content,
      type,
      isPaid: isPaid || false,
      price: price?.toString(),
    })
    .returning();

  // Update conversation last message time
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId));

  // Get sender info for real-time update
  const [sender] = await db
    .select({
      fullName: users.fullName,
      profileImage: users.profileImage,
    })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  // Publish via Ably
  await publishToChannel(channelNames.directMessage(conversationId), 'message', {
    ...message,
    sender,
  });

  res.status(201).json({
    success: true,
    data: message,
  });
}));

// Unlock paid message
router.post('/messages/:messageId/unlock', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const messageId = req.params.messageId as string;

  // Get message
  const [message] = await db
    .select()
    .from(directMessages)
    .where(eq(directMessages.id, messageId))
    .limit(1);

  if (!message) {
    throw new NotFoundError('Message');
  }

  if (!message.isPaid || !message.price) {
    throw new ValidationError('Message is not paid content');
  }

  // Get conversation to verify access
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, message.conversationId))
    .limit(1);

  if (!conv) {
    throw new NotFoundError('Conversation');
  }

  // Verify user is the recipient (not the sender)
  if (message.senderId === req.userId) {
    throw new ValidationError('Cannot unlock your own message');
  }

  const isParticipant = conv.participantOneId === req.userId || conv.participantTwoId === req.userId;
  if (!isParticipant) {
    throw new ValidationError('Not authorized');
  }

  const price = Number(message.price);

  // Check client balance
  const [client] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (!client || Number(client.balance) < price) {
    throw new ValidationError('Insufficient balance');
  }

  // Deduct from client
  await db
    .update(clientProfiles)
    .set({
      balance: sql`${clientProfiles.balance} - ${price}`,
      totalSpent: sql`${clientProfiles.totalSpent} + ${price}`,
    })
    .where(eq(clientProfiles.userId, req.userId!));

  // Calculate reader earnings (70%)
  const readerEarnings = price * 0.7;

  // Create transactions
  await db.insert(transactions).values([
    {
      userId: req.userId!,
      type: 'reading_payment',
      amount: price.toString(),
      fee: '0',
      netAmount: price.toString(),
      status: 'completed',
      description: 'Paid message unlock',
    },
    {
      userId: message.senderId,
      type: 'reading_earning',
      amount: price.toString(),
      fee: (price * 0.3).toString(),
      netAmount: readerEarnings.toString(),
      status: 'completed',
      description: 'Paid message earnings',
    },
  ]);

  res.json({
    success: true,
    message: 'Message unlocked',
    data: {
      content: message.content,
    },
  });
}));

// Mark messages as read
router.patch('/conversations/:conversationId/read', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId as string;

  await db
    .update(directMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(directMessages.conversationId, conversationId),
        sql`${directMessages.senderId} != ${req.userId}`
      )
    );

  res.json({
    success: true,
    message: 'Marked as read',
  });
}));

// Get unread message count
router.get('/unread-count', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const [{ count }] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(directMessages)
    .innerJoin(conversations, eq(directMessages.conversationId, conversations.id))
    .where(
      and(
        eq(directMessages.isRead, false),
        sql`${directMessages.senderId} != ${req.userId}`,
        or(
          eq(conversations.participantOneId, req.userId!),
          eq(conversations.participantTwoId, req.userId!)
        )
      )
    );

  res.json({
    success: true,
    data: { unreadCount: count },
  });
}));

export default router;
