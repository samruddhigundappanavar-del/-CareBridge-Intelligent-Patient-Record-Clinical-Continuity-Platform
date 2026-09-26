import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  ShieldCheck,
} from 'lucide-react';
import { RecordCategory, UploadedFilePayload } from '../types/records';
import { AudioRecorderButton } from './AudioRecorderButton';

export interface UploadRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (payload: UploadedFilePayload) => void;
  initialCategory?: RecordCategory;
  preselectedFile?: File | null;
}

const RECORD_CATEGORIES: RecordCategory[] = [
  'Prescription',
  'Blood / Lab Report',
  'Discharge Summary',
  'Medical Report',
  'Medical Certificate',
];

const SAMPLE_FILES: Array<{
  name: string;
  size: string;
  type: 'PDF' | 'JPG' | 'PNG';
  category: RecordCategory;
  provider: string;
}> = [
  {
    name: 'Comprehensive_Metabolic_Panel_Sep2026.pdf',
    size: '1.4 MB',
    type: 'PDF',
    category: 'Blood / Lab Report',
    provider: 'Quest Diagnostics Clinical Lab',
  },
  {
    name: 'Amoxicillin_Clavulanate_Rx_875mg.jpg',
    size: '840 KB',
    type: 'JPG',
    category: 'Prescription',
    provider: 'Dr. Elena Rostova, MD · Internal Medicine',
  },
  {
    name: 'Inpatient_Discharge_Summary_StLukes.pdf',
    size: '2.8 MB',
    type: 'PDF',
    category: 'Discharge Summary',
    provider: "St. Luke's Medical Center",
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function detectCategoryFromFileName(name: string, fallback: RecordCategory): RecordCategory {
  const lower = name.toLowerCase();
  if (lower.includes('rx') || lower.includes('prescrip') || lower.includes('med')) {
    return 'Prescription';
  }
  if (lower.includes('lab') || lower.includes('blood') || lower.includes('panel') || lower.includes('cbc')) {
    return 'Blood / Lab Report';
  }
  if (lower.includes('discharge') || lower.includes('summary')) {
    return 'Discharge Summary';
  }
  if (lower.includes('cert') || lower.includes('clearance') || lower.includes('fit')) {
    return 'Medical Certificate';
  }
  if (lower.includes('report') || lower.includes('imaging') || lower.includes('mri') || lower.includes('xray')) {
    return 'Medical Report';
  }
  return fallback;
}

export const UploadRecordModal: React.FC<UploadRecordModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  initialCategory = 'Blood / Lab Report',
  preselectedFile = null,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<RecordCategory>(initialCategory);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'preparing' | 'completed'>('idle');
  const [progress, setProgress] = useState(0);
  const [activeFile, setActiveFile] = useState<{
    name: string;
    size: string;
    type: 'PDF' | 'JPG' | 'PNG';
    provider?: string;
    fileDataUrl?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(initialCategory);
      setClinicalNotes('');
      setErrorMessage(null);
      if (preselectedFile) {
        handleRealFileSelection(preselectedFile);
      } else {
        setUploadState('idle');
        setProgress(0);
        setActiveFile(null);
      }
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isOpen, initialCategory, preselectedFile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const startMockPreparation = (
    fileInfo: {
      name: string;
      size: string;
      type: 'PDF' | 'JPG' | 'PNG';
      provider?: string;
      fileDataUrl?: string;
    },
    categoryToUse: RecordCategory
  ) => {
    setErrorMessage(null);
    setActiveFile(fileInfo);
    setUploadState('preparing');
    setProgress(12);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    let currentProgress = 12;
    timerRef.current = window.setInterval(() => {
      currentProgress += Math.floor(Math.random() * 18) + 14;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setUploadState('completed');
        window.setTimeout(() => {
          onUploadComplete?.({
            fileName: fileInfo.name,
            fileSize: fileInfo.size,
            fileType: fileInfo.type,
            category: categoryToUse,
            provider: fileInfo.provider,
            notes: clinicalNotes.trim() || undefined,
            fileDataUrl: fileInfo.fileDataUrl,
          });
        }, 550);
      } else {
        setProgress(currentProgress);
      }
    }, 320);
  };

  const handleRealFileSelection = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let resolvedType: 'PDF' | 'JPG' | 'PNG' | null = null;

    if (file.type === 'application/pdf' || ext === 'pdf') {
      resolvedType = 'PDF';
    } else if (file.type === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') {
      resolvedType = 'JPG';
    } else if (file.type === 'image/png' || ext === 'png') {
      resolvedType = 'PNG';
    }

    if (!resolvedType) {
      setErrorMessage('Unsupported file format. Please select a PDF, JPG, or PNG file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File exceeds the 25 MB clinical document size limit.');
      return;
    }

    const inferredCategory = detectCategoryFromFileName(file.name, selectedCategory);
    setSelectedCategory(inferredCategory);

    const objectUrl = URL.createObjectURL(file);

    startMockPreparation(
      {
        name: file.name,
        size: formatFileSize(file.size),
        type: resolvedType,
        fileDataUrl: objectUrl,
      },
      inferredCategory
    );
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRealFileSelection(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState === 'idle') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploadState !== 'idle') return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleRealFileSelection(file);
    }
  };

  const handleCancel = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setUploadState('idle');
    setProgress(0);
    setActiveFile(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/45 backdrop-blur-[2px] transition-opacity duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="fixed inset-0" onClick={handleCancel} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2
              id="upload-modal-title"
              className="text-lg font-semibold text-slate-900 tracking-tight"
            >
              Upload a medical record
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add clinical documentation to your encrypted CareBridge health record.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Document Category Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Document classification
            </label>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Document classification">
              {RECORD_CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    disabled={uploadState !== 'idle'}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-600 ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/75 hover:text-slate-900'
                    } ${uploadState !== 'idle' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Voice-Transcribed Clinical Notes */}
          {uploadState === 'idle' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="upload-clinical-notes"
                  className="text-xs font-medium text-slate-700"
                >
                  Clinical notes or symptoms (optional)
                </label>
                <AudioRecorderButton
                  label="Dictate note"
                  onTranscriptionComplete={(transcript) => {
                    setClinicalNotes((prev) =>
                      prev ? `${prev} ${transcript}` : transcript
                    );
                  }}
                />
              </div>
              <textarea
                id="upload-clinical-notes"
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Add context or use the microphone to transcribe spoken clinical notes..."
                className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 transition-colors resize-none"
              />
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50/80 border border-red-200 text-red-700 text-xs"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Main Interaction Zone: Idle Drag & Drop OR Loading State */}
          {uploadState === 'idle' ? (
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`group relative flex flex-col items-center justify-center px-6 py-7 text-center rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                  isDragging
                    ? 'border-teal-600 bg-teal-50/50'
                    : 'border-slate-200 hover:border-teal-500/60 bg-slate-50/50 hover:bg-teal-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={handleFileInputChange}
                  className="hidden"
                  aria-label="Select medical record file"
                />

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                    isDragging
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-white border border-slate-200/90 text-teal-700 shadow-2xs group-hover:border-teal-200 group-hover:bg-teal-50/60'
                  }`}
                >
                  <Upload className="w-5 h-5 stroke-[1.75]" />
                </div>

                <p className="text-sm font-semibold text-slate-900">
                  Drag and drop your medical document here
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  Upload a {selectedCategory.toLowerCase()} or select a file from your device
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-teal-700 bg-white border border-slate-200/90 rounded-lg shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-teal-600" />
                  Browse files
                </button>

                <div className="mt-4 pt-3 border-t border-slate-200/60 w-full flex items-center justify-center gap-2 text-xs text-slate-400">
                  <span>Supported formats: PDF, JPG, PNG</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Max 25 MB</span>
                </div>
              </div>

              {/* Quick Sample Documents */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    Or test with a sample clinical file
                  </span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg bg-slate-50/40">
                  {SAMPLE_FILES.map((sample) => (
                    <button
                      key={sample.name}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(sample.category);
                        startMockPreparation(
                          {
                            name: sample.name,
                            size: sample.size,
                            type: sample.type,
                            provider: sample.provider,
                          },
                          sample.category
                        );
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-white transition-colors first:rounded-t-lg last:rounded-b-lg group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0 transition-colors" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">
                            {sample.name}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span>{sample.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{sample.type}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{sample.size}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Loading / Preparing State */
            <div
              className="px-6 py-9 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col items-center text-center"
              aria-live="polite"
            >
              {uploadState === 'preparing' ? (
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}

              <h3 className="text-base font-semibold text-slate-900">
                {uploadState === 'preparing'
                  ? 'Preparing your record...'
                  : 'Record ready'}
              </h3>

              {activeFile && (
                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-500 max-w-sm">
                  <span className="font-medium text-slate-700 truncate">
                    {activeFile.name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeFile.type}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{activeFile.size}</span>
                </div>
              )}

              <div className="w-full max-w-xs mt-5">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>
                    {progress < 45
                      ? 'Verifying document integrity'
                      : progress < 85
                      ? 'Structuring clinical metadata'
                      : 'Adding to CareBridge records'}
                  </span>
                  <span className="font-mono tabular-nums text-slate-700 font-medium">
                    {progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Classification: <span className="text-slate-600 font-medium">{selectedCategory}</span>
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>HIPAA-ready clinical document storage</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            >
              Cancel
            </button>
            {uploadState === 'idle' && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-2xs whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                Browse files
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
