import { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';

// Lazy-load expo-av so it doesn't crash in Expo Go where the native module is missing
let Audio: typeof import('expo-av').Audio | null = null;
try {
  Audio = require('expo-av').Audio;
} catch {
  // Native module not available (e.g. running in Expo Go)
}

interface UseVoiceInputResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
}

const NATIVE_UNAVAILABLE_MSG =
  'Voice input requires a development build. It is not available in Expo Go.';

/**
 * Voice input hook — records audio and returns the file URI.
 * Transcription would typically be handled by the gateway.
 * For now, we return the audio file URI so the caller can send it.
 */
export function useVoiceInput(): UseVoiceInputResult {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    if (!Audio) {
      Alert.alert('Unavailable', NATIVE_UNAVAILABLE_MSG);
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone permission is required for voice input');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!Audio) return null;
    try {
      if (!recordingRef.current) return null;
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      return uri;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      recordingRef.current = null;
      setIsRecording(false);
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        setIsRecording(false);
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    } catch {
      recordingRef.current = null;
      setIsRecording(false);
    }
  }, []);

  return { isRecording, startRecording, stopRecording, cancelRecording };
}
