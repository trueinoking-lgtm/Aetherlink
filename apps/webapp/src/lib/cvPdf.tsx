import type { CvDraft } from '@aetherlink/core';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11 },
  name: { fontSize: 18, marginBottom: 4 },
  headline: { fontSize: 12, marginBottom: 12, color: '#333' },
  section: { marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: 'bold' },
  bullet: { marginLeft: 8, marginBottom: 2 },
});

type Rewrite = { original: string; rewritten: string; accepted?: boolean };

function resolveBullets(cv: CvDraft, rewrites: Rewrite[]): string[] {
  const bullets = cv.experience.flatMap((e) => e.bullets).filter(Boolean);
  if (!rewrites.length) return bullets;
  return bullets.map((b) => {
    const hit = rewrites.find((r) => r.original === b && r.accepted !== false);
    return hit?.rewritten ?? b;
  });
}

export async function buildCvPdfBase64(cv: CvDraft, rewrites: Rewrite[] = []): Promise<string> {
  const bullets = resolveBullets(cv, rewrites);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{cv.fullName}</Text>
        <Text style={styles.headline}>{cv.headline}</Text>
        <Text>
          {cv.email} · {cv.phone}
        </Text>
        <Text style={styles.section}>Skills</Text>
        <Text>{cv.skills.join(', ')}</Text>
        {cv.certifications.length > 0 && (
          <>
            <Text style={styles.section}>Certifications</Text>
            <Text>{cv.certifications.join(', ')}</Text>
          </>
        )}
        <Text style={styles.section}>Experience</Text>
        {cv.experience.map((exp, i) => (
          <View key={i}>
            <Text>
              {exp.role} — {exp.company} ({exp.duration})
            </Text>
            {bullets.map((b, j) => (
              <Text key={j} style={styles.bullet}>
                • {b}
              </Text>
            ))}
          </View>
        ))}
        {cv.education.length > 0 && (
          <>
            <Text style={styles.section}>Education</Text>
            {cv.education.map((ed, i) => (
              <Text key={i}>
                {ed.qualification}, {ed.institution} ({ed.year})
              </Text>
            ))}
          </>
        )}
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
