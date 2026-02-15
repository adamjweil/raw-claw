import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../services/store';

/**
 * Strip markdown list markers (`- `, `* `, `• `) and bold/italic wrappers
 * (`**`, `__`, `*`, `_`) so field matching works on decorated lines.
 */
function stripMarkdown(line: string): string {
  // Remove leading list markers: "- ", "* ", "• ", numbered "1. "
  let s = line.replace(/^(?:[-*•]\s+|\d+\.\s+)/, '');
  // Remove bold / italic wrappers
  s = s.replace(/\*\*|__/g, '').replace(/[*_]/g, '');
  return s.trim();
}

/**
 * Extracts a name from the IDENTITY.md file content.
 *
 * Tries (in order):
 *  1. A "Name:" field (handles markdown bold / list bullets)
 *     e.g. `- **Name:** FalconClaw`
 *  2. The first `# ` heading that isn't a meta/title heading
 *  3. The first non-empty, non-heading line as a last resort
 */
function parseNameFromIdentity(content: string): string | null {
  if (!content || !content.trim()) return null;

  const lines = content.split('\n').map((l) => l.trim());

  // 1. Look for an explicit "Name:" field (strip markdown formatting first)
  for (const line of lines) {
    const clean = stripMarkdown(line);
    const match = clean.match(/^name\s*[:=]\s*(.+)/i);
    if (match) {
      const value = match[1].trim().replace(/^["']|["']$/g, '');
      if (value) return value;
    }
  }

  // 2. Use the first markdown H1 heading (skip meta headings like "IDENTITY.md - Who Am I?")
  for (const line of lines) {
    if (line.startsWith('# ')) {
      const heading = line.slice(2).trim();
      if (heading && !heading.toLowerCase().includes('identity') && !heading.toLowerCase().includes('who am i')) {
        return heading;
      }
    }
  }

  // 3. Fallback: first non-empty, non-comment line
  for (const line of lines) {
    if (line && !line.startsWith('#') && !line.startsWith('---') && !line.startsWith('//')) {
      return line;
    }
  }

  return null;
}

/**
 * Hook that fetches the IDENTITY.md memory file and extracts the agent name.
 * Returns null while loading or if the file doesn't contain a parseable name.
 */
export function useIdentityName(): string | null {
  const { state } = useStore();
  const [name, setName] = useState<string | null>(null);

  const fetchIdentity = useCallback(async () => {
    if (!state.client || !state.connected) {
      setName(null);
      return;
    }
    try {
      const file = await state.client.getMemoryFile('IDENTITY.md');
      const parsed = parseNameFromIdentity(file.content);
      setName(parsed);
    } catch {
      // File may not exist or gateway unreachable — silently fall back
      setName(null);
    }
  }, [state.client, state.connected]);

  useEffect(() => {
    fetchIdentity();
  }, [fetchIdentity]);

  return name;
}

