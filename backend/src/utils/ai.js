import 'dotenv/config';
import { getOpenAIClient } from './openaiClient.js';
import logger from './logger.js';

/**
 * Shared helper for the AI-backed features (CV analysis, career paths, interview
 * practice, course picks).
 *
 * Every caller passes a `fallback`. If no API key is configured, the request
 * fails, or the model returns something unusable, we log the reason and return
 * the fallback instead. That way an OpenAI outage degrades the product rather
 * than breaking a page.
 */

/** Clamp a number into a range, falling back when it is not finite. */
export const clampNumber = (value, min, max, fallback = min) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
};

/** Coerce anything the model returns into a clean array of non-empty strings. */
export const toStringArray = (value, { limit = 20 } = {}) => {
  const raw = Array.isArray(value) ? value : [];
  const cleaned = raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, limit);
  return cleaned;
};

/**
 * Extract the first balanced JSON object from a model response.
 *
 * JSON mode is requested, but models still occasionally wrap the payload in
 * prose or markdown fences, so we scan for the outermost `{...}`.
 */
export const extractJson = (content) => {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Model returned an empty response');
  }

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : content).trim();

  const start = candidate.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON object found in model response');
  }

  // Walk forward tracking brace depth, ignoring braces inside strings.
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i += 1) {
    const char = candidate[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(candidate.slice(start, i + 1));
      }
    }
  }

  throw new Error('Model response contained an unterminated JSON object');
};

/**
 * Run a single JSON-mode chat completion.
 *
 * @param {object} options
 * @param {string} options.system        system prompt
 * @param {string} options.user          user prompt (usually includes the JSON contract)
 * @param {string} [options.model]       override OPENAI_MODEL
 * @param {number} [options.temperature]
 * @param {number} [options.maxTokens]
 * @returns {Promise<object>} the parsed JSON object
 */
export const requestJson = async ({
  system,
  user,
  model,
  temperature = 0.3,
  maxTokens = 1600,
}) => {
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  return extractJson(completion.choices?.[0]?.message?.content || '');
};

/**
 * `requestJson` with a fallback and uniform error handling.
 *
 * @param {object} options
 * @param {() => any} options.fallback   called when the AI call cannot be used
 * @param {string} options.label          used in log output
 * @returns {Promise<{ data: any, aiGenerated: boolean, aiError: string|null }>}
 */
export const requestJsonWithFallback = async ({ fallback, label, ...options }) => {
  try {
    const data = await requestJson(options);
    return { data, aiGenerated: true, aiError: null };
  } catch (error) {
    const message = error?.message || 'Unknown AI error';
    logger.warn(`[ai:${label}] falling back to local logic:`, message);
    return { data: fallback(), aiGenerated: false, aiError: message };
  }
};

/** Normalise a skill for comparison: lowercase, trim, collapse separators. */
export const normalizeSkill = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[\s_\-/.]+/g, ' ')
    .trim();

/**
 * Do two skill labels refer to the same thing?
 *
 * Handles the common variations that break naive equality matching:
 * "React JS" ~ "React", "Node.js" ~ "Node", "PostgreSQL" ~ "Postgres".
 */
export const skillsMatch = (a, b) => {
  const left = normalizeSkill(a);
  const right = normalizeSkill(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  return false;
};

/**
 * Given a candidate skill list, find which entries are already covered.
 * Used to compute "missing skills" consistently across features.
 *
 * @param {string[]} required  skills the role/job asks for
 * @param {string[]} have      skills the user actually has
 * @returns {{ skill: string, matchedBy: string|null }[]}
 */
export const resolveSkillCoverage = (required, have) => {
  const owned = (have || []).filter(Boolean);

  return (required || []).filter(Boolean).map((skill) => ({
    skill,
    matchedBy: owned.find((candidate) => skillsMatch(candidate, skill)) || null,
  }));
};
