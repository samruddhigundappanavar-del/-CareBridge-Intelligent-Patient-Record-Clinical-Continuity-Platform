import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Presentation,
  Printer,
  Copy,
  Check,
  ShieldAlert,
  FileText,
  Sparkles,
  Calendar,
  Database,
  Layers,
  TrendingUp,
  HeartPulse,
} from 'lucide-react';

export interface PitchDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SlideData {
  number: number;
  tag: string;
  title: string;
  subtitle: string;
  bullets: Array<{ heading: string; detail: string }>;
  metricsOrHighlight: Array<{ label: string; value: string }>;
  speakerNotes: string;
}

const PITCH_SLIDES: SlideData[] = [
  {
    number: 1,
    tag: 'SLIDE 01 · TITLE & VISION',
    title: 'CareBridge: Intelligent Patient Record & Clinical Continuity Platform',
    subtitle:
      'Bridging fragmented medical files, daily medication safety, and grounded clinical AI in one unified patient workspace.',
    bullets: [
      {
        heading: 'Unified Health Record Vault',
        detail:
          'Centralizes Prescriptions, Lab Reports, Discharge Summaries, Radiographs, and Medical Certificates.',
      },
      {
        heading: 'Proactive Clinical Safety',
        detail:
          'Real-time Drug–Allergy Contraindication Guard and 1-Click Emergency Medical ID for paramedics.',
      },
      {
        heading: 'Grounded Medical AI',
        detail:
          'Powered by Google Gemini, Search Grounding, Maps Grounding, and Cloud Firestore security.',
      },
    ],
    metricsOrHighlight: [
      { label: 'Core Modules', value: '5 Workspaces' },
      { label: 'Cloud Security', value: 'Zero-Trust Firestore' },
      { label: 'Target Impact', value: 'Zero Missed Doses & Safer Care' },
    ],
    speakerNotes:
      'Hi everyone, we are presenting CareBridge — a patient-centered clinical workspace designed to eliminate fragmented medical records, translate complex lab results into plain English, and prevent dangerous medication-allergy errors.',
  },
  {
    number: 2,
    tag: 'SLIDE 02 · THE PROBLEM',
    title: 'Why Patients Struggle With Their Own Medical Records Today',
    subtitle:
      'Healthcare data is scattered across hospital portals, paper PDFs, and complex clinical jargon.',
    bullets: [
      {
        heading: '1. Fragmented & Unreadable Medical Files',
        detail:
          'Patients receive static PDF lab panels, discharge summaries, and X-rays with confusing medical terminology and no plain-English explanation.',
      },
      {
        heading: '2. Disconnected Prescriptions & Missed Adherence',
        detail:
          'A prescription uploaded as a PDF rarely connects to a patient’s daily medicine alarm schedule or upcoming doctor follow-ups.',
      },
      {
        heading: '3. Preventable Drug–Allergy & Emergency Gaps',
        detail:
          'Patients often forget cross-reactive drug classes (like Amoxicillin conflicting with a Penicillin allergy) and lack a quick emergency handover sheet.',
      },
    ],
    metricsOrHighlight: [
      { label: 'Medication Non-Adherence', value: '~50% of Chronic Patients' },
      { label: 'Health Literacy Gap', value: '88% Struggle With Lab Jargon' },
      { label: 'Allergy Errors', value: '#1 Preventable Adverse Drug Event' },
    ],
    speakerNotes:
      'When a patient leaves the hospital or lab, they get a PDF full of numbers like LDL 94 or HbA1c 5.4%, a paper prescription, and follow-up instructions. None of these talk to each other, leading to missed doses and preventable drug-allergy mistakes.',
  },
  {
    number: 3,
    tag: 'SLIDE 03 · OUR SOLUTION',
    title: 'CareBridge: 5 Calm, Purpose-Built Clinical Workspaces',
    subtitle:
      'Designed specifically for patient clarity — eliminating visual clutter while preserving clinical precision.',
    bullets: [
      {
        heading: 'Daily Overview & Emergency Medical ID',
        detail:
          'At-a-glance vitals (BP, HR, Blood Type, SpO2), today’s medication checklist, confirmed visits, and a printable Paramedic Emergency ID.',
      },
      {
        heading: 'Medical Records Vault + Embedded PDF & Radiograph Viewer',
        detail:
          'Split-pane document inspector with native PDF streaming, DICOM-style X-ray contrast/zoom tools, and Plain-English translation.',
      },
      {
        heading: 'Care Schedule + AI Clinical Care Suite',
        detail:
          'Daily prescription adherence tracker with Drug–Allergy Safety Guard, plus multi-turn Gemini Clinical Advisor, Evidence Search, and Maps.',
      },
    ],
    metricsOrHighlight: [
      { label: 'Document Formats', value: 'PDF · PNG · JPG · Radiograph' },
      { label: 'Voice Input', value: 'Gemini Audio Dictation' },
      { label: 'Accessibility', value: 'Light & Obsidian Dark Mode' },
    ],
    speakerNotes:
      'Instead of overwhelming patients, CareBridge organizes everything into five clean workspaces: Daily Overview, Medical Records Vault, Care Schedule, Health Profile, and the AI Care Suite — complete with an eye-friendly Dark Mode.',
  },
  {
    number: 4,
    tag: 'SLIDE 04 · DEEP DIVE: DOCUMENT INSPECTOR',
    title: 'Embedded PDF/Radiograph Viewer & Plain-English Translation',
    subtitle:
      'Going beyond metadata: inspecting actual clinical content with 1-click actionability.',
    bullets: [
      {
        heading: 'Split-Pane Clinical Document & Image Canvas',
        detail:
          'Renders structured lab biomarker tables, DEA/NPI prescription sheets, native PDF streams, and interactive chest radiographs with zoom, rotate, and invert.',
      },
      {
        heading: '“What This Means in Plain English” Card',
        detail:
          'Automatically translates complex clinical findings (e.g., Lipid Panel, HbA1c, Arthroscopy Discharge) into 3 reassuring patient takeaways.',
      },
      {
        heading: '1-Click Prescription-to-Reminder Sync',
        detail:
          'Clicking “+ Add Reminder” inside a Prescription record extracts the drug name, dosage, and instructions directly into the patient’s daily schedule.',
      },
    ],
    metricsOrHighlight: [
      { label: 'PDF Engine', value: 'Native Stream + Clinical Sheet' },
      { label: 'Imaging Tools', value: 'Zoom · Rotate · Bone Invert' },
      { label: 'Voice Notes', value: 'Live Audio Transcription' },
    ],
    speakerNotes:
      'When you click any record in CareBridge, our split-pane inspector shows the actual document on the left and a Plain-English translation on the right. Even better, viewing a prescription lets you add it to your daily Medicine Reminders in one click.',
  },
  {
    number: 5,
    tag: 'SLIDE 05 · CLINICAL SAFETY INNOVATION',
    title: 'Real-Time Drug–Allergy Safety Guard & Emergency ID',
    subtitle:
      'Built-in clinical guardrails that protect patients before an adverse event occurs.',
    bullets: [
      {
        heading: 'Cross-Reactive Drug–Allergy Detection',
        detail:
          'Automatically cross-checks new medicine reminders (e.g., Amoxicillin Clavulanate) against recorded patient allergies (e.g., Penicillin).',
      },
      {
        heading: 'Hard Safety Stop With Physician Override',
        detail:
          'Flags Beta-Lactam and Sulfonamide cross-reactivity immediately and blocks saving unless physician desensitization override is confirmed.',
      },
      {
        heading: '1-Click Emergency Medical ID & Handover Sheet',
        detail:
          'High-contrast printable card displaying Blood Type (O+), Critical Allergies, Active Daily Medications, Baseline Vitals, and Emergency Contact.',
      },
    ],
    metricsOrHighlight: [
      { label: 'Allergy Check', value: 'Real-Time Cross-Reactivity' },
      { label: 'Drug Families', value: 'Penicillins · Beta-Lactams · Sulfa' },
      { label: 'Handover Format', value: '1-Click Print / PDF Ready' },
    ],
    speakerNotes:
      'Most apps are passive trackers. CareBridge actively protects the patient: if a patient with a Penicillin allergy tries to add Amoxicillin, CareBridge immediately flags the Beta-Lactam cross-reactivity and prevents accidental dosing.',
  },
  {
    number: 6,
    tag: 'SLIDE 06 · AI & GROUNDING ARCHITECTURE',
    title: 'Multi-Modal Gemini AI & Live Grounding Suite',
    subtitle:
      'Combining multi-turn clinical reasoning, voice transcription, Google Search, and Google Maps.',
    bullets: [
      {
        heading: 'Context-Aware Clinical AI Advisor',
        detail:
          'Switch between Clinical Record Guide, Lab & Biomarker Interpreter, and Medication Educator personas grounded in the patient’s uploaded records.',
      },
      {
        heading: 'Live Google Search & Google Maps Grounding',
        detail:
          'Verifies clinical reference intervals against authoritative medical sources and locates nearby 24-hour pharmacies, labs, and imaging centers.',
      },
      {
        heading: 'Hands-Free Clinical Voice Dictation',
        detail:
          'Patients can dictate symptoms, search queries, or physician notes via microphone using server-side Gemini audio transcription.',
      },
    ],
    metricsOrHighlight: [
      { label: 'Clinical AI', value: 'gemini-3.8-flash / 3.1-pro' },
      { label: 'Voice-to-Text', value: 'gemini-3.5-transcribe' },
      { label: 'Live Grounding', value: 'Google Search + Google Maps' },
    ],
    speakerNotes:
      'Our AI Care Suite combines three tools in one place: a multi-turn Clinical Advisor aware of your uploaded records, Medical Evidence Search grounded in Google Search, and a Nearby Pharmacies & Labs finder grounded in Google Maps.',
  },
  {
    number: 7,
    tag: 'SLIDE 07 · SYSTEM ARCHITECTURE & SECURITY',
    title: 'Full-Stack Architecture & Zero-Trust Cloud Firestore',
    subtitle:
      'Production-grade security rules, schema validation, and resilient server-side AI routing.',
    bullets: [
      {
        heading: 'Frontend & Full-Stack Express + Vite Server',
        detail:
          'React 19 + TypeScript + Tailwind CSS frontend paired with an Express server that proxies all @google/genai calls securely on the backend.',
      },
      {
        heading: '5-Collection Cloud Firestore Schema',
        detail:
          'Real-time listeners across /patients, /records, /medications, /appointments, and /chatMessages with automatic first-login profile seeding.',
      },
      {
        heading: 'Strict Owner-Isolated Firestore Security Rules',
        detail:
          'Enforces request.auth.uid == ownerId, field-level type/length bounds, and immutability of ownership and timestamps.',
      },
    ],
    metricsOrHighlight: [
      { label: 'Database', value: '5 Firestore Collections' },
      { label: 'Security Rules', value: 'ESLint Verified & Deployed' },
      { label: 'API Resilience', value: 'Multi-Model Free-Tier Cascade' },
    ],
    speakerNotes:
      'Under the hood, CareBridge uses React 19, TypeScript, Express, and Cloud Firestore. Every collection is protected by ESLint-verified Firestore Security Rules enforcing strict owner isolation and schema validation.',
  },
  {
    number: 8,
    tag: 'SLIDE 08 · IMPACT & FUTURE ROADMAP',
    title: 'Clinical Impact & Next-Phase Roadmap',
    subtitle:
      'Empowering patients and care teams with safer, smarter health record continuity.',
    bullets: [
      {
        heading: 'Immediate Patient Impact',
        detail:
          'Transforms scattered PDFs and prescriptions into an interactive, plain-English daily care plan with built-in allergy protection.',
      },
      {
        heading: 'Phase 2: HL7 FHIR & Wearable Vitals Sync',
        detail:
          'Direct integration with Apple Health, Google Health Connect, and hospital EHR portals via SMART on FHIR.',
      },
      {
        heading: 'Phase 3: Caregiver & Family Shared Access',
        detail:
          'Time-limited, role-based read access for family caregivers and attending specialists with full audit logging.',
      },
    ],
    metricsOrHighlight: [
      { label: 'Patient Clarity', value: '100% Plain-English Summaries' },
      { label: 'Safety Guard', value: 'Zero Allergy Blindspots' },
      { label: 'Status', value: 'Live & Ready for Demo' },
    ],
    speakerNotes:
      'CareBridge is live and ready to demo right now. Looking ahead, we plan to add SMART on FHIR hospital sync, wearable vitals streaming, and caregiver access. Thank you — let’s jump into the live demo!',
  },
];

