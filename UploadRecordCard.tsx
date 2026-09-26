import React, { useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { RecordCategory, UploadedFilePayload } from '../types/records';
import { UploadRecordModal } from './UploadRecordModal';

export interface UploadRecordCardProps {
  /**
   * Optional callback fired when a user finishes uploading/preparing a record
   */
  onRecordUploaded?: (payload: UploadedFilePayload) => void;
  /**
   * Optional default document category when opening the modal
   */
  defaultCategory?: RecordCategory;
  /**
   * Optional className for outer layout customization
   */
  className?: string;
}

/**
 * Subtle geometric technical document illustration (non-cartoon, architectural SaaS style).
 */
const ClinicalDocumentIllustration: React.FC = () => (
  <svg
    viewBox="0 0 180 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full select-none pointer-events-none"
    aria-hidden="true"
  >
    {/* Subtle technical grid lines */}
    <line x1="16" y1="20" x2="164" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="16" y1="108" x2="164" y2="108" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />

    {/* Back document sheet (Secondary lab report page) */}
    <rect
      x="62"
      y="14"
      width="76"
      height="94"
      rx="6"
      fill="#F8FAFC"
      stroke="#CBD5E1"
      strokeWidth="1.25"
    />
    <line x1="74" y1="30" x2="112" y2="30" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <line x1="74" y1="40" x2="124" y2="40" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="74" y1="48" x2="118" y2="48" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />

    {/* Foreground primary clinical record sheet */}
    <rect
      x="42"
      y="22"
      width="80"
      height="96"
      rx="6"
      fill="#FFFFFF"
      stroke="#94A3B8"
      strokeWidth="1.25"
    />

    {/* Document header bar */}
    <rect x="54" y="34" width="24" height="4" rx="2" fill="#0D9488" fillOpacity="0.85" />
    <rect x="82" y="34" width="16" height="4" rx="2" fill="#E2E8F0" />

    {/* Structured metadata rows */}
    <line x1="54" y1="49" x2="108" y2="49" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <line x1="54" y1="58" x2="98" y2="58" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />

    {/* Structured clinical lab metric bar */}
    <rect
      x="54"
      y="68"
      width="56"
      height="18"
      rx="3"
      fill="#F0FDFA"
      stroke="#99F6E4"
      strokeWidth="1"
    />
    <path
      d="M60 79L67 75L74 80L83 72L91 77L103 73"
      stroke="#0D9488"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Footer lines on document */}
    <line x1="54" y1="96" x2="86" y2="96" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
    <line x1="54" y1="103" x2="74" y2="103" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />

    {/* Minimal upload badge anchored at bottom-right of document */}
    <circle
      cx="122"
      cy="92"
      r="16"
      fill="#0F766E"
    />
    <circle
      cx="122"
      cy="92"
      r="15.5"
      stroke="#FFFFFF"
      strokeOpacity="0.2"
    />
    <path
      d="M122 98V86M122 86L117.5 90.5M122 86L126.5 90.5"
      stroke="#FFFFFF"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const UploadRecordCard: React.FC<UploadRecordCardProps> = ({
  onRecordUploaded,
  defaultCategory = 'Blood / Lab Report',
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<RecordCategory>(defaultCategory);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isCardDragOver, setIsCardDragOver] = useState(false);

  const handleOpenModal = (category?: RecordCategory) => {
    setDroppedFile(null);
    setModalCategory(category || defaultCategory);
    setIsModalOpen(true);
  };

  const handleCardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCardDragOver(true);
  };

  const handleCardDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCardDragOver(false);
  };

  const handleCardDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCardDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setDroppedFile(file);
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <section
        aria-label="Upload Record"
        onDragOver={handleCardDragOver}
        onDragLeave={handleCardDragLeave}
        onDrop={handleCardDrop}
        className={`relative bg-white rounded-xl border transition-all duration-150 shadow-xs ${
          isCardDragOver
            ? 'border-teal-600 ring-2 ring-teal-500/15 bg-teal-50/10'
            : 'border-slate-200/90 hover:border-slate-300/90'
        } ${className}`}
      >
        {/* Top subtle healthcare accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-teal-600 via-teal-500 to-sky-600 rounded-t-xl" />

        <div className="p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left column: Icon, Title, Description, Supported document categories */}
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 max-w-2xl">
              {/* Document / File Upload Icon Container */}
              <div className="w-12 h-12 rounded-xl bg-teal-50/90 border border-teal-200/70 flex items-center justify-center text-teal-700 shrink-0 shadow-2xs">
                <FileUp className="w-5 h-5 stroke-[1.8]" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-teal-700">
                  <span>Upload Record</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-500 font-normal">Patient Document Vault</span>
                </div>

                <h2 className="text-xl font-semibold text-slate-900 tracking-tight text-balance">
                  Upload a medical record
                </h2>

                <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                  Add a prescription, lab report, discharge summary, or other medical document to your CareBridge records.
                </p>

                {/* Unboxed metadata row showing supported medical document types (interactive shortcuts) */}
                <div className="pt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="text-slate-400">Accepted records:</span>
                  <button
                    type="button"
                    onClick={() => handleOpenModal('Prescription')}
                    className="hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                  >
                    Prescriptions
                  </button>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => handleOpenModal('Blood / Lab Report')}
                    className="hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                  >
                    Blood/lab reports
                  </button>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => handleOpenModal('Discharge Summary')}
                    className="hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                  >
                    Discharge summaries
                  </button>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => handleOpenModal('Medical Report')}
                    className="hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                  >
                    Medical reports
                  </button>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => handleOpenModal('Medical Certificate')}
                    className="hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                  >
                    Medical certificates
                  </button>
                </div>
              </div>
            </div>

            {/* Right column: Subtle technical illustration + Primary CTA & Secondary subtle text */}
            <div className="flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-5 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
              {/* Subtle architectural document illustration */}
              <div
                onClick={() => handleOpenModal()}
                className="hidden sm:flex w-36 h-26 rounded-lg bg-slate-50/80 border border-slate-200/70 items-center justify-center p-1.5 cursor-pointer hover:border-teal-300/80 transition-colors"
                title="Click to upload a medical record"
              >
                <ClinicalDocumentIllustration />
              </div>

              {/* Action Group */}
              <div className="flex flex-col items-stretch sm:items-end justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-xs transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                >
                  <Upload className="w-4 h-4 stroke-[2]" />
                  <span>Upload record</span>
                </button>

                <span className="text-xs text-slate-500 text-center sm:text-right">
                  PDF, JPG, PNG supported
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Modal */}
      <UploadRecordModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDroppedFile(null);
        }}
        initialCategory={modalCategory}
        preselectedFile={droppedFile}
        onUploadComplete={(payload) => {
          setIsModalOpen(false);
          setDroppedFile(null);
          onRecordUploaded?.(payload);
        }}
      />
    </>
  );
};
