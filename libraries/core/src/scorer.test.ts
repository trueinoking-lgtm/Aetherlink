import { scoreMatch } from './scorer';

describe('scoreMatch', () => {
  it('scores full match highly', () => {
    const result = scoreMatch(
      ['Python development', 'Excel reporting'],
      ['Python', 'SQL'],
      [],
      ['Built Excel dashboards for finance team'],
    );
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.matched.length).toBeGreaterThan(0);
    expect(result.percentileColor).toBeDefined();
  });

  it('returns default score when no requirements', () => {
    const result = scoreMatch([], ['Accounting'], [], []);
    expect(result.score).toBe(50);
  });

  it('marks missing requirements', () => {
    const result = scoreMatch(
      ['CCNA certification required', 'Kubernetes orchestration'],
      ['Customer service'],
      [],
      [],
    );
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(50);
  });
});
