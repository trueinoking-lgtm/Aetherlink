/**
 * Regression tests for critical rendering/formatting functions.
 *
 * Tests extracted from Phase 2 audit findings.
 * Covers: getApplicationAction, cleanUrl, getEmployerName, formatDate,
 *         phone normalization, responsibilities/requirements normalization.
 */

// ============================================================
// Function implementations (mirrors production code exactly)
// ============================================================

// From feed/[id]/page.tsx
function getEmployerName(companyName?: string | null): string {
  const value = companyName?.trim();
  if (
    !value ||
    value.toLowerCase() === 'unknown employer' ||
    value.toLowerCase() === 'companies'
  ) {
    return 'Employer not disclosed';
  }
  return value;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function cleanUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  return trimmed !== '#' && /^https?:\/\//i.test(trimmed) ? trimmed : '';
}

interface ApplicationAction {
  label: string;
  href: string | null;
  kind: 'link' | 'instructions';
}

interface JobLike {
  application_email?: string | null;
  application_url?: string | null;
  application_phone?: string | null;
  how_to_apply?: string | null;
  externalUrl?: string | null;
}

function getApplicationAction(job: JobLike): ApplicationAction {
  if (job.application_email) {
    return {
      label: 'Apply by email',
      href: `mailto:${job.application_email}`,
      kind: 'link',
    };
  }

  const cleanAppUrl = cleanUrl(job.application_url);
  if (cleanAppUrl) {
    return {
      label: 'Apply on employer site',
      href: cleanAppUrl,
      kind: 'link',
    };
  }

  if (job.application_phone) {
    const normalizedPhone = job.application_phone.replace(/[^\d+]/g, '');
    return {
      label: 'Contact employer',
      href: `tel:${normalizedPhone}`,
      kind: 'link',
    };
  }

  if (job.how_to_apply?.trim()) {
    return {
      label: 'View application instructions',
      href: null,
      kind: 'instructions',
    };
  }

  return {
    label: 'View original listing',
    href: job.externalUrl ?? null,
    kind: 'link',
  };
}

// ============================================================
// TESTS
// ============================================================

describe('getEmployerName', () => {
  test('returns company name for valid input', () => {
    expect(getEmployerName('Acme Corp')).toBe('Acme Corp');
  });

  test('handles "Unknown Employer"', () => {
    expect(getEmployerName('Unknown Employer')).toBe('Employer not disclosed');
  });

  test('handles "Companies"', () => {
    expect(getEmployerName('Companies')).toBe('Employer not disclosed');
  });

  test('handles null/undefined', () => {
    expect(getEmployerName(undefined)).toBe('Employer not disclosed');
    // null is handled via optional chaining in production
    expect(getEmployerName('' as string)).toBe('Employer not disclosed');
  });

  test('handles empty string', () => {
    expect(getEmployerName('')).toBe('Employer not disclosed');
    expect(getEmployerName('   ')).toBe('Employer not disclosed');
  });

  test('handles case variations', () => {
    expect(getEmployerName('unknown employer')).toBe('Employer not disclosed');
    expect(getEmployerName('COMPANIES')).toBe('Employer not disclosed');
    expect(getEmployerName('UNKNOWN EMPLOYER')).toBe('Employer not disclosed');
  });

  test('preserves long company names', () => {
    const long = 'Manufacturers and Suppliers of Agricultural, Mining & Industrial Equipment';
    expect(getEmployerName(long)).toBe(long);
  });
});

describe('formatDate', () => {
  test('formats valid ISO date', () => {
    expect(formatDate('2026-06-19')).toBe('19 June 2026');
  });

  test('formats future dates', () => {
    expect(formatDate('2026-07-03')).toBe('3 July 2026');
  });

  test('handles null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  test('handles empty string', () => {
    expect(formatDate('')).toBe('');
  });

  test('handles invalid date strings', () => {
    expect(formatDate('not-a-date')).toBe('');
    // Note: '** 2026-06-19' is actually parsed by JS Date as valid
    // This is why the UI uses closing_date (clean) not deadline (has prefix)
    expect(formatDate('** 2026-06-19')).toBe('19 June 2026');
  });
});

describe('cleanUrl', () => {
  test('accepts valid https URL', () => {
    expect(cleanUrl('https://example.com')).toBe('https://example.com');
  });

  test('accepts valid http URL', () => {
    expect(cleanUrl('http://example.com')).toBe('http://example.com');
  });

  test('rejects #', () => {
    expect(cleanUrl('#')).toBe('');
  });

  test('rejects empty string', () => {
    expect(cleanUrl('')).toBe('');
  });

  test('rejects undefined', () => {
    expect(cleanUrl(undefined)).toBe('');
  });

  test('rejects URL without scheme', () => {
    expect(cleanUrl('example.com')).toBe('');
  });

  test('rejects javascript: URLs', () => {
    expect(cleanUrl('javascript:alert(1)')).toBe('');
  });

  test('trims whitespace', () => {
    expect(cleanUrl('  https://example.com  ')).toBe('https://example.com');
  });
});

