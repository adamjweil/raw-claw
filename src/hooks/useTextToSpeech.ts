import { useState, useCallback, useRef } from 'react';

// Lazy-load expo-speech to avoid crashes if native module is missing
let Speech: typeof import('expo-speech') | null = null;
try {
  Speech = require('expo-speech');
} catch {
  // Native module not available
}

interface UseTextToSpeechResult {
  isSpeaking: boolean;
  speakingMessageId: string | null;
  speak: (text: string, messageId: string) => void;
  stop: () => void;
}

/**
 * Text-to-speech hook using expo-speech.
 * Tracks which message is currently being spoken.
 */
export function useTextToSpeech(): UseTextToSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const currentIdRef = useRef<string | null>(null);

  const speak = useCallback((text: string, messageId: string) => {
    if (!Speech) return;

    // If already speaking this message, stop it
    if (currentIdRef.current === messageId) {
      Speech.stop();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      currentIdRef.current = null;
      return;
    }

    // Stop any current speech
    Speech.stop();

    // Strip markdown formatting for better TTS
    const cleanText = text
      .replace(/#+\s/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[\s\S]*?```/g, 'code block omitted')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*[-*]\s/gm, '')
      .replace(/^\s*\d+\.\s/gm, '')
      .trim();

    currentIdRef.current = messageId;
    setIsSpeaking(true);
    setSpeakingMessageId(messageId);

    Speech.speak(cleanText, {
      rate: 0.95,
      pitch: 1.0,
      onDone: () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        currentIdRef.current = null;
      },
      onStopped: () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        currentIdRef.current = null;
      },
    });
  }, []);

  const stop = useCallback(() => {
    if (!Speech) return;
    Speech.stop();
    setIsSpeaking(false);
    setSpeakingMessageId(null);
    currentIdRef.current = null;
  }, []);

  return { isSpeaking, speakingMessageId, speak, stop };
}
