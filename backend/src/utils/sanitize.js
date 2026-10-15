/**
 * Escape a user-supplied string so it is safe to interpolate into a MongoDB
 * $regex. Without this, characters like `(`, `[`, `+` and `\` are treated as
 * regex metacharacters, which causes invalid-regex 400s and slow queries.
 */
export const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
