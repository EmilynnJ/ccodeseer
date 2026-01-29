import { Router } from 'express';
import { requireAuth, requireUser } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ValidationError, InsufficientBalanceError } from '../middleware/errorHandler.js';
import { sessionLimiter } from '../middleware/rateLimiter.js';
import { db } from '../db/index.js';
import { users, readerProfiles, clientProfiles, readingSessions, sessionMessages, reviews, transactions } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { generateRtcToken, generateChannelName, generateAgoraUid } from '../config/agora.js';
import { publishSessionEvent, publishNotification, publishReaderStatus } from '../config/ably.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

const router = Router();

// Request a reading session
router.post('/request', requireAuth(), requireUser, sessionLimiter, asyncHandler(async (req, res) => {
  const { readerId, type } = req.body;

  if (!['chat', 'voice', 'video'].includes(type)) {
    throw new ValidationError('Invalid session type');
  }

  // Get reader profile
  const [reader] = await db
    .select()
    .from(readerProfiles)
    .where(eq(readerProfiles.userId, readerId))
    .limit(1);

  if (!reader) {
    throw new NotFoundError('Reader');
  }

  if (reader.status !== 'online') {
    throw new ValidationError('Reader is not available');
  }

  // Get client profile for balance check
  const [client] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (!client) {
    throw new NotFoundError('Client profile');
  }

  // Get rate based on session type
  let ratePerMin: number;
  switch (type) {
    case 'chat':
      ratePerMin = Number(reader.chatRatePerMin);
      break;
    case 'voice':
      ratePerMin = Number(reader.voiceRatePerMin);
      break;
    case 'video':
      ratePerMin = Number(reader.videoRatePerMin);
      break;
    default:
      throw new ValidationError('Invalid session type');
  }

  // Check if client has enough balance for at least 3 minutes
  const minimumBalance = ratePerMin * 3;
  if (Number(client.balance) < minimumBalance) {
    throw new InsufficientBalanceError();
  }

  // Generate channel names
  const sessionId = uuidv4();
  const agoraChannelName = generateChannelName(sessionId, 'reading');
  const ablyChannelName = `reading:${sessionId}`;

  // Create session
  const [session] = await db
    .insert(readingSessions)
    .values({
      id: sessionId,
      clientId: req.userId!,
      readerId,
      type,
      status: 'pending',
      ratePerMin: ratePerMin.toString(),
      agoraChannelName,
      ablyChannelName,
    })
    .returning();

  // Notify reader of incoming request
  await publishNotification(readerId, {
    type: 'session_request',
    title: 'New Reading Request',
    message: `You have a new ${type} reading request`,
    data: { sessionId: session.id, type },
  });

  res.status(201).json({
    success: true,
    data: session,
  });
}));

