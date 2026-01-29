import { useState, useEffect, useRef, useCallback } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
  ILocalVideoTrack,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

interface UseAgoraOptions {
  channelName: string;
  token: string;
  uid: number;
  type: 'voice' | 'video';
  onUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onUserLeft?: (user: IAgoraRTCRemoteUser) => void;
}

interface AgoraState {
  isJoined: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  remoteUsers: IAgoraRTCRemoteUser[];
  localVideoTrack: ICameraVideoTrack | null;
  localAudioTrack: IMicrophoneAudioTrack | null;
}

export function useAgora({
  channelName,
  token,
  uid,
  type,
  onUserJoined,
  onUserLeft,
}: UseAgoraOptions) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const [state, setState] = useState<AgoraState>({
    isJoined: false,
    isAudioMuted: false,
    isVideoMuted: false,
    remoteUsers: [],
    localVideoTrack: null,
    localAudioTrack: null,
  });

  const join = useCallback(async () => {
    if (!APP_ID || !channelName || !token) {
      console.error('Missing Agora config');
      return;
    }

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    // Set up event handlers
    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);

      if (mediaType === 'video') {
        setState((prev) => ({
          ...prev,
          remoteUsers: [...prev.remoteUsers.filter((u) => u.uid !== user.uid), user],
        }));
      }

      if (mediaType === 'audio') {
        user.audioTrack?.play();
        setState((prev) => ({
          ...prev,
          remoteUsers: [...prev.remoteUsers.filter((u) => u.uid !== user.uid), user],
        }));
      }
    });

    client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'video') {
        setState((prev) => ({
          ...prev,
          remoteUsers: prev.remoteUsers.map((u) => (u.uid === user.uid ? user : u)),
        }));
      }
    });

    client.on('user-joined', (user) => {
      onUserJoined?.(user);
    });

    client.on('user-left', (user) => {
      onUserLeft?.(user);
      setState((prev) => ({
        ...prev,
        remoteUsers: prev.remoteUsers.filter((u) => u.uid !== user.uid),
      }));
    });

    // Join channel
    await client.join(APP_ID, channelName, token, uid);

    // Create and publish local tracks
    let localAudioTrack: IMicrophoneAudioTrack | null = null;
    let localVideoTrack: ICameraVideoTrack | null = null;

    try {
      localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();

      if (type === 'video') {
        localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 30,
            bitrateMax: 1000,
          },
        });
        await client.publish([localAudioTrack, localVideoTrack]);
      } else {
        await client.publish([localAudioTrack]);
      }
    } catch (err) {
      console.error('Error creating local tracks:', err);
    }

    setState((prev) => ({
      ...prev,
      isJoined: true,
      localAudioTrack,
      localVideoTrack,
    }));
  }, [channelName, token, uid, type, onUserJoined, onUserLeft]);

  const leave = useCallback(async () => {
    const client = clientRef.current;

    state.localAudioTrack?.close();
    state.localVideoTrack?.close();

    if (client) {
      await client.leave();
      client.removeAllListeners();
    }

    clientRef.current = null;
    setState({
      isJoined: false,
      isAudioMuted: false,
      isVideoMuted: false,
      remoteUsers: [],
      localVideoTrack: null,
      localAudioTrack: null,
    });
  }, [state.localAudioTrack, state.localVideoTrack]);

  const toggleMute = useCallback(async () => {
    if (state.localAudioTrack) {
      await state.localAudioTrack.setEnabled(state.isAudioMuted);
      setState((prev) => ({ ...prev, isAudioMuted: !prev.isAudioMuted }));
    }
  }, [state.localAudioTrack, state.isAudioMuted]);

  const toggleVideo = useCallback(async () => {
    if (state.localVideoTrack) {
      await state.localVideoTrack.setEnabled(state.isVideoMuted);
      setState((prev) => ({ ...prev, isVideoMuted: !prev.isVideoMuted }));
    }
  }, [state.localVideoTrack, state.isVideoMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leave();
    };
  }, []);

  return {
    ...state,
    join,
    leave,
    toggleMute,
    toggleVideo,
  };
}

export default useAgora;