export function buildPresentationMarkdown(): string {
  return PITCH_SLIDES.map(
    (s) =>
      `# Slide ${s.number}: ${s.title}\n**${s.subtitle}**\n\n` +
      s.bullets
        .map((b) => `- **${b.heading}**: ${b.detail}`)
        .join('\n') +
      `\n\n**Key Highlights:** ` +
      s.metricsOrHighlight.map((m) => `${m.label}: ${m.value}`).join(' | ') +
      `\n\n> **Speaker Notes:** ${s.speakerNotes}\n`
  ).join('\n---\n\n');
}

export const PitchDeckModal: React.FC<PitchDeckModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min(PITCH_SLIDES.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slide = PITCH_SLIDES[currentIndex];

  const handleCopyOutline = async () => {
    try {
      await navigator.clipboard.writeText(buildPresentationMarkdown());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const getSlideIcon = (num: number) => {
    switch (num) {
      case 1:
        return HeartPulse;
      case 2:
        return ShieldAlert;
      case 3:
        return Layers;
      case 4:
        return FileText;
      case 5:
        return Calendar;
      case 6:
        return Sparkles;
      case 7:
        return Database;
      default:
        return TrendingUp;
    }
  };

  const SlideIcon = getSlideIcon(slide.number);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pitch-deck-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Presenter Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Presentation className="w-4 h-4 text-teal-400" />
            <span id="pitch-deck-title" className="text-xs font-bold tracking-wide uppercase text-teal-400">
              CareBridge Hackathon Pitch Deck
            </span>
            <span className="text-xs text-slate-400 font-mono">
              · Slide {slide.number} of {PITCH_SLIDES.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyOutline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied All 8 Slides!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-teal-400" />
                  <span>Copy PPT Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-teal-400" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close Pitch Deck"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 16:9 Slide Canvas */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-8 bg-[#F8FAFC] flex-1">
          {/* Slide Header */}
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 font-mono">
              <SlideIcon className="w-4 h-4 text-teal-600" />
              <span>{slide.tag}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
              {slide.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
              {slide.subtitle}
            </p>
          </div>

          {/* 3 Main Slide Columns / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {slide.bullets.map((b, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200/90 p-5 space-y-2 shadow-2xs"
              >
                <span className="text-xs font-mono font-bold text-teal-600">
                  0{i + 1}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {b.heading}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {b.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Key Metrics Strip */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:divide-x divide-slate-200/80">
            {slide.metricsOrHighlight.map((m, idx) => (
              <div key={idx} className={idx > 0 ? 'sm:pl-4' : ''}>
                <span className="text-[11px] text-slate-400 uppercase tracking-wide block">
                  {m.label}
                </span>
                <span className="text-sm font-bold text-teal-700 font-mono mt-0.5 block">
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* Speaker Notes Box */}
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-teal-900 uppercase tracking-wide text-[11px] block">
              Presenter Speaker Script (What to say on this slide)
            </span>
            <p className="leading-relaxed">{slide.speakerNotes}</p>
          </div>
        </div>

        {/* Slide Navigation Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between gap-4">
          {/* Slide Dots */}
          <div className="flex items-center gap-1.5">
            {PITCH_SLIDES.map((s, idx) => (
              <button
                key={s.number}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex
                    ? 'w-7 bg-teal-600'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${s.number}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={currentIndex === PITCH_SLIDES.length - 1}
              onClick={() =>
                setCurrentIndex((prev) =>
                  Math.min(PITCH_SLIDES.length - 1, prev + 1)
                )
              }
              className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
            >
              <span>Next Slide</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