// Accept session (reader only)
router.post('/:sessionId/accept', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const sessionId = req.params.sessionId as string;

  const [session] = await db
    .select()
    .from(readingSessions)
    .where(eq(readingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  if (session.readerId !== req.userId) {
    throw new ValidationError('Only the reader can accept this session');
  }

  if (session.status !== 'pending') {
    throw new ValidationError('Session is not pending');
  }

  // Update session to active
  const [updatedSession] = await db
    .update(readingSessions)
    .set({
      status: 'active',
      startTime: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(readingSessions.id, sessionId))
    .returning();

  // Update reader status
  await db
    .update(readerProfiles)
    .set({ status: 'in_session' })
    .where(eq(readerProfiles.userId, req.userId!));

  await publishReaderStatus(req.userId!, 'in_session');

  // Generate Agora tokens
  const readerUid = generateAgoraUid(req.userId!);
  const clientUid = generateAgoraUid(session.clientId);

  const readerToken = generateRtcToken(session.agoraChannelName!, readerUid, 'publisher');
  const clientToken = generateRtcToken(session.agoraChannelName!, clientUid, 'publisher');

  // Notify client that session is accepted
  await publishNotification(session.clientId, {
    type: 'session_accepted',
    title: 'Session Accepted',
    message: 'Your reading session has been accepted',
    data: {
      sessionId,
      agoraToken: clientToken,
      agoraUid: clientUid,
      channelName: session.agoraChannelName,
    },
  });

  // Publish session start event
  await publishSessionEvent(sessionId, 'session-started', {
    sessionId,
    startTime: updatedSession.startTime,
  });

  res.json({
    success: true,
    data: {
      session: updatedSession,
      agora: {
        token: readerToken,
        uid: readerUid,
        channelName: session.agoraChannelName,
      },
    },
  });
}));

// Decline session (reader only)
router.post('/:sessionId/decline', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const { reason } = req.body;

  const [session] = await db
    .select()
    .from(readingSessions)
    .where(eq(readingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  if (session.readerId !== req.userId) {
    throw new ValidationError('Only the reader can decline this session');
  }

  if (session.status !== 'pending') {
    throw new ValidationError('Session is not pending');
  }

  const [updatedSession] = await db
    .update(readingSessions)
    .set({
      status: 'cancelled',
      notes: reason,
      updatedAt: new Date(),
    })
    .where(eq(readingSessions.id, sessionId))
    .returning();

  // Notify client
  await publishNotification(session.clientId, {
    type: 'session_declined',
    title: 'Session Declined',
    message: reason || 'The reader is not available at this time',
    data: { sessionId },
  });

  res.json({
    success: true,
    data: updatedSession,
  });
}));

// End session
router.post('/:sessionId/end', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const sessionId = req.params.sessionId as string;

  const [session] = await db
    .select()
    .from(readingSessions)
    .where(eq(readingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  if (session.clientId !== req.userId && session.readerId !== req.userId) {
    throw new ValidationError('Not authorized to end this session');
  }

  if (session.status !== 'active') {
    throw new ValidationError('Session is not active');
  }

  const endTime = new Date();
  const startTime = session.startTime || new Date();
  const durationSeconds = Math.ceil((endTime.getTime() - startTime.getTime()) / 1000);
  const durationMinutes = Math.ceil(durationSeconds / 60); // Round up to nearest minute

  const ratePerMin = Number(session.ratePerMin);
  const totalAmount = durationMinutes * ratePerMin;
  const platformFee = totalAmount * (config.payment.platformFeePercent / 100);
  const readerEarnings = totalAmount - platformFee;

  // Update session
  const [updatedSession] = await db
    .update(readingSessions)
    .set({
      status: 'completed',
      endTime,
      duration: durationSeconds,
      totalAmount: totalAmount.toString(),
      platformFee: platformFee.toString(),
      readerEarnings: readerEarnings.toString(),
      updatedAt: new Date(),
    })
    .where(eq(readingSessions.id, sessionId))
    .returning();

  // Deduct from client balance
  await db
    .update(clientProfiles)
    .set({
      balance: sql`${clientProfiles.balance} - ${totalAmount}`,
      totalSpent: sql`${clientProfiles.totalSpent} + ${totalAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(clientProfiles.userId, session.clientId));

  // Create transaction records
  await db.insert(transactions).values([
    {
      userId: session.clientId,
      sessionId,
      type: 'reading_payment',
      amount: totalAmount.toString(),
      fee: '0',
      netAmount: totalAmount.toString(),
      status: 'completed',
      description: `Payment for ${session.type} reading session`,
    },
    {
      userId: session.readerId,
      sessionId,
      type: 'reading_earning',
      amount: totalAmount.toString(),
      fee: platformFee.toString(),
      netAmount: readerEarnings.toString(),
      status: 'completed',
      description: `Earnings from ${session.type} reading session`,
    },
  ]);

  // Update reader stats
  await db
    .update(readerProfiles)
    .set({
      status: 'online',
      totalReadings: sql`${readerProfiles.totalReadings} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(readerProfiles.userId, session.readerId));

  await publishReaderStatus(session.readerId, 'online');

  // Publish session end event
  await publishSessionEvent(sessionId, 'session-ended', {
    sessionId,
    duration: durationSeconds,
    totalAmount,
    readerEarnings,
  });

  // Notify both parties
  await publishNotification(session.clientId, {
    type: 'session_ended',
    title: 'Session Ended',
    message: `Your reading session has ended. Duration: ${durationMinutes} minutes. Total: $${totalAmount.toFixed(2)}`,
    data: { sessionId, duration: durationSeconds, totalAmount },
  });

  await publishNotification(session.readerId, {
    type: 'session_ended',
    title: 'Session Ended',
    message: `Reading session completed. Duration: ${durationMinutes} minutes. Earned: $${readerEarnings.toFixed(2)}`,
    data: { sessionId, duration: durationSeconds, readerEarnings },
  });

  res.json({
    success: true,
    data: updatedSession,
  });
}));

// Get session details
router.get('/:sessionId', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const sessionId = req.params.sessionId as string;

  const [session] = await db
    .select()
    .from(readingSessions)
    .where(eq(readingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  if (session.clientId !== req.userId && session.readerId !== req.userId) {
    throw new ValidationError('Not authorized to view this session');
  }

  // Get Agora token if session is active
  let agoraData = null;
  if (session.status === 'active' && session.agoraChannelName) {
    const uid = generateAgoraUid(req.userId!);
    const token = generateRtcToken(session.agoraChannelName, uid, 'publisher');
    agoraData = { token, uid, channelName: session.agoraChannelName };
  }

  res.json({
    success: true,
    data: {
      session,
      agora: agoraData,
    },
  });
}));

// Send chat message in session
router.post('/:sessionId/messages', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const { content, type = 'text' } = req.body;

  const [session] = await db
    .select()
    .from(readingSessions)
    .where(eq(readingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  if (session.clientId !== req.userId && session.readerId !== req.userId) {
    throw new ValidationError('Not authorized');
  }

  if (session.status !== 'active') {
    throw new ValidationError('Session is not active');
  }

  const [message] = await db
    .insert(sessionMessages)
    .values({
      sessionId,
      senderId: req.userId!,
      content,
      type,
    })
    .returning();

  // Publish message via Ably
  await publishSessionEvent(sessionId, 'message', {
    id: message.id,
    senderId: message.senderId,
    content: message.content,
    type: message.type,
    createdAt: message.createdAt,
  });

  res.status(201).json({
    success: true,
    data: message,
  });
}));

// Get session messages
router.get('/:sessionId/messages', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const sessionId = req.params.sessionId as string;

  const [session] = await db
    .select()
    .from(readingSessions)
    .where(eq(readingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  if (session.clientId !== req.userId && session.readerId !== req.userId) {
    throw new ValidationError('Not authorized');
  }

  const messages = await db
    .select()
    .from(sessionMessages)
    .where(eq(sessionMessages.sessionId, sessionId))
    .orderBy(sessionMessages.createdAt);

  res.json({
    success: true,
    data: messages,
  });
}));

// Submit review for completed session
router.post('/:sessionId/review', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const { rating, comment } = req.body;

  if (rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }

  const [session] = await db
    .select()
    .from(readingSessions)
    .where(eq(readingSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new NotFoundError('Session');
  }

  if (session.clientId !== req.userId) {
    throw new ValidationError('Only the client can review this session');
  }

  if (session.status !== 'completed') {
    throw new ValidationError('Can only review completed sessions');
  }

  // Check if already reviewed
  const [existingReview] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.sessionId, sessionId))
    .limit(1);

  if (existingReview) {
    throw new ValidationError('Session already reviewed');
  }

  // Create review
  const [review] = await db
    .insert(reviews)
    .values({
      sessionId,
      clientId: req.userId!,
      readerId: session.readerId,
      rating,
      comment,
    })
    .returning();

  // Update reader's rating
  const ratingStats = await db
    .select({
      avgRating: sql<number>`AVG(${reviews.rating})`,
      totalReviews: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(eq(reviews.readerId, session.readerId));

  await db
    .update(readerProfiles)
    .set({
      rating: ratingStats[0]?.avgRating?.toString() || '0',
      totalReviews: ratingStats[0]?.totalReviews || 0,
      updatedAt: new Date(),
    })
    .where(eq(readerProfiles.userId, session.readerId));

  // Notify reader
  await publishNotification(session.readerId, {
    type: 'new_review',
    title: 'New Review',
    message: `You received a ${rating}-star review`,
    data: { reviewId: review.id, rating },
  });

  res.status(201).json({
    success: true,
    data: review,
  });
}));

// Get user's session history
router.get('/', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role = 'client' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const whereClause = role === 'reader'
    ? eq(readingSessions.readerId, req.userId!)
    : eq(readingSessions.clientId, req.userId!);

  const sessions = await db
    .select()
    .from(readingSessions)
    .where(whereClause)
    .orderBy(desc(readingSessions.createdAt))
    .limit(Number(limit))
    .offset(offset);

  res.json({
    success: true,
    data: sessions,
  });
}));

export default router;
