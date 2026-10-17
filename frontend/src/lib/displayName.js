/**
 * Works out what to call the signed-in user.
 *
 * The `User` model only has an email - there is no `name` field - so pages that
 * read `currentUser.name` always fell through to the literal string "User".
 * This helper walks the sources that can actually supply a name and returns a
 * sensible fallback instead of a generic label.
 *
 * @param {object|null} profile  JobSeekerProfile (from `GET /profile`)
 * @param {object|null} user     the AuthContext `currentUser`
 * @returns {string} a first name, or an email local-part, or "there"
 */
export const getDisplayName = (profile, user) => {
  const fromProfile = [
    profile?.firstName,
    profile?.full_name ? String(profile.full_name).trim().split(/\s+/)[0] : null,
  ].find((value) => typeof value === 'string' && value.trim());

  if (fromProfile) return fromProfile.trim();

  const fromUser = [user?.firstName, user?.name, user?.full_name].find(
    (value) => typeof value === 'string' && value.trim()
  );
  if (fromUser) return fromUser.trim().split(/\s+/)[0];

  const email = user?.email;
  if (email) {
    const localPart = String(email).split('@')[0];
    // "john.doe@example.com" reads better as "john.doe" than as nothing.
    return localPart || 'there';
  }

  return 'there';
};

/**
 * Splits a full name into first and last, for greeting text.
 * Falls back to the whole string when there is no clear split point.
 */
export const getFirstName = (profile, user) => {
  const name = getDisplayName(profile, user);
  return name.split(/\s+/)[0] || 'there';
};
