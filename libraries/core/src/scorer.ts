export interface ScoreResult {
  score: number;
  matched: string[];
  missing: string[];
  percentileLabel: string;
  percentileColor: 'green' | 'amber' | 'red';
}

export function scoreMatch(
  jobRequirements: string[],
  userSkills: string[],
  userCertifications: string[],
  userExperienceBullets: string[],
): ScoreResult {
  const userText = [...userSkills, ...userCertifications, ...userExperienceBullets]
    .join(' ')
    .toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of jobRequirements) {
    const keywords = req
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const hits = keywords.filter((kw) => userText.includes(kw));
    if (keywords.length === 0 || hits.length >= Math.ceil(keywords.length * 0.5)) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  }

  const score =
    jobRequirements.length > 0 ? Math.round((matched.length / jobRequirements.length) * 100) : 50;

  const percentileLabel =
    score >= 80 ? 'Top 15%' : score >= 60 ? 'Top 35%' : score >= 40 ? 'Top 55%' : 'Bottom 40%';

  const percentileColor = score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red';

  return { score, matched, missing, percentileLabel, percentileColor };
}
