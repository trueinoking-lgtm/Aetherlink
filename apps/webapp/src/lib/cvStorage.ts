import type { CvDraft } from '@aetherlink/core';
import { get, set } from 'idb-keyval';

const CV_DRAFT_KEY = 'cv_draft';

export const emptyCvDraft = (): CvDraft => ({
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  skills: [],
  certifications: [],
  experience: [{ role: '', company: '', duration: '', bullets: [''] }],
  education: [{ institution: '', qualification: '', year: '' }],
});

export async function loadCvDraft(): Promise<CvDraft | null> {
  return (await get<CvDraft>(CV_DRAFT_KEY)) ?? null;
}

export async function saveCvDraft(draft: CvDraft): Promise<void> {
  await set(CV_DRAFT_KEY, draft);
}
