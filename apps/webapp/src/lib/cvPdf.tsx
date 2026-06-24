import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CvPdfData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  professionalSummary: string;
  skills: string[] | { technical: string[]; soft: string[]; tools?: string[] };
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

  const skills = data.skills;
  if (Array.isArray(skills)) {
    if (skills.length > 0) n += 1 + lines(skills.join(', '));
  } else if (skills) {
    const groups = [skills.technical, skills.soft, skills.tools].filter(Boolean);
    n += 1 + groups.length; // section header + lines per group
  }

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
      n += 2; // project name + description
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
 * We budget 45 lines at full size (leaving room for margins & spacing) and
 * scale proportionally below that, down to a minimum of 75 % (7.5 pt body).
 */
function computeFontScale(data: CvPdfData): FontScale {
  const MAX_LINES = 45;
  const estimated = estimateContentLines(data);

  if (estimated <= MAX_LINES) {
    return { body: 10, name: 18, headline: 11, contact: 9, section: 11 };
  }

  const scale = Math.max(0.75, MAX_LINES / estimated);
  const r = (v: number) => Math.round(v * scale * 10) / 10;

  return { body: r(10), name: r(18), headline: r(11), contact: r(9), section: r(11) };
}

// ─── Stylesheet factory ──────────────────────────────────────────────────────

