import React from 'react';
import {
  X,
  ShieldAlert,
  Phone,
  Printer,
  HeartPulse,
  Pill,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  PatientProfileData,
  MedicationReminder,
  ClinicalAppointment,
} from '../types/records';

export interface EmergencyMedicalIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PatientProfileData;
  medications: MedicationReminder[];
  appointments: ClinicalAppointment[];
}

export const EmergencyMedicalIdModal: React.FC<EmergencyMedicalIdModalProps> = ({
  isOpen,
  onClose,
  profile,
  medications,
  appointments,
}) => {
  if (!isOpen) return null;

  const nextAppointment = appointments.find((a) => a.status === 'Confirmed');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-id-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* High-Contrast Emergency Header */}
        <div className="bg-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center font-bold text-sm">
              ID
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-100">
                CareBridge Emergency Medical ID &amp; Paramedic Handover
              </p>
              <h2 id="emergency-id-title" className="text-lg font-bold">
                {profile.fullName} · MRN {profile.mrn}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Card</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-red-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Close Emergency Medical ID"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Critical Demographics & Blood Type Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/90">
            <div>
              <span className="text-slate-400 block">Blood Type</span>
              <span className="text-base font-bold text-red-700 font-mono tabular-nums mt-0.5 block">
                {profile.bloodType}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Date of Birth</span>
              <span className="text-sm font-semibold text-slate-900 font-mono tabular-nums mt-0.5 block">
                {profile.dateOfBirth}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Height / Weight</span>
              <span className="text-sm font-semibold text-slate-900 font-mono tabular-nums mt-0.5 block">
                {profile.height} · {profile.weight}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Baseline BP &amp; HR</span>
              <span className="text-sm font-semibold text-slate-900 font-mono tabular-nums mt-0.5 block">
                {profile.bloodPressure.split(' ')[0]} · {profile.heartRate}
              </span>
            </div>
          </div>

          {/* Critical Allergies Alert Box */}
          <div className="p-4 rounded-xl bg-red-50/90 border border-red-200 space-y-1.5">
            <div className="flex items-center gap-2 text-red-900 font-bold text-xs uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>Critical Allergies &amp; Contraindications</span>
            </div>
            <p className="text-sm font-semibold text-red-950 leading-relaxed">
              {profile.allergies || 'No known drug allergies recorded.'}
            </p>
            <p className="text-[11px] text-red-700">
              Avoid Beta-Lactam / Penicillin-class antibiotics (e.g., Amoxicillin, Ampicillin) and natural rubber latex products.
            </p>
          </div>

          {/* Active Conditions & Active Daily Medications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200/90 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <HeartPulse className="w-4 h-4 text-teal-600" />
                <span>Active Medical Conditions</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                {profile.chronicConditions}
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Attending Physician: <strong className="text-slate-800">{profile.primaryPhysician}</strong>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Pill className="w-4 h-4 text-teal-600" />
                  <span>Active Daily Medications ({medications.length})</span>
                </div>
              </div>
              <ul className="space-y-2 divide-y divide-slate-100">
                {medications.map((med) => (
                  <li key={med.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {med.medicationName}{' '}
                        <span className="font-mono text-teal-700">{med.dosage}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {med.frequency} · {med.scheduleTime} ({med.timeSlot})
                      </p>
                    </div>
                    {med.takenToday && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Taken Today
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Emergency Contact & Insurance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <span>Emergency Contact</span>
              </div>
              <p className="font-semibold text-slate-800">
                {profile.emergencyContactName}
              </p>
              <p className="font-mono text-teal-700 font-semibold">
                {profile.emergencyContactPhone}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Insurance &amp; Next Scheduled Care</span>
              </div>
              <p className="font-semibold text-slate-800">
                {profile.insuranceProvider} · <span className="font-mono">{profile.insurancePolicyNumber}</span>
              </p>
              {nextAppointment && (
                <p className="text-[11px] text-slate-500">
                  Next Visit: {nextAppointment.appointmentDate} ({nextAppointment.doctorName})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>Verified CareBridge Patient Handover Summary</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
