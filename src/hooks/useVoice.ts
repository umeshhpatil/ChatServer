import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface VoiceParticipant {
  id: string;
  username: string;
  avatar_url?: string;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: string;
}

interface UseVoiceOptions {
  currentUserId: string | null;
  currentUsername: string | null;
  currentAvatarUrl?: string | null;
  playVoiceConnectSound: () => void;
  playVoiceDisconnectSound: () => void;
  playToggleMicSound: (isNowMuted: boolean) => void;
}

export function useVoice({
  currentUserId,
  currentUsername,
  currentAvatarUrl,
  playVoiceConnectSound,
  playVoiceDisconnectSound,
  playToggleMicSound,
}: UseVoiceOptions) {
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
  const [activeVoiceChannelName, setActiveVoiceChannelName] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [participants, setParticipants] = useState<Map<string, VoiceParticipant>>(new Map());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [ping, setPing] = useState<number>(28);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Monitor voice volume to detect active speaking (green ring)
  const monitorSpeaking = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const speakingNow = avg > 25 && !isMuted;
        setIsSpeaking(speakingNow);

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('Voice level monitor error:', err);
    }
  }, [isMuted]);

  // Clean up streams & audio context
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setIsSpeaking(false);
  }, []);

  // Join voice channel
  const joinVoiceChannel = useCallback(
    async (channelId: string, channelName: string) => {
      if (!currentUserId) return;

      if (activeVoiceChannelId === channelId) {
        return; // Already in this voice channel
      }

      // If already connected to another channel, disconnect first
      if (activeVoiceChannelId) {
        cleanupAudio();
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
      }

      setActiveVoiceChannelId(channelId);
      setActiveVoiceChannelName(channelName);
      setConnectionStatus('connecting');

      let userStream: MediaStream | null = null;

      // Try capturing real microphone input
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          userStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
          localStreamRef.current = userStream;
          monitorSpeaking(userStream);
        }
      } catch (err) {
        console.warn('Microphone permission not granted or unavailable, falling back to listening mode:', err);
      }

      // Play connect chime
      playVoiceConnectSound();
      setConnectionStatus('connected');
      setPing(Math.floor(20 + Math.random() * 15));

      // Realtime Presence Channel for this voice room
      if (isConfigured) {
        const chan = supabase.channel(`voice-presence:${channelId}`, {
          config: {
            presence: { key: currentUserId },
          },
        });

        chan
          .on('presence', { event: 'sync' }, () => {
            const state = chan.presenceState<VoiceParticipant>();
            const map = new Map<string, VoiceParticipant>();
            Object.entries(state).forEach(([key, presences]) => {
              if (presences && presences.length > 0) {
                map.set(key, presences[0]);
              }
            });
            setParticipants(map);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await chan.track({
                id: currentUserId,
                username: currentUsername || 'User',
                avatar_url: currentAvatarUrl,
                isMuted: false,
                isSpeaking: false,
                joinedAt: new Date().toISOString(),
              });
            }
          });

        channelRef.current = chan;
      } else {
        // Fallback local participant
        const selfParticipant: VoiceParticipant = {
          id: currentUserId,
          username: currentUsername || 'User',
          avatar_url: currentAvatarUrl || undefined,
          isMuted: false,
          isSpeaking: false,
          joinedAt: new Date().toISOString(),
        };
        setParticipants(new Map([[currentUserId, selfParticipant]]));
      }
    },
    [
      currentUserId,
      currentUsername,
      currentAvatarUrl,
      activeVoiceChannelId,
      monitorSpeaking,
      cleanupAudio,
      playVoiceConnectSound,
    ]
  );

  // Leave voice channel
  const leaveVoiceChannel = useCallback(() => {
    if (!activeVoiceChannelId) return;

    playVoiceDisconnectSound();
    cleanupAudio();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setActiveVoiceChannelId(null);
    setActiveVoiceChannelName(null);
    setConnectionStatus('disconnected');
    setParticipants(new Map());
    setIsMuted(false);
    setIsDeafened(false);
  }, [activeVoiceChannelId, cleanupAudio, playVoiceDisconnectSound]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    playToggleMicSound(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
    }

    if (channelRef.current && currentUserId) {
      channelRef.current.track({
        id: currentUserId,
        username: currentUsername || 'User',
        avatar_url: currentAvatarUrl,
        isMuted: nextMuted,
        isSpeaking: false,
        joinedAt: new Date().toISOString(),
      });
    }
  }, [isMuted, currentUserId, currentUsername, currentAvatarUrl, playToggleMicSound]);

  // Toggle deafen
  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => !prev);
  }, []);

  // Update speaking state in presence
  useEffect(() => {
    if (channelRef.current && currentUserId && activeVoiceChannelId) {
      channelRef.current.track({
        id: currentUserId,
        username: currentUsername || 'User',
        avatar_url: currentAvatarUrl,
        isMuted,
        isSpeaking,
        joinedAt: new Date().toISOString(),
      });
    }
  }, [isSpeaking, isMuted, currentUserId, currentUsername, currentAvatarUrl, activeVoiceChannelId]);

  return {
    activeVoiceChannelId,
    activeVoiceChannelName,
    connectionStatus,
    participants,
    isMuted,
    isDeafened,
    isSpeaking,
    ping,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
  };
}
