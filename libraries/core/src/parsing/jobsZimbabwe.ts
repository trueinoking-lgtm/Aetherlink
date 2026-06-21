/**
 * Structured parser for Jobs Zimbabwe markdown format
 * Extracts job sections from raw scraped content deterministically
 */

type ParsedJob = {
  title: string | null;
  companyName: string | null;
  location: string | null;
  employmentType: string | null;
  category: string | null;
  summary: string | null;
  responsibilities: string[];
  requirements: string[];
  howToApply: string | null;
  applicationEmail: string | null;
  applicationPhone: string | null;
  closingDate: string | null;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSection(markdown: string, heading: string): string | null {
  const pattern = new RegExp(
    `###\\s+${escapeRegex(heading)}\\s*\\n([\\s\\S]*?)(?=\\n###\\s+|\\n##\\s+|$)`,
    'i'
  );

  return markdown.match(pattern)?.[1]?.trim() ?? null;
}

function markdownList(section: string | null): string[] {
  if (!section) return [];

  return section
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*[-*]\s+/, '')
        .replace(/\*\*/g, '')
        .trim()
    )
    .filter(Boolean);
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s+\d+\s+views?\s*$/i, '')
    .replace(/\s*\|\s*Jobs in Zimbabwe.*$/i, '')
    .trim();
}

function cleanText(value: string): string {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, '') // remove images with alt text
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1') // remove links, keep text
    .replace(/\*\*/g, '') // remove bold markers
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

// Patterns that indicate a value is NOT a legitimate company name
const COMPANY_NAME_REJECT_PATTERNS = [
  // Address fragments
  /\d+\s+(?:Road|Rd|Avenue|Ave|Street|St|Drive|Dr|Lane|Ln|Way|Close|Crescent|Blvd|Boulevard)/i,
  // Standalone street numbers at start
  /^\d{1,4}\s+(?:[A-Z][a-z]+\s){1,4}(?:Road|Rd|Avenue|Ave|Street|St|Drive|Dr|Lane|Ln|Way)/i,
  // Phone numbers
  /(?:\+?263|0)\s*\d[\d\s-]{6,}\d/,
  // WhatsApp references
  /whatsapp/i,
  // Email addresses
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  // Application instruction fragments
  /(?:apply|send|email|call|contact|cv|resume)\s+(?:to|at|via|by|on|before|after)/i,
  // Date patterns (e.g. "19 June 2026")
  /\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
  // "P.O. Box" or "PO Box"
  /P\.?\s*O\.?\s*Box/i,
  // Building/floor patterns
  /(?:Building|Floor|Suite|Unit|Block)\s*\d/i,
];

// Maximum length for a legitimate company name
const MAX_COMPANY_NAME_LENGTH = 120;

/**
 * Validates and cleans a company name extracted from markdown.
 * Returns null if the value appears to be an address, phone number,
 * or other non-company text that was incorrectly matched.
 */
function cleanCompanyName(raw: string | null): string | null {
  if (!raw) return null;

  const cleaned = cleanText(raw);

  // Reject empty or whitespace-only
  if (!cleaned) return null;

  // Reject if too long (likely an address or paragraph, not a company name)
  if (cleaned.length > MAX_COMPANY_NAME_LENGTH) return null;

  // Reject if it matches any pollution pattern
  for (const pattern of COMPANY_NAME_REJECT_PATTERNS) {
    if (pattern.test(cleaned)) return null;
  }

  // Reject if it looks like a full sentence (contains multiple clauses)
  if (/[.!?].+[.!?]/.test(cleaned)) return null;

  return cleaned;
}

export function parseJobsZimbabweMarkdown(rawMarkdown: string): ParsedJob {
  // Ignore all related-job and footer material
  const mainContent = rawMarkdown.split(/^###\s+Related Jobs/im)[0] ?? rawMarkdown;

  // Extract title (prefer heading with view count)
  const titleMatch =
    mainContent.match(/^#\s+(.+?)\s+\d+\s+views?\s*$/im) ??
    mainContent.match(/^#\s+(.+)$/im);

  // Extract company from company link pattern
  const companyMatch = mainContent.match(
    /\[([^\]]+)]\([^)]*\/companies\/[^)]*\)/i
  );

  // Extract employment type from job-type link
  const typeMatch = mainContent.match(
    /\[([^\]]+)]\([^)]*\/job-type\/[^)]*\)/i
  );

  // Extract location from jobs-in link
  const locationMatch = mainContent.match(
    /\[_?([^\]]+?)_?]\([^)]*\/jobs-in-[^)]*\)/i
  );

  // Extract category from job-category link
  const categoryMatch = mainContent.match(
    /\[([^\]]+)]\([^)]*\/job-category\/[^)]*\)/i
  );

  // Extract structured sections
  const responsibilitiesSection = getSection(mainContent, 'Key Responsibilities');
  const requirementsSection = getSection(mainContent, 'Requirements');
  const applicationSection = getSection(mainContent, 'How to Apply');
  const jobSummarySection = getSection(mainContent, 'Job Summary');

  // Extract closing date from summary or application section
  const closingDate =
    jobSummarySection?.match(
      /Closing Date:\s*(\d{4}-\d{2}-\d{2})/i
    )?.[1] ??
    applicationSection?.match(
      /(?:deadline|closing date):?\s*([^\n]+)/i
    )?.[1] ??
    null;

  // Extract email from application section
  const email =
    applicationSection?.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    )?.[0] ?? null;

  // Extract phone number (Zimbabwe format)
  const phone =
    applicationSection?.match(
      /(?:\+263|0)\s*\d(?:[\s-]*\d){7,9}/
    )?.[0] ?? null;

  // Find the introductory paragraph before section navigation
  const introMatch = mainContent.match(
    /\n\n([^#*\n][\s\S]*?)\n\n\*\s+\[Job Summary]/i
  );

  return {
    title: titleMatch ? cleanTitle(titleMatch[1]) : null,

    companyName: companyMatch
      ? cleanCompanyName(companyMatch[1])
      : null,

    location: locationMatch
      ? cleanText(locationMatch[1])
      : null,

    employmentType: typeMatch
      ? cleanText(typeMatch[1])
      : null,

    category: categoryMatch
      ? cleanText(categoryMatch[1])
      : null,

    summary: introMatch
      ? cleanText(introMatch[1])
      : null,

    responsibilities: markdownList(responsibilitiesSection),

    requirements: markdownList(requirementsSection),

    howToApply: applicationSection
      ? cleanText(applicationSection)
      : null,

    applicationEmail: email,

    applicationPhone: phone,

    closingDate:
      closingDate && /^\d{4}-\d{2}-\d{2}$/.test(closingDate)
        ? closingDate
        : null,
  };
}

// Export type for use in other modules
export type { ParsedJob };