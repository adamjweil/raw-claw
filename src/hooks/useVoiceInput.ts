import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';

interface UseVoiceInputResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceInput(): UseVoiceInputResult {
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isActiveRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Microphone permission is required for voice input');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      isActiveRef.current = true;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!isActiveRef.current) return null;
      setIsRecording(false);
      isActiveRef.current = false;
      await recorder.stop();

      await setAudioModeAsync({
        allowsRecording: false,
      });

      return recorder.uri;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      isActiveRef.current = false;
      setIsRecording(false);
      return null;
    }
  }, [recorder]);

  const cancelRecording = useCallback(async () => {
    try {
      if (isActiveRef.current) {
        setIsRecording(false);
        isActiveRef.current = false;
        await recorder.stop();
      }
    } catch {
      isActiveRef.current = false;
      setIsRecording(false);
    }
  }, [recorder]);

  return { isRecording, startRecording, stopRecording, cancelRecording };
}
