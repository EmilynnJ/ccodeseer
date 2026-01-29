import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-token';
import { config } from './index.js';

const APP_ID = config.agora.appId;
const APP_CERTIFICATE = config.agora.appCertificate;

// Token expiration time (24 hours in seconds)
const TOKEN_EXPIRATION_SECONDS = 86400;

// Generate RTC token for video/voice calls
export function generateRtcToken(
  channelName: string,
  uid: number,
  role: 'publisher' | 'subscriber' = 'publisher'
): string {
  const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTime + TOKEN_EXPIRATION_SECONDS;

  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    rtcRole,
    privilegeExpiredTs,
    privilegeExpiredTs
  );
}

// Generate RTM token for real-time messaging
export function generateRtmToken(userId: string): string {
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTime + TOKEN_EXPIRATION_SECONDS;

  return RtmTokenBuilder.buildToken(
    APP_ID,
    APP_CERTIFICATE,
    userId,
    privilegeExpiredTs
  );
}

// Generate unique channel name for sessions
export function generateChannelName(sessionId: string, type: 'reading' | 'stream'): string {
  return `${type}_${sessionId}`;
}

// Generate unique UID for Agora (based on user ID hash)
export function generateAgoraUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 4294967295; // Ensure it's within valid range
}

export const agoraConfig = {
  appId: APP_ID,
  generateRtcToken,
  generateRtmToken,
  generateChannelName,
  generateAgoraUid,
};

export default agoraConfig;
