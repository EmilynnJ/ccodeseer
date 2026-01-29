import { Router } from 'express';
import { requireAuth, requireUser, requireReader } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { db } from '../db/index.js';
import { liveStreams, gifts, giftTransactions, readerProfiles, clientProfiles, transactions } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { generateRtcToken, generateChannelName, generateAgoraUid } from '../config/agora.js';
import { publishStreamEvent, channelNames, publishToChannel } from '../config/ably.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

const router = Router();

// Get all live streams
router.get('/live', asyncHandler(async (req, res) => {
  const streams = await db
    .select({
      id: liveStreams.id,
      title: liveStreams.title,
      description: liveStreams.description,
      thumbnailUrl: liveStreams.thumbnailUrl,
      type: liveStreams.type,
      viewerCount: liveStreams.viewerCount,
      actualStart: liveStreams.actualStart,
      reader: {
        id: readerProfiles.id,
        displayName: readerProfiles.displayName,
        profileImage: readerProfiles.profileImage,
        slug: readerProfiles.slug,
      },
    })
    .from(liveStreams)
    .innerJoin(readerProfiles, eq(liveStreams.readerId, readerProfiles.userId))
    .where(eq(liveStreams.status, 'live'))
    .orderBy(desc(liveStreams.viewerCount));

  res.json({
    success: true,
    data: streams,
  });
}));

// Get upcoming scheduled streams
router.get('/scheduled', asyncHandler(async (req, res) => {
  const streams = await db
    .select({
      id: liveStreams.id,
      title: liveStreams.title,
      description: liveStreams.description,
      thumbnailUrl: liveStreams.thumbnailUrl,
      type: liveStreams.type,
      scheduledStart: liveStreams.scheduledStart,
      reader: {
        id: readerProfiles.id,
        displayName: readerProfiles.displayName,
        profileImage: readerProfiles.profileImage,
        slug: readerProfiles.slug,
      },
    })
    .from(liveStreams)
    .innerJoin(readerProfiles, eq(liveStreams.readerId, readerProfiles.userId))
    .where(eq(liveStreams.status, 'scheduled'))
    .orderBy(liveStreams.scheduledStart);

  res.json({
    success: true,
    data: streams,
  });
}));

// Get stream details
router.get('/:streamId', asyncHandler(async (req, res) => {
  const streamId = req.params.streamId as string;

  const [stream] = await db
    .select()
    .from(liveStreams)
    .where(eq(liveStreams.id, streamId))
    .limit(1);

  if (!stream) {
    throw new NotFoundError('Stream');
  }

  // Get reader info
  const [reader] = await db
    .select()
    .from(readerProfiles)
    .where(eq(readerProfiles.userId, stream.readerId))
    .limit(1);

  res.json({
    success: true,
    data: {
      ...stream,
      reader,
    },
  });
}));

// Create a new stream (reader only)
router.post('/', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const { title, description, thumbnailUrl, type = 'public', scheduledStart } = req.body;

  if (!title) {
    throw new ValidationError('Title is required');
  }

  const streamId = uuidv4();
  const agoraChannelName = generateChannelName(streamId, 'stream');

  const [stream] = await db
    .insert(liveStreams)
    .values({
      id: streamId,
      readerId: req.userId!,
      title,
      description,
      thumbnailUrl,
      type,
      status: scheduledStart ? 'scheduled' : 'live',
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
      actualStart: scheduledStart ? null : new Date(),
      agoraChannelName,
    })
    .returning();

  // If going live immediately, update reader status
  if (!scheduledStart) {
    await db
      .update(readerProfiles)
      .set({ status: 'busy' })
      .where(eq(readerProfiles.userId, req.userId!));

    // Notify subscribers
    await publishToChannel(channelNames.streamsDirectory(), 'stream-started', {
      streamId: stream.id,
      readerId: req.userId,
      title,
      type,
    });
  }

  // Generate Agora token for the streamer
  const uid = generateAgoraUid(req.userId!);
  const token = generateRtcToken(agoraChannelName, uid, 'publisher');

  res.status(201).json({
    success: true,
    data: {
      stream,
      agora: {
        token,
        uid,
        channelName: agoraChannelName,
      },
    },
  });
}));