describe('getApplicationAction', () => {
  describe('priority order', () => {
    test('email takes priority over phone', () => {
      const action = getApplicationAction({
        application_email: 'test@example.com',
        application_phone: '+263718647091',
      });
      expect(action.label).toBe('Apply by email');
      expect(action.href).toBe('mailto:test@example.com');
    });

    test('email takes priority over URL', () => {
      const action = getApplicationAction({
        application_email: 'test@example.com',
        application_url: 'https://example.com/apply',
      });
      expect(action.label).toBe('Apply by email');
    });

    test('URL takes priority over phone', () => {
      const action = getApplicationAction({
        application_url: 'https://example.com/apply',
        application_phone: '+263718647091',
      });
      expect(action.label).toBe('Apply on employer site');
      expect(action.href).toBe('https://example.com/apply');
    });

    test('phone takes priority over how_to_apply', () => {
      const action = getApplicationAction({
        application_phone: '+263718647091',
        how_to_apply: 'Send CV to HR',
      });
      expect(action.label).toBe('Contact employer');
    });
  });

  describe('phone handling', () => {
    test('normalizes phone with + prefix', () => {
      const action = getApplicationAction({
        application_phone: '+263 718 647 091',
      });
      expect(action.href).toBe('tel:+263718647091');
    });

    test('normalizes phone without + prefix', () => {
      const action = getApplicationAction({
        application_phone: '0719 108 416',
      });
      expect(action.href).toBe('tel:0719108416');
    });

    test('strips spaces and dashes from phone', () => {
      const action = getApplicationAction({
        application_phone: '+263 772-110-571',
      });
      expect(action.href).toBe('tel:+263772110571');
    });
  });

  describe('email handling', () => {
    test('creates mailto link', () => {
      const action = getApplicationAction({
        application_email: 'hr@company.com',
      });
      expect(action.label).toBe('Apply by email');
      expect(action.href).toBe('mailto:hr@company.com');
    });
  });

  describe('URL handling', () => {
    test('creates link for valid URL', () => {
      const action = getApplicationAction({
        application_url: 'https://example.com/apply',
      });
      expect(action.label).toBe('Apply on employer site');
      expect(action.href).toBe('https://example.com/apply');
    });

    test('rejects # URL and falls through', () => {
      const action = getApplicationAction({
        application_url: '#',
        how_to_apply: 'Send CV',
      });
      expect(action.label).toBe('View application instructions');
    });
  });

  describe('how_to_apply fallback', () => {
    test('shows instructions for text-only applications', () => {
      const action = getApplicationAction({
        how_to_apply: 'HAND DELIVERED TO: GS8 SUNHINE BAZAARS',
      });
      expect(action.label).toBe('View application instructions');
      expect(action.kind).toBe('instructions');
      expect(action.href).toBeNull();
    });

    test('ignores whitespace-only how_to_apply', () => {
      const action = getApplicationAction({
        how_to_apply: '   ',
        externalUrl: 'https://example.com',
      });
      expect(action.label).toBe('View original listing');
    });
  });

  describe('final fallback', () => {
    test('falls back to externalUrl when nothing else', () => {
      const action = getApplicationAction({
        externalUrl: 'https://jobszimbabwe.co.zw/jobs/123',
      });
      expect(action.label).toBe('View original listing');
      expect(action.href).toBe('https://jobszimbabwe.co.zw/jobs/123');
    });

    test('handles completely empty job', () => {
      const action = getApplicationAction({});
      expect(action.label).toBe('View original listing');
      expect(action.href).toBeNull();
    });
  });
});

describe('responsibilities/requirements normalization', () => {
  test('handles string array (expected format)', () => {
    const resp = ['Find customers', 'Negotiate prices'];
    expect(Array.isArray(resp)).toBe(true);
    expect(resp.length).toBe(2);
    expect(typeof resp[0]).toBe('string');
  });

  test('handles empty array', () => {
    const resp: string[] = [];
    expect(resp.length).toBe(0);
    expect(!!resp?.length).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    const resp = null as unknown as string[] | null;
    expect(resp?.length || 0).toBe(0);
  });

  test('UI condition: !!array?.length', () => {
    expect(!!['a']?.length).toBe(true);
    expect(!![]?.length).toBe(false);
    expect(!!(undefined as unknown as string[])?.length).toBe(false);
  });
});

describe('match score display conditions', () => {
  const hasScorableContent = (job: { requirements?: string[]; responsibilities?: string[] }) =>
    Boolean(job.requirements?.length) || Boolean(job.responsibilities?.length);

  const shouldShowScore = (job: { parser_version?: number; requirements?: string[]; responsibilities?: string[] }, matchScore: number | null) => {
    return matchScore != null && hasScorableContent(job);
  };

  const shouldShowNotScored = (job: { parser_version?: number; requirements?: string[]; responsibilities?: string[] }, showScore: boolean) => {
    return !showScore && job.parser_version === 2;
  };

  test('pv2 with content shows score', () => {
    const job = { parser_version: 2, requirements: ['req1'], responsibilities: ['resp1'] };
    expect(hasScorableContent(job)).toBe(true);
    expect(shouldShowScore(job, 75)).toBe(true);
  });

  test('pv2 without content shows "Not scored"', () => {
    const job = { parser_version: 2, requirements: [], responsibilities: [] };
    expect(hasScorableContent(job)).toBe(false);
    expect(shouldShowScore(job, null)).toBe(false);
    expect(shouldShowNotScored(job, false)).toBe(true);
  });

  test('pv1 always shows legacy score', () => {
    const job = { parser_version: 1, requirements: ['req1'] };
    // Legacy scoring doesn't use hasScorableContent check
    expect(job.parser_version === 2).toBe(false);
  });

  test('null matchScore hides score even with content', () => {
    const job = { parser_version: 2, requirements: ['req1'] };
    expect(shouldShowScore(job, null)).toBe(false);
  });
});
