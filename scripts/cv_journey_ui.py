#!/usr/bin/env python3
"""
CV Journey — Phases 2-7: Rewrite /cv into agent-led chat interface.
This script creates the full new /cv page with:
- Staged interview flow (intro → personal → goal → education → experience → skills → projects → certifications → achievements → references → review → generate)
- Chat-style UI
- Progress indicator
- Skip/Edit/Save/Continue
- CV strength score
- ATS-friendly CV generation
- PDF export via window.print()
- Tailor to job CTA on /feed/[id]
"""
import os

# ─── NEW /cv PAGE ───
cv_page = r''''use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────

type CvStage =
  | 'intro'
  | 'personal_details'
  | 'career_goal'
  | 'education'
  | 'experience_discovery'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'achievements'
  | 'references'
  | 'review'
  | 'generate_cv';

interface CvMessage {
  role: 'agent' | 'user' | 'system';
  content: string;
  stage: CvStage;
  timestamp: string;
}

interface PersonalDetails {
  fullName: string;
  phone: string;
  email: string;
  location: string;
}

interface EducationEntry {
  institution: string;
  qualification: string;
  year: string;
}

interface ExperienceEntry {
  role: string;
  company: string;
  duration: string;
  description: string;
}

interface ProjectEntry {
  name: string;
  description: string;
  technologies: string;
}

interface CertificationEntry {
  name: string;
  issuer: string;
  year: string;
}

interface CvData {
  personalDetails: PersonalDetails;
  careerGoal: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  achievements: string[];
  references: string;
  professionalSummary: string;
}

const EMPTY_CV: CvData = {
  personalDetails: { fullName: '', phone: '', email: '', location: '' },
  careerGoal: '',
  education: [],
  experience: [],
  skills: [],
  projects: [],
  certifications: [],
  achievements: [],
  references: '',
  professionalSummary: '',
};

const STAGES: Array<{ key: CvStage; label: string; question: string }> = [
  { key: 'intro', label: 'Welcome', question: 'Hi! I\'m your CV assistant. I\'ll help you build a professional CV step by step. What kind of job are you trying to get?' },
  { key: 'personal_details', label: 'About You', question: 'Let\'s start with your details. What\'s your full name? (e.g., John Doe)' },
  { key: 'career_goal', label: 'Goal', question: 'What kind of role are you looking for? (e.g., Software Developer, Sales Assistant, Teacher)' },
  { key: 'education', label: 'Education', question: 'Have you completed any education? (school, college, university, training courses). If none, that\'s fine — type "skip".' },
  { key: 'experience_discovery', label: 'Experience', question: 'Have you worked before — even informally? This includes: helping with sales, admin work, computer troubleshooting, teaching classmates, family business, church activities, community work, or any paid/volunteer work. What have you done?' },
  { key: 'skills', label: 'Skills', question: 'What skills or tools do you have? (e.g., Microsoft Office, Excel, Python, driving, communication, teamwork, problem-solving). List as many as you can think of.' },
  { key: 'projects', label: 'Projects', question: 'Have you completed any projects? (e.g., built a website, repaired computers, completed assignments, organized an event, created something). If none, type "skip".' },
  { key: 'certifications', label: 'Certificates', question: 'Do you have any certificates, licenses, short courses, or training completion proof? (e.g., driver\'s license, IT certificate, first aid, online course). If none, type "skip".' },
  { key: 'achievements', label: 'Achievements', question: 'What achievement are you proud of, even if it seems small? (e.g., "helped 10 classmates pass", "increased sales by 20%", "organized a community cleanup"). If none yet, type "skip".' },
  { key: 'references', label: 'References', question: 'Would you like to add a references line? (e.g., "Available on request" or a specific referee). Type "skip" if you prefer "Available on request".' },
  { key: 'review', label: 'Review', question: 'Great! Let\'s review what you\'ve told me. You can edit any section or continue to generate your CV.' },
];

// ─── Strength Score ──────────────────────────────────────

function computeStrengthScore(data: CvData): { score: number; missing: string[] } {
  let score = 0;
  const missing: string[] = [];

  if (data.personalDetails.fullName.trim().length > 2) score += 15;
  else missing.push('Add your full name');

  if (data.personalDetails.location.trim()) score += 5;
  else missing.push('Add your location');

  if (data.careerGoal.trim()) score += 10;
  else missing.push('Add a career goal');

  if (data.education.length > 0) score += 15;
  else missing.push('Add education details');

  if (data.skills.length >= 3) score += 15;
  else if (data.skills.length > 0) { score += 10; missing.push('Add more skills (aim for 3+)'); }
  else missing.push('Add at least 3 skills');

  if (data.experience.length > 0 || data.projects.length > 0) score += 20;
  else missing.push('Add practical experience or a project');

  if (data.certifications.length > 0) score += 10;
  else missing.push('Add certifications if available');

  if (data.achievements.length > 0) score += 5;
  else missing.push('Add an achievement');

  if (data.references.trim() || data.references === 'Available on request') score += 5;
  else missing.push('Add a references statement');

  if (data.professionalSummary.trim()) score += 5;
  else missing.push('Add a professional summary');

  return { score: Math.min(100, score), missing };
}

// ─── ATS CV Generator ────────────────────────────────────

function generateCvMarkdown(data: CvData): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${data.personalDetails.fullName || 'Your Name'}`);
  const contactParts: string[] = [];
  if (data.personalDetails.phone) contactParts.push(data.personalDetails.phone);
  if (data.personalDetails.email) contactParts.push(data.personalDetails.email);
  if (data.personalDetails.location) contactParts.push(data.personalDetails.location);
  if (contactParts.length > 0) lines.push(contactParts.join(' | '));
  lines.push('');

  // Professional Summary
  if (data.professionalSummary.trim()) {
    lines.push('## Professional Summary');
    lines.push(data.professionalSummary.trim());
    lines.push('');
  }

  // Key Skills
  if (data.skills.length > 0) {
    lines.push('## Key Skills');
    lines.push(data.skills.map(s => `• ${s}`).join('\n'));
    lines.push('');
  }

  // Practical Experience / Work Experience
  if (data.experience.length > 0) {
    lines.push('## Practical Experience');
    for (const exp of data.experience) {
      lines.push(`**${exp.role}** — ${exp.company}${exp.duration ? ` (${exp.duration})` : ''}`);
      if (exp.description) lines.push(`  ${exp.description}`);
    }
    lines.push('');
  }

  // Projects
  if (data.projects.length > 0) {
    lines.push('## Projects');
    for (const proj of data.projects) {
      lines.push(`**${proj.name}**`);
      if (proj.description) lines.push(`  ${proj.description}`);
      if (proj.technologies) lines.push(`  Tools: ${proj.technologies}`);
    }
    lines.push('');
  }

  // Education
  if (data.education.length > 0) {
    lines.push('## Education');
    for (const edu of data.education) {
      lines.push(`• **${edu.qualification}** — ${edu.institution}${edu.year ? ` (${edu.year})` : ''}`);
    }
    lines.push('');
  }

  // Certifications
  if (data.certifications.length > 0) {
    lines.push('## Certifications');
    for (const cert of data.certifications) {
      lines.push(`• ${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ''}${cert.year ? ` (${cert.year})` : ''}`);
    }
    lines.push('');
  }

  // Achievements
  if (data.achievements.length > 0) {
    lines.push('## Achievements');
    for (const a of data.achievements) {
      lines.push(`• ${a}`);
    }
    lines.push('');
  }

  // References
  lines.push('## References');
  lines.push(data.references.trim() || 'Available on request');

  return lines.join('\n');
}

function generateCvHtml(markdown: string, fullName: string): string {
  // Convert markdown to clean HTML for PDF
  let html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/• /g, '<li>')
    .replace(/<li>/g, '</li><li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/<\/li><li>/g, '')
    .replace(/<\/ul>\n<ul>/g, '')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>AetherLink CV — ${fullName}</title>
<style>
@page { size: A4; margin: 2cm; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; }
h1 { font-size: 22pt; margin: 0 0 8px 0; color: #1a1a1a; }
h2 { font-size: 13pt; border-bottom: 2px solid #6366f1; padding-bottom: 4px; margin-top: 24px; color: #333; }
ul { padding-left: 20px; }
li { margin-bottom: 4px; }
strong { color: #1a1a1a; }
blockquote { border-left: 3px solid #6366f1; padding-left: 16px; color: #555; margin: 16px 0; }
ol { padding-left: 20px; }
</style>
</head><body>${html}
<p style="margin-top:40px;font-size:9pt;color:#999;border-top:1px solid #eee;padding-top:12px;">
Generated by AetherLink — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
</p>
</body></html>`;
}

// ─── Parse user response into structured data ────────────

function parseStageResponse(stage: CvStage, input: string, currentData: CvData): CvData {
  const trimmed = input.trim();
  const data = JSON.parse(JSON.stringify(currentData)) as CvData;

  switch (stage) {
    case 'intro':
    case 'career_goal':
      data.careerGoal = trimmed;
      break;

    case 'personal_details': {
      // Try to extract name from input
      const nameMatch = trimmed.match(/(?:my name is|i am|i'm|call me)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (nameMatch) data.personalDetails.fullName = nameMatch[1].trim();
      // Check for phone
      const phoneMatch = trimmed.match(/(\+?263|0)[\s-]?\d{2,3}[\s-]?\d{3,4}[\s-]?\d{3,4}/);
      if (phoneMatch) data.personalDetails.phone = phoneMatch[0].trim();
      // Check for email
      const emailMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
      if (emailMatch) data.personalDetails.email = emailMatch[0];
      // Check for location
      const locationMatch = trimmed.match(/(?:in|from|based in|located in|i'm in|i am in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (locationMatch) data.personalDetails.location = locationMatch[1];
      // If no pattern match, assume the whole input is the name
      if (!nameMatch && !phoneMatch && !emailMatch && !locationMatch && trimmed.length > 0) {
        data.personalDetails.fullName = trimmed.split(/[\n,]/)[0].trim();
      }
      break;
    }

    case 'education': {
      if (trimmed.toLowerCase() === 'skip' || trimmed.toLowerCase() === 'none' || trimmed === '') break;
      // Parse lines of education
      const lines = trimmed.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const parts = line.split(/[,|—\-–]/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 1) {
          data.education.push({
            institution: parts[1] || '',
            qualification: parts[0] || line.trim(),
            year: parts[2] || '',
          });
        }
      }
      break;
    }

    case 'experience_discovery': {
      if (trimmed.toLowerCase() === 'skip' || trimmed.toLowerCase() === 'none' || trimmed === '') break;
      const lines = trimmed.split('\n').filter(l => l.trim());
      for (const line of lines) {
        // Try to parse: "Role at Company (duration): description"
        const match = line.match(/^(.+?)(?:\s+(?:at|@)\s+(.+?))?(?:\s*\((.+?)\))?(?:\s*:\s*(.+))?$/i);
        if (match) {
          data.experience.push({
            role: match[1]?.trim() || line.trim(),
            company: match[2]?.trim() || '',
            duration: match[3]?.trim() || '',
            description: match[4]?.trim() || '',
          });
        } else {
          data.experience.push({ role: line.trim(), company: '', duration: '', description: '' });
        }
      }
      break;
    }

    case 'skills': {
      const skills = trimmed.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      data.skills = [...new Set([...data.skills, ...skills])];
      break;
    }

    case 'projects': {
      if (trimmed.toLowerCase() === 'skip' || trimmed.toLowerCase() === 'none' || trimmed === '') break;
      const lines = trimmed.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const parts = line.split(/[:—\-–]/).map(p => p.trim());
        data.projects.push({
          name: parts[0] || line.trim(),
          description: parts[1] || '',
          technologies: parts[2] || '',
        });
      }
      break;
    }

    case 'certifications': {
      if (trimmed.toLowerCase() === 'skip' || trimmed.toLowerCase() === 'none' || trimmed === '') break;
      const lines = trimmed.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const parts = line.split(/[,—\-–]/).map(p => p.trim()).filter(Boolean);
        data.certifications.push({
          name: parts[0] || line.trim(),
          issuer: parts[1] || '',
          year: parts[2] || '',
        });
      }
      break;
    }

    case 'achievements': {
      if (trimmed.toLowerCase() === 'skip' || trimmed.toLowerCase() === 'none' || trimmed === '') break;
      const items = trimmed.split('\n').filter(l => l.trim());
      data.achievements = [...data.achievements, ...items];
      break;
    }

    case 'references': {
      data.references = trimmed.toLowerCase() === 'skip' || trimmed.toLowerCase() === 'none'
        ? 'Available on request'
        : trimmed;
      break;
    }

    case 'review':
      // No parsing needed — user reviews and edits
      break;

    default:
      break;
  }

  return data;
}

// ─── Main Page Component ──────────────────────────────────

export default function CVJourneyPage() {
  const supabase = createClient();
  const router = useRouter();
  const [stage, setStage] = useState<CvStage>('intro');
  const [messages, setMessages] = useState<CvMessage[]>([]);
  const [input, setInput] = useState('');
  const [cvData, setCvData] = useState<CvData>(EMPTY_CV);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatedMarkdown, setGeneratedMarkdown] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const stageIndex = STAGES.findIndex(s => s.key === stage);
  const { score, missing } = computeStrengthScore(cvData);

  // Load existing data
  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/'); return; }

        // Load from localStorage first (instant)
        const local = localStorage.getItem('aetherlink_cv_data');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setCvData({ ...EMPTY_CV, ...parsed });
          } catch { /* ignore */ }
        }

        // Load from Supabase cv_profiles (best-effort)
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cv_profiles?user_id=eq.${user.id}&select=*`,
            { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } }
          );
          if (res.ok) {
            const profiles = await res.json();
            if (profiles && profiles.length > 0) {
              const p = profiles[0];
              const supabaseData: CvData = {
                personalDetails: p.personal_details || EMPTY_CV.personalDetails,
                careerGoal: p.career_goal || '',
                education: p.education || [],
                experience: p.experience || [],
                skills: Array.isArray(p.skills) ? p.skills : (p.skills?.technical || []),
                projects: p.projects || [],
                certifications: p.certifications || [],
                achievements: p.achievements || [],
                references: p.references_text || '',
                professionalSummary: p.professional_summary || '',
              };
              // Use Supabase data if it has more content
              const supStr = JSON.stringify(supabaseData).length;
              const localStr = JSON.stringify(cvData).length;
              if (supStr > localStr) {
                setCvData(supabaseData);
              }
            }
          }
        } catch { /* table may not exist yet */ }

        // Load conversation from localStorage
        const conv = localStorage.getItem('aetherlink_cv_conversation');
        if (conv) {
          try {
            const parsed = JSON.parse(conv);
            if (parsed.messages && parsed.messages.length > 0) {
              setMessages(parsed.messages);
              if (parsed.currentStage) setStage(parsed.currentStage as CvStage);
            }
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.error('CV load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-save conversation
  useEffect(() => {
    if (!loading && messages.length > 0) {
      localStorage.setItem('aetherlink_cv_conversation', JSON.stringify({
        messages,
        currentStage: stage,
      }));
    }
  }, [messages, stage, loading]);

  // Auto-save CV data
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('aetherlink_cv_data', JSON.stringify(cvData));
    }
  }, [cvData, loading]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() && stage !== 'review') return;

    const userMsg: CvMessage = {
      role: 'user',
      content: input.trim(),
      stage,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    // Parse response into structured data
    const newData = parseStageResponse(stage, input.trim(), cvData);
    setCvData(newData);

    // Determine next stage
    const nextStageIndex = stageIndex + 1;
    if (nextStageIndex < STAGES.length) {
      const nextStage = STAGES[nextStageIndex];
      const agentMsg: CvMessage = {
        role: 'agent',
        content: nextStage.question,
        stage: nextStage.key,
        timestamp: new Date().toISOString(),
      };

      // Generate summary message for review stage
      if (nextStage.key === 'review') {
        const summaryParts: string[] = [];
        if (newData.personalDetails.fullName) summaryParts.push(`Name: ${newData.personalDetails.fullName}`);
        if (newData.careerGoal) summaryParts.push(`Goal: ${newData.careerGoal}`);
        if (newData.skills.length > 0) summaryParts.push(`Skills: ${newData.skills.join(', ')}`);
        if (newData.experience.length > 0) summaryParts.push(`Experience: ${newData.experience.length} entr(y/ies)`);
        if (newData.education.length > 0) summaryParts.push(`Education: ${newData.education.length} entr(y/ies)`);

        const summary: CvMessage = {
          role: 'agent',
          content: `Here's what I've collected:\n\n${summaryParts.map(p => `• ${p}`).join('\n')}\n\nYou can edit any section below, or click "Generate CV" when you're ready.`,
          stage: 'review',
          timestamp: new Date().toISOString(),
        };
        setMessages([...newMessages, summary, agentMsg]);
      } else {
        setMessages([...newMessages, agentMsg]);
      }

      setStage(nextStage.key);
    }
  }, [input, messages, stage, stageIndex, cvData]);

  const handleSkip = useCallback(() => {
    const nextStageIndex = stageIndex + 1;
    if (nextStageIndex < STAGES.length) {
      const nextStage = STAGES[nextStageIndex];
      const agentMsg: CvMessage = {
        role: 'agent',
        content: nextStage.question,
        stage: nextStage.key,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, agentMsg]);
      setStage(nextStage.key);
    }
  }, [stageIndex]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cv_profiles`;
        await fetch(url, {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal,resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id: user.id,
            full_name: cvData.personalDetails.fullName,
            phone: cvData.personalDetails.phone,
            email: cvData.personalDetails.email,
            location: cvData.personalDetails.location,
            career_goal: cvData.careerGoal,
            professional_summary: cvData.professionalSummary,
            skills: cvData.skills,
            education: cvData.education,
            experience: cvData.experience,
            projects: cvData.projects,
            certifications: cvData.certifications,
            references_text: cvData.references,
            cv_strength_score: score,
          }),
        });
      }
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  }, [cvData, score]);

  const handleGenerateCv = useCallback(() => {
    const md = generateCvMarkdown(cvData);
    setGeneratedMarkdown(md);
    setStage('generate_cv');
  }, [cvData]);

  const handleDownloadPdf = useCallback(() => {
    const html = generateCvHtml(generatedMarkdown, cvData.personalDetails.fullName);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }, [generatedMarkdown, cvData.personalDetails.fullName]);

  const handleEditSection = useCallback((section: string) => {
    setEditingSection(section);
    // Pre-fill input with current data
    switch (section) {
      case 'personal':
        setInput(`${cvData.personalDetails.fullName}`);
        break;
      case 'goal':
        setInput(cvData.careerGoal);
        break;
      case 'skills':
        setInput(cvData.skills.join(', '));
        break;
      case 'experience':
        setInput(cvData.experience.map(e => `${e.role} at ${e.company} (${e.duration}): ${e.description}`).join('\n'));
        break;
      case 'education':
        setInput(cvData.education.map(e => `${e.qualification} — ${e.institution} ${e.year}`).join('\n'));
        break;
      case 'projects':
        setInput(cvData.projects.map(p => `${p.name}: ${p.description}`).join('\n'));
        break;
      case 'certifications':
        setInput(cvData.certifications.map(c => `${c.name} — ${c.issuer} ${c.year}`).join('\n'));
        break;
      case 'achievements':
        setInput(cvData.achievements.join('\n'));
        break;
      case 'references':
        setInput(cvData.references);
        break;
    }
  }, [cvData]);

  const handleSaveEdit = useCallback(() => {
    if (!editingSection) return;
    const trimmed = input.trim();
    const newData = JSON.parse(JSON.stringify(cvData)) as CvData;

    switch (editingSection) {
      case 'personal':
        newData.personalDetails.fullName = trimmed;
        break;
      case 'goal':
        newData.careerGoal = trimmed;
        break;
      case 'skills':
        newData.skills = trimmed.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
        break;
      case 'experience': {
        const lines = trimmed.split('\n').filter(l => l.trim());
        newData.experience = lines.map(line => {
          const match = line.match(/^(.+?)(?:\s+(?:at|@)\s+(.+?))?(?:\s*\((.+?)\))?(?:\s*:\s*(.+))?$/i);
          return {
            role: match?.[1]?.trim() || line.trim(),
            company: match?.[2]?.trim() || '',
            duration: match?.[3]?.trim() || '',
            description: match?.[4]?.trim() || '',
          };
        });
        break;
      }
      case 'education': {
        const lines = trimmed.split('\n').filter(l => l.trim());
        newData.education = lines.map(line => {
          const parts = line.split(/[,|—\-–]/).map(p => p.trim()).filter(Boolean);
          return { qualification: parts[0] || line.trim(), institution: parts[1] || '', year: parts[2] || '' };
        });
        break;
      }
      case 'projects': {
        const lines = trimmed.split('\n').filter(l => l.trim());
        newData.projects = lines.map(line => {
          const parts = line.split(/[:—\-–]/).map(p => p.trim());
          return { name: parts[0] || line.trim(), description: parts[1] || '', technologies: parts[2] || '' };
        });
        break;
      }
      case 'certifications': {
        const lines = trimmed.split('\n').filter(l => l.trim());
        newData.certifications = lines.map(line => {
          const parts = line.split(/[,—\-–]/).map(p => p.trim()).filter(Boolean);
          return { name: parts[0] || line.trim(), issuer: parts[1] || '', year: parts[2] || '' };
        });
        break;
      }
      case 'achievements':
        newData.achievements = trimmed.split('\n').filter(l => l.trim());
        break;
      case 'references':
        newData.references = trimmed || 'Available on request';
        break;
    }

    setCvData(newData);
    setEditingSection(null);
    setInput('');
  }, [editingSection, input, cvData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading your CV journey…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-base)]/80 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h1 className="font-display text-lg font-bold text-[var(--text-primary)]">CV Journey</h1>
          <p className="text-xs text-[var(--text-muted)]">
            {stage === 'generate_cv' ? 'CV Generated' : `Step ${stageIndex + 1} of ${STAGES.length}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Strength score badge */}
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            score >= 70 ? 'bg-[var(--success)]/15 text-[var(--success)]' :
            score >= 40 ? 'bg-[var(--warning)]/15 text-[var(--warning)]' :
            'bg-[var(--danger)]/15 text-[var(--danger)]'
          }`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            {score}/100
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="premium-btn premium-btn-secondary text-xs pointer-active"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10 mb-4">
                  <svg className="h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>
                <p className="font-display text-lg font-bold text-[var(--text-primary)]">Let's build your CV together</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
                  I'll ask you a few questions about your background. Answer in your own words — I'll organize everything into a professional CV.
                </p>
                <button
                  onClick={() => {
                    const firstMsg: CvMessage = {
                      role: 'agent',
                      content: STAGES[0].question,
                      stage: 'intro',
                      timestamp: new Date().toISOString(),
                    };
                    setMessages([firstMsg]);
                  }}
                  className="mt-6 premium-btn premium-btn-primary pointer-active"
                >
                  Start My CV →
                </button>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--text-primary)]'
                }`}>
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          {stage !== 'review' && stage !== 'generate_cv' && messages.length > 0 && (
            <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-base)]/80 backdrop-blur-md">
              {editingSection ? (
                <div className="space-y-2">
                  <textarea
                    className="premium-input min-h-[80px] resize-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter your answer..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="premium-btn premium-btn-primary text-sm pointer-active">
                      Save Changes
                    </button>
                    <button onClick={() => { setEditingSection(null); setInput(''); }} className="premium-btn premium-btn-ghost text-sm pointer-active">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <textarea
                    className="premium-input flex-1 min-h-[44px] max-h-[120px] resize-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your answer..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                  />
                  <button onClick={handleSend} className="premium-btn premium-btn-primary self-end h-11 w-11 flex items-center justify-center pointer-active">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={handleSkip} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                  Skip this question →
                </button>
              </div>
            </div>
          )}

          {/* Review / Generate buttons */}
          {stage === 'review' && (
            <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-base)]/80 backdrop-blur-md space-y-3">
              {/* Missing items */}
              {missing.length > 0 && (
                <div className="glass-card p-3">
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">📋 To improve your score:</p>
                  <ul className="space-y-1">
                    {missing.slice(0, 4).map((m, i) => (
                      <li key={i} className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={handleGenerateCv} className="w-full premium-btn premium-btn-primary py-3 pointer-active">
                ✨ Generate My CV
              </button>
            </div>
          )}

          {/* Generated CV view */}
          {stage === 'generate_cv' && (
            <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-base)]/80 backdrop-blur-md space-y-2">
              <div className="flex gap-2">
                <button onClick={handleDownloadPdf} className="flex-1 premium-btn premium-btn-primary py-3 pointer-active">
                  📄 Download PDF
                </button>
                <button onClick={handleSave} className="premium-btn premium-btn-secondary py-3 pointer-active">
                  Save to Profile
                </button>
              </div>
              <button onClick={() => setStage('review')} className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                ← Back to edit
              </button>
            </div>
          )}
        </div>

        {/* Sidebar — Profile summary */}
        <div className="hidden lg:block w-72 border-l border-[var(--border)] overflow-y-auto p-4 space-y-3 bg-[var(--bg-surface)]">
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">Your Profile</h3>

          {/* Strength score */}
          <div className="glass-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">CV Strength</span>
              <span className={`text-sm font-bold ${score >= 70 ? 'text-[var(--success)]' : score >= 40 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>
                {score}/100
              </span>
            </div>
            <div className="score-bar h-2 rounded-full overflow-hidden">
              <div className={`score-bar-fill ${score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low'}`} style={{ '--score-width': `${score}%` } as React.CSSProperties} />
            </div>
          </div>

          {/* Profile sections */}
          {cvData.personalDetails.fullName && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Name</span>
                <button onClick={() => handleEditSection('personal')} className="text-xs text-[var(--accent)]">Edit</button>
              </div>
              <p className="text-sm text-[var(--text-primary)] mt-1">{cvData.personalDetails.fullName}</p>
            </div>
          )}

          {cvData.careerGoal && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Career Goal</span>
                <button onClick={() => handleEditSection('goal')} className="text-xs text-[var(--accent)]">Edit</button>
              </div>
              <p className="text-sm text-[var(--text-primary)] mt-1">{cvData.careerGoal}</p>
            </div>
          )}

          {cvData.skills.length > 0 && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Skills ({cvData.skills.length})</span>
                <button onClick={() => handleEditSection('skills')} className="text-xs text-[var(--accent)]">Edit</button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {cvData.skills.slice(0, 8).map((s, i) => (
                  <span key={i} className="skill-tag">{s}</span>
                ))}
                {cvData.skills.length > 8 && <span className="text-xs text-[var(--text-muted)]">+{cvData.skills.length - 8} more</span>}
              </div>
            </div>
          )}

          {cvData.experience.length > 0 && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Experience ({cvData.experience.length})</span>
                <button onClick={() => handleEditSection('experience')} className="text-xs text-[var(--accent)]">Edit</button>
              </div>
              {cvData.experience.slice(0, 2).map((e, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">{e.role}{e.company ? ` at ${e.company}` : ''}</p>
              ))}
            </div>
          )}

          {cvData.education.length > 0 && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Education ({cvData.education.length})</span>
                <button onClick={() => handleEditSection('education')} className="text-xs text-[var(--accent)]">Edit</button>
              </div>
              {cvData.education.slice(0, 2).map((e, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">{e.qualification}</p>
              ))}
            </div>
          )}

          {cvData.projects.length > 0 && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Projects ({cvData.projects.length})</span>
                <button onClick={() => handleEditSection('projects')} className="text-xs text-[var(--accent)]">Edit</button>
              </div>
              {cvData.projects.slice(0, 2).map((p, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">{p.name}</p>
              ))}
            </div>
          )}

          {cvData.certifications.length > 0 && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Certifications ({cvData.certifications.length})</span>
                <button onClick={() => handleEditSection('certifications')} className="text-xs text-[var(--accent)]">Edit</button>
              </div>
              {cvData.certifications.slice(0, 2).map((c, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">{c.name}</p>
              ))}
            </div>
          )}

          {cvData.achievements.length > 0 && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Achievements ({cvData.achievements.length})</span>
                <button onClick={() => handleEditSection('achievements')} className="text-xs text-[var(--accent)]">Edit</button>
              </div>
              {cvData.achievements.slice(0, 2).map((a, i) => (
                <p key={i} className="text-xs text-[var(--text-primary)] mt-1">• {a}</p>
              ))}
            </div>
          )}

          {/* Generated CV preview */}
          {generatedMarkdown && (
            <div className="glass-card p-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Generated CV</span>
              <pre className="mt-2 text-[0.625rem] text-[var(--text-muted)] whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                {generatedMarkdown.slice(0, 500)}...
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'''

# Write the new /cv page
cv_path = "/root/Aetherlink/apps/webapp/src/app/(dashboard)/cv/page.tsx"
with open(cv_path, "w") as f:
    f.write(cv_page)

print(f"✅ /cv page rewritten: {cv_path}")
