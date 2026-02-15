import AsyncStorage from '@react-native-async-storage/async-storage';
import { CronRunRecord } from '../types';

const KEY_PREFIX = 'paw_run_history_';
const MAX_ENTRIES_PER_JOB = 50;

function storageKey(jobId: string): string {
  return `${KEY_PREFIX}${jobId}`;
}

/**
 * Load locally-persisted run history for a cron job.
 */
export async function getLocalRunHistory(
  jobId: string,
): Promise<CronRunRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(jobId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore read failures
  }
  return [];
}

/**
 * Merge new run records into local storage, deduplicating by id.
 * Keeps the most recent MAX_ENTRIES_PER_JOB entries.
 */
export async function mergeRunHistory(
  jobId: string,
  newRuns: CronRunRecord[],
): Promise<CronRunRecord[]> {
  const existing = await getLocalRunHistory(jobId);

  // Build a map keyed by id to deduplicate
  const byId = new Map<string, CronRunRecord>();
  for (const run of existing) {
    byId.set(run.id, run);
  }
  for (const run of newRuns) {
    if (run.id) {
      byId.set(run.id, run);
    }
  }

  // Sort newest first and cap the list
  const merged = Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  const capped = merged.slice(0, MAX_ENTRIES_PER_JOB);

  try {
    await AsyncStorage.setItem(storageKey(jobId), JSON.stringify(capped));
  } catch {
    // ignore write failures
  }

  return capped;
}

/**
 * Append a single run record to local history.
 */
export async function appendRunRecord(
  jobId: string,
  run: CronRunRecord,
): Promise<CronRunRecord[]> {
  return mergeRunHistory(jobId, [run]);
}

/**
 * Clear local run history for a job (e.g. on deletion).
 */
export async function clearRunHistory(jobId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(jobId));
  } catch {
    // ignore
  }
}

