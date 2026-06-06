'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CvDraft } from '@aetherlink/core';
import { PDFViewer } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { emptyCvDraft, loadCvDraft, saveCvDraft } from '@/lib/cvStorage';

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11 },
  name: { fontSize: 18, marginBottom: 4 },
});

function CvPreviewDoc({ cv }: { cv: CvDraft }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.name}>{cv.fullName || 'Your Name'}</Text>
        <Text>{cv.headline}</Text>
        <Text>{cv.skills.join(', ')}</Text>
      </Page>
    </Document>
  );
}

const ZW_SKILLS = [
  'Accounting',
  'Excel',
  'QuickBooks',
  'CCNA',
  'Python',
  'Customer Service',
  'Sales',
  'SAP',
  'HR',
  'Marketing',
];

export default function CvBuilderPage() {
  const [cv, setCv] = useState<CvDraft>(emptyCvDraft());
  const [skillInput, setSkillInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    void loadCvDraft().then((d) => {
      if (d) setCv(d);
    });
  }, []);

  const persist = (next: CvDraft) => {
    setCv(next);
    void saveCvDraft(next);
  };

  const addSkill = (s: string) => {
    const t = s.trim();
    if (!t || cv.skills.includes(t)) return;
    persist({ ...cv, skills: [...cv.skills, t] });
    setSkillInput('');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <Link href="/feed" className="text-sm text-[var(--accent)]">
          ← Feed
        </Link>
        <h1 className="font-display mt-2 text-xl font-bold">CV Builder</h1>
      </header>
      <div className="mx-auto grid max-w-5xl gap-6 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-surface)] p-2"
            placeholder="Full name"
            value={cv.fullName}
            onChange={(e) => persist({ ...cv, fullName: e.target.value })}
          />
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-surface)] p-2"
            placeholder="Headline"
            value={cv.headline}
            onChange={(e) => persist({ ...cv, headline: e.target.value })}
          />
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-surface)] p-2"
            placeholder="Email"
            value={cv.email}
            onChange={(e) => persist({ ...cv, email: e.target.value })}
          />
          <div>
            <label className="text-sm text-[var(--text-secondary)]">Skills</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {cv.skills.map((s) => (
                <span
                  key={s}
                  className="rounded bg-[var(--bg-raised)] px-2 py-1 text-xs"
                >
                  {s}
                  <button
                    type="button"
                    className="ml-1"
                    onClick={() => persist({ ...cv, skills: cv.skills.filter((x) => x !== s) })}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--bg-surface)] p-2"
              value={skillInput}
              list="zw-skills"
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSkill(skillInput)}
            />
            <datalist id="zw-skills">
              {ZW_SKILLS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            className="text-sm text-[var(--accent)] lg:hidden"
            onClick={() => setShowPreview((p) => !p)}
          >
            {showPreview ? 'Hide' : 'Show'} PDF preview
          </button>
        </div>
        {(showPreview || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
          <div className="hidden h-[70vh] overflow-hidden rounded border border-[var(--border)] lg:block">
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              <CvPreviewDoc cv={cv} />
            </PDFViewer>
          </div>
        )}
      </div>
    </div>
  );
}
