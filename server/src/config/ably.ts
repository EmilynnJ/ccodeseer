import Ably from 'ably';
import { config } from './index.js';

// Initialize Ably client
export const ably = new Ably.Rest(config.ably.apiKey);

// Generate Ably token for client-side usage
export async function generateAblyToken(clientId: string): Promise<Ably.TokenDetails> {
  const tokenParams: Ably.TokenParams = {
    clientId,
    capability: JSON.stringify({
      '*': ['subscribe', 'publish', 'presence'],
    }),
    ttl: 3600 * 1000, // 1 hour
  };

  const tokenRequest = await ably.auth.createTokenRequest(tokenParams);
  return tokenRequest as unknown as Ably.TokenDetails;
}

// Channel naming conventions
export const channelNames = {
  // Private reading session channel
  readingSession: (sessionId: string) => `reading:${sessionId}`,

  // Live stream channel
  liveStream: (streamId: string) => `stream:${streamId}`,

  // User notifications channel
  userNotifications: (userId: string) => `notifications:${userId}`,

  // Reader status channel (for online/offline/busy status)
  readerStatus: () => 'readers:status',

  // Live streams directory (updates when streams go live/end)
  streamsDirectory: () => 'streams:directory',

  // Direct messaging channel
  directMessage: (conversationId: string) => `dm:${conversationId}`,

  // Typing indicator channels
  typing: (channelId: string) => `typing:${channelId}`,
};

// Publish message to channel
export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: unknown
): Promise<void> {
  const channel = ably.channels.get(channelName);
  await channel.publish(eventName, data);
}

// Publish reader status update
export async function publishReaderStatus(
  readerId: string,
  status: 'online' | 'offline' | 'busy' | 'in_session'
): Promise<void> {
  await publishToChannel(channelNames.readerStatus(), 'status-update', {
    readerId,
    status,
    timestamp: new Date().toISOString(),
  });
}

// Publish notification to user
export async function publishNotification(
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  await publishToChannel(
    channelNames.userNotifications(userId),
    'notification',
    {
      ...notification,
      timestamp: new Date().toISOString(),
    }
  );
}

// Publish session event (message, typing, etc.)
export async function publishSessionEvent(
  sessionId: string,
  eventName: string,
  data: unknown
): Promise<void> {
  await publishToChannel(channelNames.readingSession(sessionId), eventName, data);
}

// Publish stream event
export async function publishStreamEvent(
  streamId: string,
  eventName: string,
  data: unknown
): Promise<void> {
  await publishToChannel(channelNames.liveStream(streamId), eventName, data);
}

export const ablyConfig = {
  ably,
  generateAblyToken,
  channelNames,
  publishToChannel,
  publishReaderStatus,
  publishNotification,
  publishSessionEvent,
  publishStreamEvent,
};

export default ablyConfig;
