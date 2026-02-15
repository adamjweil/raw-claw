import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { TokenUsage } from '../types';

const POLL_INTERVAL = 60000; // 60 seconds
const BASELINE_KEY = 'paw_token_usage_baseline';

/**
 * Stored baseline: the total token count at the start of the current day.
 * We use this to compute daily usage when the gateway only returns a running total.
 */
interface UsageBaseline {
  /** Local date string "YYYY-MM-DD" */
  date: string;
  /** The total token count recorded at the start of this day */
  total: number;
}

/** Get today's local date as "YYYY-MM-DD" */
function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Load the stored baseline from AsyncStorage */
async function loadBaseline(): Promise<UsageBaseline | null> {
  try {
    const raw = await AsyncStorage.getItem(BASELINE_KEY);
    if (raw) return JSON.parse(raw) as UsageBaseline;
  } catch {
    // ignore read errors
  }
  return null;
}

/** Save a baseline to AsyncStorage */
async function saveBaseline(baseline: UsageBaseline): Promise<void> {
  try {
    await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
  } catch {
    // ignore write errors
  }
}

/**
 * Given raw usage from the gateway, compute accurate daily usage using
 * a locally-stored baseline.
 *
 * Logic:
 * - If the gateway already provides a non-zero `today`, trust it.
 * - Otherwise, load the stored baseline:
 *   - If the baseline date is today, `today = currentTotal - baseline.total`
 *   - If the baseline is from a previous day (or missing), set a new baseline
 *     with the current total (daily count starts from 0 for the new day).
 * - Persist the updated baseline.
 */
async function applyLocalDailyTracking(usage: TokenUsage): Promise<TokenUsage> {
  // If the gateway already provides a meaningful "today" value, trust it
  if (usage.today > 0) return usage;

  // Only compute if we have a positive total to work with
  if (usage.total <= 0) return usage;

  const dateStr = todayLocal();
  const baseline = await loadBaseline();

  if (baseline && baseline.date === dateStr) {
    // Same day — compute today's usage as the delta from the baseline
    const todayTokens = Math.max(0, usage.total - baseline.total);

    // If total somehow went backwards (e.g. gateway reset), reset baseline
    if (usage.total < baseline.total) {
      await saveBaseline({ date: dateStr, total: usage.total });
      return { ...usage, today: 0 };
    }

    return { ...usage, today: todayTokens };
  }

  // New day or no baseline yet — record the current total as today's baseline
  // (daily count starts at 0 for the new day)
  await saveBaseline({ date: dateStr, total: usage.total });

  // For the very first poll of a new day, today starts at 0
  return { ...usage, today: 0 };
}

export function useTokenUsage() {
  const { state } = useStore();
  // Track whether we've initialized the baseline this session to avoid
  // resetting on the very first fetch if tokens have been used today
  const initializedRef = useRef(false);

  const fetcher = useCallback(async (): Promise<TokenUsage> => {
    if (!state.client) throw new Error('No gateway client');
    const raw = await state.client.getTokenUsage();

    // If the gateway returned a proper daily value, just use it
    if (raw.today > 0) {
      initializedRef.current = true;
      return raw;
    }

    // Apply local daily tracking for gateways that only return a total
    const result = await applyLocalDailyTracking(raw);
    initializedRef.current = true;
    return result;
  }, [state.client]);

  return usePolling<TokenUsage>(fetcher, POLL_INTERVAL);
}
