/**
 * Client-side match scorer.
 * Scores a job against the user's skills by keyword overlap.
 */

export function computeMatchScore(
  requirements: string[],
  userSkills: string[],
  userCertifications: string[] = [],
  userExperienceBullets: string[] = [],
): number | null {
  if (!userSkills.length || !requirements.length) {
    return null;
  }

  const jobKeywords = requirements.flatMap(req => 
    req.toLowerCase()
      .split(/[^a-zA-Z0-9]+/)
      .filter(word => word.length >= 3)
  );

  const userKeywords = [
    ...userSkills.map(s => s.toLowerCase()),
    ...userCertifications.map(c => c.toLowerCase()),
    ...userExperienceBullets.flatMap(b => 
      b.toLowerCase()
        .split(/[^a-zA-Z0-9]+/)
        .filter(word => word.length >= 3)
    )
  ];

  const matchedKeywords = jobKeywords.filter(jobWord => 
    userKeywords.some(userWord => userWord.includes(jobWord) || jobWord.includes(userWord))
  );

  const uniqueMatched = [...new Set(matchedKeywords)];
  return Math.min(100, Math.round((uniqueMatched.length / Math.max(jobKeywords.length, 1)) * 100));
}

// Legacy function for backward compatibility
export function computeLegacyMatchScore(
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
