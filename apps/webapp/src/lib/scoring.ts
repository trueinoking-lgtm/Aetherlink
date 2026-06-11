/**
 * Client-side match scorer.
 * Scores a job against the user's skills by keyword overlap.
 *
 * TODO: replace with server-side scoring
 */

export function computeMatchScore(
  jobTitle: string,
  jobRawText: string | null | undefined,
  userSkills: string[],
): number {
  if (!userSkills.length) return 0;

  const text = `${jobTitle} ${jobRawText ?? ''}`.toLowerCase();
  const hits = userSkills.filter((skill) => {
    const normalized = skill.toLowerCase().trim();
    if (normalized.length < 2) return false;
    return text.includes(normalized);
  });

  if (!hits.length) return 0;
  return Math.min(100, Math.round((hits.length / userSkills.length) * 100));
}