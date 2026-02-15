/**
 * Well-known context window sizes for popular LLM models.
 * Values are in tokens. Used as a fallback when the gateway
 * doesn't return contextWindow in its models list.
 */

const KNOWN_CONTEXT_WINDOWS: Record<string, number> = {
  // Anthropic — Claude 4.x
  'claude-opus-4-6': 200_000,
  'claude-opus-4': 200_000,
  'claude-sonnet-4': 200_000,
  'claude-sonnet-4-5': 200_000,
  // Anthropic — Claude 3.x
  'claude-3-opus': 200_000,
  'claude-3-opus-20240229': 200_000,
  'claude-3-sonnet': 200_000,
  'claude-3-sonnet-20240229': 200_000,
  'claude-3-haiku': 200_000,
  'claude-3-haiku-20240307': 200_000,
  'claude-3.5-sonnet': 200_000,
  'claude-3-5-sonnet-20240620': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-5-haiku-20241022': 200_000,
  // OpenAI — GPT-4o / GPT-4
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4o-2024-05-13': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-4-turbo-preview': 128_000,
  'gpt-4-1106-preview': 128_000,
  'gpt-4-0125-preview': 128_000,
  'gpt-4': 8_192,
  'gpt-4-32k': 32_768,
  // OpenAI — GPT-3.5
  'gpt-3.5-turbo': 16_385,
  'gpt-3.5-turbo-16k': 16_385,
  // OpenAI — o-series
  'o1': 200_000,
  'o1-mini': 128_000,
  'o1-preview': 128_000,
  'o3': 200_000,
  'o3-mini': 200_000,
  'o4-mini': 200_000,
  // Google — Gemini
  'gemini-pro': 32_000,
  'gemini-1.5-pro': 1_000_000,
  'gemini-1.5-flash': 1_000_000,
  'gemini-2.0-flash': 1_000_000,
  'gemini-2.5-pro': 1_000_000,
  // Meta — Llama
  'llama-3-8b': 8_192,
  'llama-3-70b': 8_192,
  'llama-3.1-8b': 128_000,
  'llama-3.1-70b': 128_000,
  'llama-3.1-405b': 128_000,
  // Mistral
  'mistral-large': 128_000,
  'mistral-medium': 32_000,
  'mistral-small': 32_000,
  'mixtral-8x7b': 32_000,
  // DeepSeek
  'deepseek-v3': 128_000,
  'deepseek-r1': 128_000,
  'deepseek-coder': 128_000,
};

/**
 * Format a token count as a human-readable context window label.
 * e.g. 200000 → "200K", 1000000 → "1M"
 */
export function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(tokens % 1_000 === 0 ? 0 : 1)}K`;
  return String(tokens);
}

/**
 * Resolve the context window size for a model name.
 *
 * Strategy:
 * 1. Exact match against the known map
 * 2. Fuzzy match (find the longest key that is a substring of the model name)
 * 3. Return undefined if nothing matches
 *
 * @param modelName - The model identifier (e.g. "claude-opus-4-6")
 * @param dynamicContextWindow - Optional context window from the gateway's model list
 * @returns Formatted context window string (e.g. "200K") or "—"
 */
export function getContextWindowLabel(
  modelName: string | undefined,
  dynamicContextWindow?: number,
): string {
  // Prefer dynamic value from the gateway
  if (dynamicContextWindow && dynamicContextWindow > 0) {
    return formatContextWindow(dynamicContextWindow);
  }

  if (!modelName) return '—';

  const lower = modelName.toLowerCase().trim();

  // Exact match
  if (KNOWN_CONTEXT_WINDOWS[lower]) {
    return formatContextWindow(KNOWN_CONTEXT_WINDOWS[lower]);
  }

  // Fuzzy: find the longest key that appears as a substring
  let bestMatch = '';
  let bestTokens = 0;
  for (const [key, tokens] of Object.entries(KNOWN_CONTEXT_WINDOWS)) {
    if (lower.includes(key) && key.length > bestMatch.length) {
      bestMatch = key;
      bestTokens = tokens;
    }
  }

  if (bestTokens > 0) {
    return formatContextWindow(bestTokens);
  }

  return '—';
}

