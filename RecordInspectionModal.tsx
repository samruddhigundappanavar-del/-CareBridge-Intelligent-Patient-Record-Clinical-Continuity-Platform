import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Save,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Contrast,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Printer,
  Eye,
  Pill,
  Sparkles,
} from 'lucide-react';
import {
  MedicalRecord,
  PatientProfileData,
  MedicationReminder,
} from '../types/records';
import { AudioRecorderButton } from './AudioRecorderButton';

export interface RecordInspectionModalProps {
  record: MedicalRecord | null;
  patientProfile: PatientProfileData;
  onClose: () => void;
  onSaveNotes: (recordId: string, notes: string, status?: 'Verified' | 'Ready for Review') => Promise<void>;
  onCreateReminderFromRecord?: (med: Omit<MedicationReminder, 'id' | 'ownerId'>) => Promise<void>;
}

/**
 * Generates a valid, self-contained single-page PDF binary Blob for any MedicalRecord
 * so that native browser PDF rendering (<iframe>) and PDF file downloads work for all PDF records.
 */
function buildNativePdfBlob(
  record: MedicalRecord,
  patient: PatientProfileData,
  notes: string
): Blob {
  const clean = (str: string) =>
    str.replace(/[()\\]/g, '').replace(/[^\x20-\x7E]/g, ' ');

  const lines: string[] = [
    `CAREBRIDGE CLINICAL DOCUMENT ARCHIVE`,
    `Reference ID: ${clean(record.referenceId)}   |   Status: ${clean(record.status)}`,
    `------------------------------------------------------------------------`,
    `DOCUMENT TITLE: ${clean(record.title)}`,
    `CATEGORY:       ${clean(record.category)}`,
    `FILE NAME:      ${clean(record.fileName)} (${clean(record.fileType)}, ${clean(record.fileSize)})`,
    `ISSUING CLINIC: ${clean(record.provider)}`,
    `DATE UPLOADED:  ${clean(record.uploadedAt)}`,
    `------------------------------------------------------------------------`,
    `PATIENT DEMOGRAPHICS`,
    `Patient Name:   ${clean(patient.fullName)}`,
    `Medical Rec #:  ${clean(patient.mrn)}   |   DOB: ${clean(patient.dateOfBirth)}   |   Blood: ${clean(patient.bloodType)}`,
    `Primary MD:     ${clean(patient.primaryPhysician)}`,
    `Allergies:      ${clean(patient.allergies)}`,
    `------------------------------------------------------------------------`,
    `CLINICAL FINDINGS & SUMMARY NOTES:`,
  ];

  // Wrap notes to 72 chars per line
  const rawNotes = clean(notes || record.notes || 'No clinical notes recorded.');
  const words = rawNotes.split(/\s+/);
  let currentLine = '';
  for (const w of words) {
    if ((currentLine + ' ' + w).trim().length > 70) {
      lines.push(currentLine.trim());
      currentLine = w;
    } else {
      currentLine = (currentLine + ' ' + w).trim();
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  lines.push(`------------------------------------------------------------------------`);
  lines.push(`Electronically Verified by CareBridge Health Systems · HIPAA Vault`);

  let textOps = 'BT\n/F1 10 Tf\n50 740 Td\n14 TL\n';
  lines.forEach((line, idx) => {
    if (idx === 0) {
      textOps += `(${line}) Tj\n`;
    } else {
      textOps += `T* (${line}) Tj\n`;
    }
  });
  textOps += 'ET';

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );
  objects.push(
    `4 0 obj\n<< /Length ${textOps.length} >>\nstream\n${textOps}\nendstream\nendobj\n`
  );
  objects.push(
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n'
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export const RecordInspectionModal: React.FC<RecordInspectionModalProps> = ({
  record,
  patientProfile,
  onClose,
  onSaveNotes,
  onCreateReminderFromRecord,
}) => {
  const [editableNotes, setEditableNotes] = useState('');
  const [editableStatus, setEditableStatus] = useState<'Verified' | 'Ready for Review'>('Verified');
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [highContrastInvert, setHighContrastInvert] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pdfRenderMode, setPdfRenderMode] = useState<'sheet' | 'native'>('sheet');
  const [showPlainEnglish, setShowPlainEnglish] = useState(true);
  const [reminderAddedSuccess, setReminderAddedSuccess] = useState(false);

  useEffect(() => {
    if (record) {
      setEditableNotes(record.notes || '');
      setEditableStatus(record.status);
      setZoom(100);
      setRotation(0);
      setHighContrastInvert(false);
      setReminderAddedSuccess(false);
      // If user uploaded a real PDF file with a blob/data URL, default to native stream
      setPdfRenderMode(record.fileDataUrl && record.fileType === 'PDF' ? 'native' : 'sheet');
    }
  }, [record]);

  const generatedPdfUrl = useMemo(() => {
    if (!record) return null;
    if (record.fileDataUrl && record.fileType === 'PDF') {
      return record.fileDataUrl;
    }
    const blob = buildNativePdfBlob(record, patientProfile, editableNotes);
    return URL.createObjectURL(blob);
  }, [record, patientProfile, editableNotes]);

  useEffect(() => {
    return () => {
      if (generatedPdfUrl && (!record?.fileDataUrl || record.fileDataUrl !== generatedPdfUrl)) {
        URL.revokeObjectURL(generatedPdfUrl);
      }
    };
  }, [generatedPdfUrl, record]);

  if (!record) return null;

  const isImageFile = record.fileType === 'JPG' || record.fileType === 'PNG';
  const isChestRadiograph =
    record.fileName.toLowerCase().includes('radiograph') ||
    record.fileName.toLowerCase().includes('xray') ||
    record.title.toLowerCase().includes('radiograph') ||
    record.category === 'Medical Report';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveNotes(record.id, editableNotes, editableStatus);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAddReminder = async () => {
    if (!onCreateReminderFromRecord) return;
    const doseMatch = record.title.match(/(\d+\s*(?:mg|mcg|g|IU|mL))/i);
    const extractedDosage = doseMatch ? `${doseMatch[1]} Tablet` : '1 Tablet';
    const cleanedName = record.title
      .replace(/(\d+\s*(?:mg|mcg|g|IU|mL).*)/i, '')
      .replace(/Maintenance|Rx|Prescription|Renewal/gi, '')
      .trim() || record.title;

    await onCreateReminderFromRecord({
      medicationName: cleanedName,
      dosage: extractedDosage,
      frequency: 'Once daily',
      scheduleTime: '20:00',
      timeSlot: 'Evening',
      instructions:
        editableNotes ||
        record.notes ||
        `Take ${extractedDosage} daily as prescribed on ${record.uploadedAt}.`,
      prescribedBy: record.provider,
      refillsRemaining: 3,
      reminderEnabled: true,
      takenToday: false,
      lastTakenDate: 'Not taken yet',
    });
    setReminderAddedSuccess(true);
  };

  const plainEnglishSummary = useMemo(() => {
    if (record.category === 'Blood / Lab Report') {
      return {
        headline: 'All cholesterol and blood sugar markers are in the healthy range.',
        points: [
          'Your LDL ("bad" cholesterol) is 94 mg/dL — safely below the 100 mg/dL target.',
          'Your HbA1c (3-month blood sugar average) is 5.4%, which is normal (< 5.7%).',
          'Continue your current diet and evening statin routine; no dosage changes needed.',
        ],
      };
    }
    if (record.category === 'Prescription') {
      return {
        headline: 'Daily evening medication to keep cholesterol levels healthy.',
        points: [
          'Take 1 tablet in the evening with or without food.',
          'You have 3 refills authorized at your pharmacy for a 90-day supply.',
          'Avoid large amounts of grapefruit juice and let your doctor know if you feel muscle soreness.',
        ],
      };
    }
    if (record.category === 'Discharge Summary') {
      return {
        headline: 'Outpatient knee procedure completed smoothly with no complications.',
        points: [
          'Keep the dressing clean and dry for the first 48 hours after the visit.',
          'Follow your scheduled physical therapy exercises to restore full knee mobility.',
          'Attend your telehealth mobility follow-up check with Dr. Mercer.',
        ],
      };
    }
    if (record.category === 'Medical Report') {
      return {
        headline: 'Clear chest X-ray with normal heart and lung appearance.',
        points: [
          'Both lungs are completely clear with no signs of fluid or infection.',
          'Heart size and chest contours are normal.',
          'No urgent follow-up imaging is required.',
        ],
      };
    }
    return {
      headline: 'Official medical clearance verified by your primary care physician.',
      points: [
        'Confirms you are medically fit for work duties and international travel.',
        'Vital signs and physical exam findings are within normal limits.',
        'Keep a digital or printed copy of this certificate when traveling.',
      ],
    };
  }, [record]);

  const handleDownloadFile = () => {
    if (record.fileDataUrl) {
      const a = document.createElement('a');
      a.href = record.fileDataUrl;
      a.download = record.fileName;
      a.click();
      return;
    }

    const blob = buildNativePdfBlob(record, patientProfile, editableNotes);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.fileName.endsWith('.pdf')
      ? record.fileName
      : `${record.referenceId}_${record.fileName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-record-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative z-10 w-full bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col transition-all ${
          isExpanded
            ? 'max-w-[96vw] h-[94vh]'
            : 'max-w-6xl max-h-[92vh]'
        }`}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200/90 bg-white shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-teal-700 font-medium mb-0.5">
              <span>{record.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-500">
                {record.referenceId}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-mono tabular-nums">
                {record.fileType} ({record.fileSize})
              </span>
            </div>
            <h3
              id="preview-record-title"
              className="text-base sm:text-lg font-bold text-slate-900 truncate"
            >
              {record.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadFile}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>Download {record.fileType}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={isExpanded ? 'Restore modal size' : 'Expand viewer'}
              aria-label={isExpanded ? 'Restore modal size' : 'Expand viewer'}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close record preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split-Pane Body: Left (7 cols) Embedded PDF/Image Viewer + Right (5 cols) Metadata & Clinical Notes */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-y-auto lg:overflow-hidden">
          {/* LEFT PANE: EMBEDDED PDF / IMAGE DOCUMENT VIEWER */}
          <div className="lg:col-span-7 flex flex-col bg-slate-900 min-h-[460px] lg:min-h-0 overflow-hidden">
            {/* Viewer Control Toolbar */}
            <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shrink-0">
              <div className="flex items-center gap-2">
                {isImageFile ? (
                  <ImageIcon className="w-4 h-4 text-teal-400 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                )}
                <span className="font-medium text-white truncate max-w-[200px]">
                  {record.fileName}
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-mono tabular-nums text-[11px] text-slate-400">
                  Page 1 / 1
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* PDF Render Switcher */}
                {record.fileType === 'PDF' && (
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-md mr-1">
                    <button
                      type="button"
                      onClick={() => setPdfRenderMode('sheet')}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                        pdfRenderMode === 'sheet'
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Clinical Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfRenderMode('native')}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                        pdfRenderMode === 'native'
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Embedded PDF
                    </button>
                  </div>
                )}

                {/* Zoom Controls */}
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(60, z - 15))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="px-2 py-1 font-mono tabular-nums text-[11px] text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Reset zoom"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(175, z + 15))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                {/* Rotate & Contrast controls for Images / Scans */}
                {isImageFile && (
                  <>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="Rotate 90 degrees"
                      aria-label="Rotate image"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHighContrastInvert((v) => !v)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        highContrastInvert
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title="Toggle radiology high-contrast / invert mode"
                    >
                      <Contrast className="w-3 h-3" />
                      <span>Invert</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Document Viewport Canvas */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center bg-slate-900/95">
              {/* CASE 1: Native PDF Stream (<iframe>) */}
              {record.fileType === 'PDF' && pdfRenderMode === 'native' && generatedPdfUrl ? (
                <div className="w-full h-full min-h-[480px] bg-white rounded-lg overflow-hidden shadow-lg border border-slate-700">
                  <iframe
                    src={generatedPdfUrl}
                    title={`PDF Viewer - ${record.title}`}
                    className="w-full h-full min-h-[480px] border-0"
                  />
                </div>
              ) : isImageFile && record.fileDataUrl ? (
                /* CASE 2: Real User-Uploaded Image File (JPG / PNG) */
                <div className="flex items-center justify-center min-h-[420px] w-full overflow-auto">
                  <img
                    src={record.fileDataUrl}
                    alt={record.title}
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      filter: highContrastInvert
                        ? 'invert(1) contrast(1.25)'
                        : 'none',
                    }}
                    className="max-w-full max-h-[540px] object-contain rounded-lg shadow-xl border border-slate-700 transition-transform duration-150"
                  />
                </div>
              ) : isImageFile && isChestRadiograph ? (
                /* CASE 3: Diagnostic Chest Radiograph PNG Viewer (DICOM-style X-Ray) */
                <div
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'top center',
                    filter: highContrastInvert ? 'invert(0.92) contrast(1.15)' : 'none',
                  }}
                  className="w-full max-w-xl bg-slate-950 rounded-xl border border-slate-700 shadow-2xl overflow-hidden transition-transform duration-150 text-slate-200 select-none"
                >
                  {/* DICOM Header Overlay */}
                  <div className="px-4 py-2.5 bg-black/80 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono tabular-nums text-teal-400">
                    <div>
                      <span>STUDY: PA & LATERAL THORAX RADIOGRAPH</span>
                      <span className="mx-2 text-slate-600">|</span>
                      <span>ACC: {record.referenceId}</span>
                    </div>
                    <div className="text-slate-400">
                      120 kVp · 3.2 mAs · {record.uploadedAt}
                    </div>
                  </div>

                  {/* Simulated High-Precision PA Chest Radiograph SVG */}
                  <div className="relative bg-radial from-slate-900 via-slate-950 to-black p-6 flex flex-col items-center">
                    <div className="w-full flex justify-between text-xs font-mono text-slate-400 mb-2">
                      <span className="px-2 py-0.5 border border-slate-700 rounded text-teal-400 font-bold">
                        R
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {patientProfile.fullName.toUpperCase()} · MRN {patientProfile.mrn}
                      </span>
                      <span className="px-2 py-0.5 border border-slate-700 rounded text-teal-400 font-bold">
                        L
                      </span>
                    </div>

                    <svg
                      viewBox="0 0 420 340"
                      className="w-full max-w-md h-auto"
                      aria-label="Diagnostic PA Chest Radiograph"
                    >
                      <defs>
                        <radialGradient id="lungGlowL" cx="50%" cy="48%" r="52%">
                          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
                          <stop offset="70%" stopColor="#1e293b" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="#334155" stopOpacity="0.2" />
                        </radialGradient>
                        <radialGradient id="heartShadow" cx="55%" cy="58%" r="40%">
                          <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.85" />
                          <stop offset="75%" stopColor="#94a3b8" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
                        </radialGradient>
                      </defs>

                      {/* Thoracic Cage Outer Contour */}
                      <path
                        d="M95 45 C65 95, 58 210, 78 295 L342 295 C362 210, 355 95, 325 45 Z"
                        fill="#1e293b"
                        fillOpacity="0.45"
                        stroke="#475569"
                        strokeWidth="1.5"
                      />

                      {/* Clavicles */}
                      <path
                        d="M75 58 Q145 76 198 68"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="5"
                        strokeLinecap="round"
                        opacity="0.75"
                      />
                      <path
                        d="M345 58 Q275 76 222 68"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="5"
                        strokeLinecap="round"
                        opacity="0.75"
                      />

                      {/* Spine & Mediastinum */}
                      <rect
                        x="198"
                        y="25"
                        width="24"
                        height="270"
                        rx="6"
                        fill="#cbd5e1"
                        fillOpacity="0.42"
                      />
                      {[45, 72, 99, 126, 153, 180, 207, 234, 261].map((y) => (
                        <rect
                          key={y}
                          x="201"
                          y={y}
                          width="18"
                          height="18"
                          rx="3"
                          fill="#e2e8f0"
                          fillOpacity="0.35"
                        />
                      ))}

                      {/* Right & Left Radiolucent Lung Fields */}
                      <path
                        d="M188 68 C130 72, 96 125, 92 248 C126 232, 165 236, 190 250 Z"
                        fill="url(#lungGlowL)"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                      <path
                        d="M232 68 C290 72, 324 125, 328 252 C294 236, 255 240, 230 252 Z"
                        fill="url(#lungGlowL)"
                        stroke="#64748b"
                        strokeWidth="1"
                      />

                      {/* Pulmonary Vascular Markings */}
                      <path
                        d="M186 135 L145 115 M186 145 L132 152 M186 160 L140 198 M234 135 L275 115 M234 148 L288 156 M234 165 L278 202"
                        stroke="#94a3b8"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        opacity="0.5"
                      />

                      {/* Normal Cardiomediastinal Silhouette */}
                      <path
                        d="M196 125 C178 148, 175 198, 186 238 C215 246, 258 242, 272 212 C278 175, 252 135, 224 125 Z"
                        fill="url(#heartShadow)"
                      />

                      {/* Anterior & Posterior Rib Arcs */}
                      {[88, 118, 148, 178, 208, 236].map((y, idx) => (
                        <g key={y} opacity={0.42 - idx * 0.03}>
                          <path
                            d={`M196 ${y} Q132 ${y - 12} 88 ${y + 18}`}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          <path
                            d={`M224 ${y} Q288 ${y - 12} 332 ${y + 18}`}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                        </g>
                      ))}

                      {/* Costophrenic Angles / Diaphragm Domes */}
                      <path
                        d="M86 254 Q142 226 198 250 Q258 232 334 258"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="3"
                        opacity="0.7"
                      />
                    </svg>

                    {/* Radiologist Impression Strip */}
                    <div className="w-full mt-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-teal-400">
                        <span>IMPRESSION: NORMAL PA & LATERAL CHEST</span>
                        <span>CTR: 0.44 (&lt;0.50 NORMAL)</span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {editableNotes || record.notes}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* CASE 4: Full Clinical Document Page Sheet (Lab Report, Prescription, Certificate, or Discharge Summary) */
                <div
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'top center',
                    filter: highContrastInvert ? 'invert(1) hue-rotate(180deg)' : 'none',
                  }}
                  className="w-full max-w-xl bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-300 p-6 sm:p-8 space-y-5 transition-transform duration-150"
                >
                  {/* Clinical Document Letterhead */}
                  <div className="flex items-start justify-between border-b-2 border-teal-700 pb-4 gap-4">
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-teal-700 uppercase">
                        CareBridge Health Network · Official Clinical Record
                      </p>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">
                        {record.provider}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Document Classification: {record.category}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums text-xs">
                      <span className="inline-block px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                        {record.referenceId}
                      </span>
                      <p className="text-slate-500 mt-1">
                        Date: {record.uploadedAt}
                      </p>
                    </div>
                  </div>

                  {/* Patient Banner inside Document */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        Patient Name
                      </span>
                      <span className="font-semibold text-slate-900">
                        {patientProfile.fullName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        MRN / DOB
                      </span>
                      <span className="font-mono tabular-nums font-medium text-slate-800">
                        {patientProfile.mrn} · {patientProfile.dateOfBirth}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        Blood / Vitals
                      </span>
                      <span className="font-mono tabular-nums font-medium text-slate-800">
                        {patientProfile.bloodType} · {patientProfile.bloodPressure}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        Verification
                      </span>
                      <span className="font-semibold text-emerald-700">
                        {editableStatus}
                      </span>
                    </div>
                  </div>

                  {/* Category-Specific Actual Document Body */}
                  {record.category === 'Blood / Lab Report' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Quantitative Laboratory Assay Results
                        </h5>
                        <span className="text-[11px] font-mono text-slate-500">
                          Specimen: Venous Serum (12h Fasting)
                        </span>
                      </div>
                      <table className="w-full text-left border-collapse text-xs border border-slate-200">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                            <th className="py-2 px-3">Biomarker / Analyte</th>
                            <th className="py-2 px-3 text-right">Result</th>
                            <th className="py-2 px-3 text-right">Reference Interval</th>
                            <th className="py-2 px-3 text-right">Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                          <tr>
                            <td className="py-2 px-3 font-sans font-medium text-slate-900">
                              Total Cholesterol
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              178 mg/dL
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500">
                              &lt; 200 mg/dL
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-700 font-sans font-medium">
                              Normal
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-sans font-medium text-slate-900">
                              HDL Cholesterol
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              58 mg/dL
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500">
                              &gt; 40 mg/dL
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-700 font-sans font-medium">
                              Optimal
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-sans font-medium text-slate-900">
                              LDL Cholesterol (Calc)
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              94 mg/dL
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500">
                              &lt; 100 mg/dL
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-700 font-sans font-medium">
                              Normal
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-sans font-medium text-slate-900">
                              Triglycerides
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              112 mg/dL
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500">
                              &lt; 150 mg/dL
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-700 font-sans font-medium">
                              Normal
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-sans font-medium text-slate-900">
                              Hemoglobin A1c (HbA1c)
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              5.4 %
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500">
                              4.0 – 5.6 %
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-700 font-sans font-medium">
                              Normal
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : record.category === 'Prescription' ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-teal-50/50 border border-teal-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-serif font-bold text-teal-800">
                            Rx
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            DEA/NPI E-Prescribe Verified
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          {record.title}
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-teal-200/60 text-xs">
                          <div>
                            <span className="text-slate-500">Sig (Directions):</span>
                            <p className="font-medium text-slate-800 mt-0.5">
                              {editableNotes || record.notes}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Dispense & Refills:</span>
                            <p className="font-mono tabular-nums font-medium text-slate-800 mt-0.5">
                              Qty: 90 Tablets · Refills: 3 Authorized
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Clinical Report & Findings
                      </h5>
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
                        <p className="font-semibold text-slate-900">
                          Procedure / Examination: {record.title}
                        </p>
                        <p>{editableNotes || record.notes}</p>
                        <p className="text-slate-500 pt-2 border-t border-slate-200">
                          Patient Allergies Checked: {patientProfile.allergies} · Vital Signs Stable ({patientProfile.bloodPressure}, HR {patientProfile.heartRate}, SpO2 {patientProfile.spO2}).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Clinical Interpretation / Notes Block on Sheet */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                      Attending Physician Clinical Commentary
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/90 p-3 rounded border border-slate-200">
                      {editableNotes || record.notes || 'No additional commentary recorded.'}
                    </p>
                  </div>

                  {/* Electronic Signature Footer */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      <p className="font-semibold text-slate-800">
                        Electronically Signed by: {record.provider}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        CareBridge Health Information Exchange · Document ID {record.referenceId}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified Original</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANE: RECORD METADATA & CLINICAL VOICE NOTES EDITOR */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white p-5 sm:p-6 overflow-y-auto space-y-5">
            <div className="space-y-5">
              {/* Patient-Friendly Plain-English Translation Card */}
              <div className="rounded-xl bg-teal-50/60 border border-teal-200/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>What This Means in Plain English</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPlainEnglish((prev) => !prev)}
                    className="text-[11px] font-semibold text-teal-700 hover:underline cursor-pointer"
                  >
                    {showPlainEnglish ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showPlainEnglish && (
                  <div className="space-y-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">
                      {plainEnglishSummary.headline}
                    </p>
                    <ul className="space-y-1 text-[11px] text-slate-600 list-disc pl-4">
                      {plainEnglishSummary.points.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* One-Click Prescription to Medicine Reminder Action */}
                {(record.category === 'Prescription' ||
                  record.category === 'Discharge Summary') &&
                  onCreateReminderFromRecord && (
                    <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between gap-2">
                      {reminderAddedSuccess ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Added to your daily Medicine Reminders
                        </span>
                      ) : (
                        <>
                          <span className="text-[11px] text-teal-800">
                            Sync this prescription to your daily alarm schedule:
                          </span>
                          <button
                            type="button"
                            onClick={handleQuickAddReminder}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Pill className="w-3.5 h-3.5" />
                            <span>+ Add Reminder</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Document Metadata & Provenance
                </h4>
                <div className="grid grid-cols-2 gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="col-span-2">
                    <span className="text-slate-400 block">File Name</span>
                    <span className="font-medium text-slate-800 mt-0.5 block truncate font-mono">
                      {record.fileName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Format & Size</span>
                    <span className="font-medium text-slate-800 mt-0.5 block font-mono tabular-nums">
                      {record.fileType} · {record.fileSize}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date Uploaded</span>
                    <span className="font-medium text-slate-800 mt-0.5 block font-mono tabular-nums">
                      {record.uploadedAt}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Issuing Provider</span>
                    <span className="font-medium text-slate-800 mt-0.5 block">
                      {record.provider}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Clinical Verification Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Verified', 'Ready for Review'] as const).map((statusOption) => (
                    <button
                      key={statusOption}
                      type="button"
                      onClick={() => setEditableStatus(statusOption)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        editableStatus === statusOption
                          ? 'bg-teal-50/90 border-teal-600 text-teal-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{statusOption}</span>
                      {editableStatus === statusOption && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clinical Notes & Voice Dictation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="record-notes-editor"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Clinical Summary & Voice-Transcribed Notes
                  </label>
                  <AudioRecorderButton
                    label="Dictate note"
                    onTranscriptionComplete={(transcript) => {
                      setEditableNotes((prev) =>
                        prev ? `${prev} ${transcript}` : transcript
                      );
                    }}
                  />
                </div>
                <textarea
                  id="record-notes-editor"
                  rows={5}
                  value={editableNotes}
                  onChange={(e) => setEditableNotes(e.target.value)}
                  placeholder="Enter clinical interpretation, follow-up instructions, or dictate spoken notes..."
                  className="w-full p-3 text-xs text-slate-700 leading-relaxed bg-white rounded-lg border border-slate-200/90 focus:outline-none focus:border-teal-600"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Edits update the live document preview & sync to Firestore
                  </span>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDownloadFile}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Original ({record.fileType})</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
