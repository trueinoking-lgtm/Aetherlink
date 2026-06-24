import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CvPdfData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  professionalSummary: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string;
  }>;
  education: Array<{
    qualification: string;
    institution: string;
    year: string;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    year?: string;
  }>;
  references: string;
}

type TemplateName = 'clean-ats' | 'modern-tech' | 'entry-level';

// ─── Template configurations ─────────────────────────────────────────────────

interface TemplateConfig {
  primaryColor: string;
  headlineColor: string;
  bodyColor: string;
  sectionOrder: Array<
    'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications' | 'references'
  >;
}

const TEMPLATE_CONFIGS: Record<TemplateName, TemplateConfig> = {
  'clean-ats': {
    /** Minimal, monochrome, ATS-friendly. Single column, underlined section headers, no colors. */
    primaryColor: '#000000',
    headlineColor: '#444444',
    bodyColor: '#000000',
    sectionOrder: [
      'summary',
      'experience',
      'education',
      'skills',
      'projects',
      'certifications',
      'references',
    ],
  },
  'modern-tech': {
    /** Modern look with indigo (#6366f1) accent on section headers. Clean, professional. */
    primaryColor: '#6366f1',
    headlineColor: '#555555',
    bodyColor: '#222222',
    sectionOrder: [
      'summary',
      'experience',
      'skills',
      'projects',
      'education',
      'certifications',
      'references',
    ],
  },
  'entry-level': {
    /** Designed for candidates with limited experience. Emphasises skills, projects, and education. */
    primaryColor: '#059669',
    headlineColor: '#555555',
    bodyColor: '#222222',
    sectionOrder: [
      'summary',
      'skills',
      'projects',
      'education',
      'experience',
      'certifications',
      'references',
    ],
  },
};

// ─── Font-size scaling for single-page fit ──────────────────────────────────

interface FontScale {
  body: number;
  name: number;
  headline: number;
  contact: number;
  section: number;
}

/**
 * Roughly estimate how many "visual lines" the content will occupy at 10pt.
 * Used to decide whether we need to shrink fonts so everything fits on one A4
 * page with 35 mm margins.
 */
function estimateContentLines(data: CvPdfData): number {
  const cpl = 80; // conservative characters-per-line at 10pt / 140 mm usable width
  const lines = (text: string): number =>
    text ? Math.max(1, Math.ceil(text.length / cpl)) : 0;

  let n = 3; // name + headline + contact

  if (data.professionalSummary) n += 1 + lines(data.professionalSummary);
  if (data.skills.length > 0) n += 1 + lines(data.skills.join(', '));

  if (data.experience.length > 0) {
    n += 1; // section header
    for (const exp of data.experience) {
      n += 1; // role / company / duration line
      for (const b of exp.bullets) n += lines(b);
    }
  }

  if (data.projects.length > 0) {
    n += 1; // section header
    for (const p of data.projects) {
      n += lines(`${p.name}: ${p.description} (${p.technologies})`);
    }
  }

  if (data.education.length > 0) n += 1 + data.education.length;
  if (data.certifications.length > 0) n += 1 + data.certifications.length;
  if (data.references) n += 1 + lines(data.references);

  return n;
}

/**
 * Determine font sizes to target a single A4 page.
 *
 * Usable height with 35 mm margins ≈ 227 mm.
 * At 10 pt with line-height 1.4 a line is ~4.94 mm → roughly 46 lines.
 * We budget 42 lines at full size (leaving room for margins & spacing) and
 * scale proportionally below that, down to a minimum of 70 % (7 pt body).
 */
function computeFontScale(data: CvPdfData): FontScale {
  const MAX_LINES = 42;
  const estimated = estimateContentLines(data);

  if (estimated <= MAX_LINES) {
    return { body: 10, name: 18, headline: 11, contact: 9, section: 11 };
  }

  const scale = Math.max(0.7, MAX_LINES / estimated);
  const r = (v: number) => Math.round(v * scale * 10) / 10;

  return { body: r(10), name: r(18), headline: r(11), contact: r(9), section: r(11) };
}

// ─── Stylesheet factory ──────────────────────────────────────────────────────

function createStyles(template: TemplateName, fs: FontScale) {
  const config = TEMPLATE_CONFIGS[template];
  const sectionMarginTop = template === 'entry-level' ? 10 : 8;

  return StyleSheet.create({
    page: {
      padding: '35mm',
      fontFamily: 'Helvetica',
      fontSize: fs.body,
      lineHeight: 1.4,
      color: config.bodyColor,
    },
    name: {
      fontSize: fs.name,
      fontWeight: 'bold',
      marginBottom: 2,
    },
    headline: {
      fontSize: fs.headline,
      color: config.headlineColor,
      marginBottom: 4,
    },
    contactLine: {
      fontSize: fs.contact,
      color: config.headlineColor,
      marginBottom: 10,
    },
    sectionHeader: {
      fontSize: fs.section,
      fontWeight: 'bold',
      color: config.primaryColor,
      borderBottomWidth: 1,
      borderBottomColor: config.primaryColor,
      borderBottomStyle: 'solid',
      paddingBottom: 2,
      marginTop: sectionMarginTop,
      marginBottom: 4,
    },
    bodyText: {
      fontSize: fs.body,
      lineHeight: 1.4,
      marginBottom: 4,
    },
    experienceBlock: {
      marginBottom: 4,
    },
    experienceRole: {
      fontSize: fs.body,
      fontWeight: 'bold',
      marginBottom: 1,
      marginTop: 2,
    },
    bullet: {
      fontSize: fs.body,
      lineHeight: 1.4,
      paddingLeft: 8,
      marginBottom: 0,
    },
    projectBlock: {
      marginBottom: 4,
    },
    projectName: {
      fontSize: fs.body,
      fontWeight: 'bold',
      marginBottom: 0,
      marginTop: 2,
    },
    projectDetail: {
      fontSize: fs.body,
      lineHeight: 1.4,
    },
    educationLine: {
      fontSize: fs.body,
      lineHeight: 1.4,
      marginBottom: 1,
    },
    certLine: {
      fontSize: fs.body,
      lineHeight: 1.4,
      marginBottom: 1,
    },
    skillsLine: {
      fontSize: fs.body,
      lineHeight: 1.4,
      marginBottom: 4,
    },
    referencesBlock: {
      marginTop: 6,
    },
    referencesText: {
      fontSize: fs.body,
      lineHeight: 1.4,
    },
  });
}