function createStyles(template: TemplateName, fs: FontScale) {
  const config = TEMPLATE_CONFIGS[template];
  const sectionMarginTop = 8;

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
      fontFamily: 'Helvetica-Bold',
      marginBottom: 6,
    },
    headline: {
      fontSize: fs.headline,
      fontFamily: 'Helvetica',
      color: config.headlineColor,
      marginBottom: 4,
    },
    contactLine: {
      fontSize: fs.contact,
      fontFamily: 'Helvetica',
      color: config.headlineColor,
      marginBottom: 10,
    },
    sectionHeader: {
      fontSize: fs.section,
      fontFamily: 'Helvetica-Bold',
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
      fontFamily: 'Helvetica',
      lineHeight: 1.4,
      marginBottom: 4,
    },
    experienceBlock: {
      marginBottom: 8,
    },
    experienceRole: {
      fontSize: fs.body,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 1,
      marginTop: 2,
    },
    bullet: {
      fontSize: fs.body,
      fontFamily: 'Helvetica',
      lineHeight: 1.4,
      paddingLeft: 12,
      marginBottom: 1,
    },
    projectBlock: {
      marginBottom: 6,
    },
    projectName: {
      fontSize: fs.body,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 0,
      marginTop: 2,
    },
    projectTechnologies: {
      fontSize: fs.body,
      fontFamily: 'Helvetica',
      lineHeight: 1.4,
      fontStyle: 'italic',
      color: '#888888',
    },
    projectDetail: {
      fontSize: fs.body,
      fontFamily: 'Helvetica',
      lineHeight: 1.4,
    },
    educationLine: {
      fontSize: fs.body,
      fontFamily: 'Helvetica',
      lineHeight: 1.4,
      marginBottom: 1,
    },
    certLine: {
      fontSize: fs.body,
      fontFamily: 'Helvetica',
      lineHeight: 1.4,
      marginBottom: 1,
    },
    skillsLine: {
      fontSize: fs.body,
      fontFamily: 'Helvetica',
      lineHeight: 1.4,
      marginBottom: 4,
    },
    referencesBlock: {
      marginTop: 6,
    },
    referencesText: {
      fontSize: fs.body,
      fontFamily: 'Helvetica',
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

  // Build contact parts array, appending social links if present
  const contactParts = [data.email, data.phone, data.location].filter(Boolean);
  if (data.linkedin) contactParts.push(data.linkedin);
  if (data.github) contactParts.push(data.github);
  if (data.portfolio) contactParts.push(data.portfolio);

  // Build a flat array of page children — avoids nested View/Text issues
  const children: React.ReactNode[] = [];

  // ── Header block ──
  children.push(
    <Text key="name" style={styles.name}>{data.fullName}</Text>,
  );
  if (data.headline) {
    children.push(
      <Text key="headline" style={styles.headline}>{data.headline}</Text>,
    );
  }
  if (contactParts.length > 0) {
    children.push(
      <Text key="contact" style={styles.contactLine}>{contactParts.join(' | ')}</Text>,
    );
  }

  // ── Section renderer helpers ──

  const addSectionHeader = (label: string) => {
    children.push(
      <Text key={`section-${label}`} style={styles.sectionHeader}>{label}</Text>,
    );
  };

  // Section order based on template
  const sectionOrder = config.sectionOrder;

  for (const sectionKey of sectionOrder) {
    switch (sectionKey) {
      case 'summary':
        if (data.professionalSummary) {
          addSectionHeader('Professional Summary');
          children.push(
            <Text key="summary-text" style={styles.bodyText}>{data.professionalSummary}</Text>,
          );
        }
        break;

      case 'skills': {
        const skills = data.skills;
        if (Array.isArray(skills)) {
          if (skills.length > 0) {
            addSectionHeader('Skills');
            children.push(
              <Text key="skills-line" style={styles.skillsLine}>{skills.join(', ')}</Text>,
            );
          }
        } else if (skills) {
          const obj = skills as { technical: string[]; soft: string[]; tools?: string[] };
          if (obj.technical?.length) {
            addSectionHeader('Skills');
            children.push(
              <Text key="skills-tech" style={styles.skillsLine}>{'Technical: ' + obj.technical.join(', ')}</Text>,
            );
          }
          if (obj.soft?.length) {
            children.push(
              <Text key="skills-soft" style={styles.skillsLine}>{'Soft Skills: ' + obj.soft.join(', ')}</Text>,
            );
          }
          if (obj.tools?.length) {
            children.push(
              <Text key="skills-tools" style={styles.skillsLine}>{'Tools: ' + obj.tools.join(', ')}</Text>,
            );
          }
        }
        break;
      }

      case 'experience':
        if (data.experience.length > 0) {
          addSectionHeader('Experience');
          data.experience.forEach((exp, i) => {
            const roleLine = [exp.role, exp.company ? `— ${exp.company}` : '', exp.duration ? `| ${exp.duration}` : ''].filter(Boolean).join(' ');
            children.push(
              <Text key={`exp-${i}`} style={styles.experienceRole}>{roleLine}</Text>,
            );
            exp.bullets.forEach((bullet, j) => {
              children.push(
                <Text key={`exp-${i}-b-${j}`} style={styles.bullet}>{'• ' + bullet}</Text>,
              );
            });
          });
        }
        break;

      case 'projects':
        if (data.projects.length > 0) {
          addSectionHeader('Projects');
          data.projects.forEach((proj, i) => {
            children.push(
              <Text key={`proj-${i}`} style={styles.projectName}>{proj.name}</Text>,
            );
            children.push(
              <Text key={`proj-${i}-desc`} style={styles.projectDetail}>{proj.description}</Text>,
            );
            if (proj.technologies) {
              children.push(
                <Text key={`proj-${i}-tech`} style={styles.projectTechnologies}>{'Technologies: ' + proj.technologies}</Text>,
              );
            }
          });
        }
        break;

      case 'education':
        if (data.education.length > 0) {
          addSectionHeader('Education');
          data.education.forEach((edu, i) => {
            const parts = [edu.qualification, edu.institution, edu.year].filter(Boolean);
            children.push(
              <Text key={`edu-${i}`} style={styles.educationLine}>{parts.join(', ')}</Text>,
            );
          });
        }
        break;

      case 'certifications':
        if (data.certifications.length > 0) {
          addSectionHeader('Certifications');
          data.certifications.forEach((cert, i) => {
            const parts = [cert.name, cert.issuer ? `— ${cert.issuer}` : '', cert.year ? `(${cert.year})` : ''].filter(Boolean);
            children.push(
              <Text key={`cert-${i}`} style={styles.certLine}>{parts.join(' ')}</Text>,
            );
          });
        }
        break;

      case 'references':
        if (data.references) {
          addSectionHeader('References');
          children.push(
            <Text key="references-text" style={styles.referencesText}>{data.references}</Text>,
          );
        }
        break;
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {children}
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