// Start a scheduled stream
router.post('/:streamId/start', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const streamId = req.params.streamId as string;

  const [stream] = await db
    .select()
    .from(liveStreams)
    .where(eq(liveStreams.id, streamId))
    .limit(1);

  if (!stream) {
    throw new NotFoundError('Stream');
  }

  if (stream.readerId !== req.userId) {
    throw new ValidationError('Not authorized');
  }

  if (stream.status !== 'scheduled') {
    throw new ValidationError('Stream is not scheduled');
  }

  const [updatedStream] = await db
    .update(liveStreams)
    .set({
      status: 'live',
      actualStart: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(liveStreams.id, streamId))
    .returning();

  // Update reader status
  await db
    .update(readerProfiles)
    .set({ status: 'busy' })
    .where(eq(readerProfiles.userId, req.userId!));

  // Notify directory
  await publishToChannel(channelNames.streamsDirectory(), 'stream-started', {
    streamId: stream.id,
    readerId: req.userId,
    title: stream.title,
    type: stream.type,
  });

  // Generate Agora token
  const uid = generateAgoraUid(req.userId!);
  const token = generateRtcToken(stream.agoraChannelName, uid, 'publisher');

  res.json({
    success: true,
    data: {
      stream: updatedStream,
      agora: {
        token,
        uid,
        channelName: stream.agoraChannelName,
      },
    },
  });
}));

// End stream
router.post('/:streamId/end', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const streamId = req.params.streamId as string;

  const [stream] = await db
    .select()
    .from(liveStreams)
    .where(eq(liveStreams.id, streamId))
    .limit(1);

  if (!stream) {
    throw new NotFoundError('Stream');
  }

  if (stream.readerId !== req.userId) {
    throw new ValidationError('Not authorized');
  }

  const [updatedStream] = await db
    .update(liveStreams)
    .set({
      status: 'ended',
      actualEnd: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(liveStreams.id, streamId))
    .returning();

  // Update reader status
  await db
    .update(readerProfiles)
    .set({ status: 'online' })
    .where(eq(readerProfiles.userId, req.userId!));

  // Notify viewers
  await publishStreamEvent(streamId, 'stream-ended', { streamId });

  // Notify directory
  await publishToChannel(channelNames.streamsDirectory(), 'stream-ended', {
    streamId: stream.id,
    readerId: req.userId,
  });

  res.json({
    success: true,
    data: updatedStream,
  });
}));

// Join stream as viewer
router.post('/:streamId/join', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const streamId = req.params.streamId as string;

  const [stream] = await db
    .select()
    .from(liveStreams)
    .where(eq(liveStreams.id, streamId))
    .limit(1);

  if (!stream) {
    throw new NotFoundError('Stream');
  }

  if (stream.status !== 'live') {
    throw new ValidationError('Stream is not live');
  }

  // Increment viewer count
  await db
    .update(liveStreams)
    .set({
      viewerCount: sql`${liveStreams.viewerCount} + 1`,
      peakViewerCount: sql`GREATEST(${liveStreams.peakViewerCount}, ${liveStreams.viewerCount} + 1)`,
    })
    .where(eq(liveStreams.id, streamId));

  // Generate Agora token for viewer
  const uid = generateAgoraUid(req.userId!);
  const token = generateRtcToken(stream.agoraChannelName, uid, 'subscriber');

  res.json({
    success: true,
    data: {
      stream,
      agora: {
        token,
        uid,
        channelName: stream.agoraChannelName,
      },
    },
  });
}));