// ─── PDF Document component ──────────────────────────────────────────────────

function CvDocument({
  data,
  template,
  fs,
}: {
  data: CvPdfData;
  template: TemplateName;
  fs: FontScale;
}) {
  const config = TEMPLATE_CONFIGS[template];
  const styles = createStyles(template, fs);
  const contactParts = [data.email, data.phone, data.location].filter(Boolean);

  // Build each possible section (keys match the template order entries).
  const sections = {
    summary: data.professionalSummary ? (
      <View key="summary">
        <Text style={styles.sectionHeader}>Professional Summary</Text>
        <Text style={styles.bodyText}>{data.professionalSummary}</Text>
      </View>
    ) : null,

    skills: data.skills.length > 0 ? (
      <View key="skills">
        <Text style={styles.sectionHeader}>Skills</Text>
        <Text style={styles.skillsLine}>{data.skills.join(', ')}</Text>
      </View>
    ) : null,

    experience: data.experience.length > 0 ? (
      <View key="experience">
        <Text style={styles.sectionHeader}>Experience</Text>
        {data.experience.map((exp, i) => (
          <View key={i} style={styles.experienceBlock}>
            <Text style={styles.experienceRole}>
              {exp.role}
              {exp.company ? ` — ${exp.company}` : ''}
              {exp.duration ? ` | ${exp.duration}` : ''}
            </Text>
            {exp.bullets.map((bullet, j) => (
              <Text key={j} style={styles.bullet}>
                • {bullet}
              </Text>
            ))}
          </View>
        ))}
      </View>
    ) : null,

    projects: data.projects.length > 0 ? (
      <View key="projects">
        <Text style={styles.sectionHeader}>Projects</Text>
        {data.projects.map((proj, i) => (
          <View key={i} style={styles.projectBlock}>
            <Text style={styles.projectName}>{proj.name}</Text>
            <Text style={styles.projectDetail}>
              {[proj.description, proj.technologies].filter(Boolean).join(' | ')}
            </Text>
          </View>
        ))}
      </View>
    ) : null,

    education: data.education.length > 0 ? (
      <View key="education">
        <Text style={styles.sectionHeader}>Education</Text>
        {data.education.map((edu, i) => (
          <Text key={i} style={styles.educationLine}>
            {[edu.qualification, edu.institution, edu.year].filter(Boolean).join(', ')}
          </Text>
        ))}
      </View>
    ) : null,

    certifications: data.certifications.length > 0 ? (
      <View key="certifications">
        <Text style={styles.sectionHeader}>Certifications</Text>
        {data.certifications.map((cert, i) => (
          <Text key={i} style={styles.certLine}>
            {cert.name}
            {cert.issuer ? ` — ${cert.issuer}` : ''}
            {cert.year ? ` (${cert.year})` : ''}
          </Text>
        ))}
      </View>
    ) : null,

    references: data.references ? (
      <View key="references" style={styles.referencesBlock}>
        <Text style={styles.sectionHeader}>References</Text>
        <Text style={styles.referencesText}>{data.references}</Text>
      </View>
    ) : null,
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header block ── */}
        <View>
          <Text style={styles.name}>{data.fullName}</Text>
          {data.headline ? <Text style={styles.headline}>{data.headline}</Text> : null}
          {contactParts.length > 0 ? (
            <Text style={styles.contactLine}>{contactParts.join(' | ')}</Text>
          ) : null}
        </View>

        {/* ── Sections in the template-defined order ── */}
        {config.sectionOrder.map((key) => sections[key]).filter(Boolean)}
      </Page>
    </Document>
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a professional CV PDF as a Blob.
 *
 * @param cvData - Structured CV data (name, experience, skills, etc.)
 * @param template - Template name: `'clean-ats'`, `'modern-tech'`, or `'entry-level'`
 *                   (defaults to `'entry-level'`)
 * @returns A Promise resolving to a PDF Blob
 *
 * The PDF:
 *  - Uses A4 page size with 35 mm margins
 *  - Has **no** page numbers or "Generated by AetherLink" footer
 *  - Fits content onto a **single page** by proportionally reducing font sizes
 *    when the content would overflow
 *  - The References section is only rendered when `cvData.references` is non-empty
 */
export async function generateCvPdf(
  cvData: CvPdfData,
  template?: string,
): Promise<Blob> {
  const tmpl: TemplateName =
    template === 'clean-ats' || template === 'modern-tech' || template === 'entry-level'
      ? template
      : 'entry-level';

  const fs = computeFontScale(cvData);
  const doc = <CvDocument data={cvData} template={tmpl} fs={fs} />;
  return await pdf(doc).toBlob();
}
