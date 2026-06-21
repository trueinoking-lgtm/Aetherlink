/**
 * Tests for Jobs Zimbabwe markdown parser — company name cleaning
 */
import { parseJobsZimbabweMarkdown } from '../parsing/jobsZimbabwe';

describe('parseJobsZimbabweMarkdown — companyName cleaning', () => {
  // Helper: build a minimal valid markdown document with a given company link
  function makeMarkdown(companyLink: string): string {
    return `# Test Job 123 views

${companyLink}

## Job Summary

Some summary text.

### Key Responsibilities

- Responsibility 1
- Responsibility 2

### Requirements

- Requirement 1
- Requirement 2

### How to Apply

Apply by email.
`;
  }

  // === Legitimate company names (should be preserved) ===

  test('preserves simple company name', () => {
    const md = makeMarkdown('[TechCorp](/companies/techcorp)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBe('TechCorp');
  });

  test('preserves company name with ampersand', () => {
    const md = makeMarkdown('[Smith & Associates](/companies/smith-associates)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBe('Smith & Associates');
  });

  test('preserves long but legitimate company name', () => {
    const name = 'Manufacturers and Suppliers of Agricultural, Mining & Industrial Equipment';
    const md = makeMarkdown(`[${name}](/companies/manufacturers)`);
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBe(name);
  });

  test('preserves company name with Ltd', () => {
    const md = makeMarkdown('[Harare Logistics Ltd](/companies/harare-logistics)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBe('Harare Logistics Ltd');
  });

  test('preserves company name with numbers', () => {
    const md = makeMarkdown('[3M Company](/companies/3m)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBe('3M Company');
  });

  test('preserves company name with parentheses', () => {
    const md = makeMarkdown('[Acme (Pvt) Ltd](/companies/acme)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBe('Acme (Pvt) Ltd');
  });

  // === Polluted values (should be rejected → null) ===

  test('rejects address with street number and Road', () => {
    const md = makeMarkdown('[123 Samora Machel Road](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects address with Avenue', () => {
    const md = makeMarkdown('[456 Harare Avenue](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects phone number', () => {
    const md = makeMarkdown('[+263 718 647 091](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects local phone number', () => {
    const md = makeMarkdown('[0719 108 416](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects WhatsApp reference', () => {
    const md = makeMarkdown('[WhatsApp +263 77 123 4567](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects email address', () => {
    const md = makeMarkdown('[hr@company.co.zw](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects application instruction', () => {
    const md = makeMarkdown('[Apply to HR Manager](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects date string', () => {
    const md = makeMarkdown('[19 June 2026](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects P.O. Box', () => {
    const md = makeMarkdown('[P.O. Box 1234](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects very long text (paragraph)', () => {
    const longText = 'This is a very long piece of text that goes on and on and should definitely not be considered a company name because it is clearly a paragraph of instructions';
    const md = makeMarkdown(`[${longText}](/companies/some-company)`);
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects multi-sentence text', () => {
    const md = makeMarkdown('[Apply now. Send your CV to us. We are hiring.](/companies/some-company)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  // === Edge cases ===

  test('returns null when no company link exists', () => {
    const md = `# Test Job 123 views

## Job Summary

Some text.
`;
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('handles company name with hyphen', () => {
    const md = makeMarkdown('[Blue-Chip Holdings](/companies/blue-chip)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBe('Blue-Chip Holdings');
  });

  test('handles company name with dots', () => {
    const md = makeMarkdown('[Pty. Ltd](/companies/pty-ltd)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBe('Pty. Ltd');
  });

  // === New rejection patterns (Phase 3) ===

  test('rejects "Companies" navigation link text', () => {
    const md = makeMarkdown('[Companies](/companies/)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects "Name Withheld" placeholder', () => {
    const md = makeMarkdown('[Name Withheld](/companies/withheld)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects "Home" navigation link text', () => {
    const md = makeMarkdown('[Home](/companies/home)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects "Jobs" navigation link text', () => {
    const md = makeMarkdown('[Jobs](/companies/jobs)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  test('rejects address + WhatsApp + phone pollution', () => {
    const md = makeMarkdown('[Address: 115 ED Mnangagwa Rd, Highlands, Harare Whatsapp ONLY for CV Making: +263****4514](/companies/polluted)');
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.companyName).toBeNull();
  });

  // === Closing date with bold prefix ===

  test('parses closing date with bold markdown prefix', () => {
    const md = `# Test Job 123 views

[TestCo](/companies/testco)

### Job Summary

* **Type:** full-time
* **Location:** Harare
* **Category:** Sales
* **Closing Date:** ** 2026-07-03
`;
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.closingDate).toBe('2026-07-03');
  });

  test('parses closing date without bold prefix', () => {
    const md = `# Test Job 123 views

[TestCo](/companies/testco)

### Job Summary

Closing Date: 2026-06-19
`;
    const result = parseJobsZimbabweMarkdown(md);
    expect(result.closingDate).toBe('2026-06-19');
  });
});