// Leave stream
router.post('/:streamId/leave', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const streamId = req.params.streamId as string;

  await db
    .update(liveStreams)
    .set({
      viewerCount: sql`GREATEST(${liveStreams.viewerCount} - 1, 0)`,
    })
    .where(eq(liveStreams.id, streamId));

  res.json({
    success: true,
    message: 'Left stream',
  });
}));

// ===== Virtual Gifts =====

// Get available gifts
router.get('/gifts/list', asyncHandler(async (req, res) => {
  const giftList = await db
    .select()
    .from(gifts)
    .where(eq(gifts.isActive, true))
    .orderBy(gifts.price);

  res.json({
    success: true,
    data: giftList,
  });
}));

// Send a gift during stream
router.post('/:streamId/gift', requireAuth(), requireUser, asyncHandler(async (req, res) => {
  const streamId = req.params.streamId as string;
  const { giftId, quantity = 1 } = req.body;

  // Get stream
  const [stream] = await db
    .select()
    .from(liveStreams)
    .where(eq(liveStreams.id, streamId))
    .limit(1);

  if (!stream) {
    throw new NotFoundError('Stream');
  }

  if (stream.status !== 'live') {
    throw new ValidationError('Stream is not live');
  }

  // Get gift
  const [gift] = await db
    .select()
    .from(gifts)
    .where(eq(gifts.id, giftId))
    .limit(1);

  if (!gift) {
    throw new NotFoundError('Gift');
  }

  const totalPrice = Number(gift.price) * quantity;

  // Check client balance
  const [client] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, req.userId!))
    .limit(1);

  if (!client || Number(client.balance) < totalPrice) {
    throw new ValidationError('Insufficient balance');
  }

  // Deduct from client balance
  await db
    .update(clientProfiles)
    .set({
      balance: sql`${clientProfiles.balance} - ${totalPrice}`,
      totalSpent: sql`${clientProfiles.totalSpent} + ${totalPrice}`,
    })
    .where(eq(clientProfiles.userId, req.userId!));

  // Create gift transaction
  const [giftTxn] = await db
    .insert(giftTransactions)
    .values({
      giftId,
      senderId: req.userId!,
      receiverId: stream.readerId,
      streamId,
      quantity,
      totalPrice: totalPrice.toString(),
    })
    .returning();

  // Update stream gift total
  await db
    .update(liveStreams)
    .set({
      totalGiftsValue: sql`${liveStreams.totalGiftsValue} + ${totalPrice}`,
    })
    .where(eq(liveStreams.id, streamId));

  // Calculate reader earnings (70%)
  const readerEarnings = totalPrice * 0.7;

  // Create transaction records
  await db.insert(transactions).values([
    {
      userId: req.userId!,
      type: 'gift',
      amount: totalPrice.toString(),
      fee: '0',
      netAmount: totalPrice.toString(),
      status: 'completed',
      description: `Sent ${quantity}x ${gift.name} during stream`,
    },
    {
      userId: stream.readerId,
      type: 'gift',
      amount: totalPrice.toString(),
      fee: (totalPrice * 0.3).toString(),
      netAmount: readerEarnings.toString(),
      status: 'completed',
      description: `Received ${quantity}x ${gift.name} during stream`,
    },
  ]);

  // Broadcast gift animation to stream viewers
  await publishStreamEvent(streamId, 'gift-received', {
    giftId,
    giftName: gift.name,
    giftImage: gift.imageUrl,
    animationUrl: gift.animationUrl,
    quantity,
    totalPrice,
    senderName: client.userId, // We'd want to fetch actual name
  });

  res.status(201).json({
    success: true,
    data: giftTxn,
  });
}));

// Get reader's streams
router.get('/reader/my-streams', requireAuth(), requireReader, asyncHandler(async (req, res) => {
  const streams = await db
    .select()
    .from(liveStreams)
    .where(eq(liveStreams.readerId, req.userId!))
    .orderBy(desc(liveStreams.createdAt));

  res.json({
    success: true,
    data: streams,
  });
}));

export default router;
