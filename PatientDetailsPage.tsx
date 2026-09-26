import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  HeartPulse,
  ShieldAlert,
  Stethoscope,
  Phone,
  Edit3,
  Save,
  X,
  CheckCircle2,
  FileText,
  Upload,
} from 'lucide-react';
import { PatientProfileData, MedicalRecord } from '../types/records';
import { AudioRecorderButton } from './AudioRecorderButton';

export interface PatientDetailsPageProps {
  profile: PatientProfileData;
  records: MedicalRecord[];
  onSaveProfile: (updated: PatientProfileData) => Promise<void>;
  onOpenUploadModal: () => void;
  onInspectRecord: (record: MedicalRecord) => void;
  isCloudSynced: boolean;
}

export const PatientDetailsPage: React.FC<PatientDetailsPageProps> = ({
  profile,
  records,
  onSaveProfile,
  onOpenUploadModal,
  onInspectRecord,
  isCloudSynced,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PatientProfileData>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleFieldChange = (field: keyof PatientProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile(formData);
      setIsEditing(false);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const allergyItems = formData.allergies
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const conditionItems = formData.chronicConditions
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Save Notification Banner */}
      {saveSuccess && (
        <div
          role="status"
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Patient profile and clinical details updated{' '}
              {isCloudSynced ? 'and synced to Cloud Firestore.' : 'in your session.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(false)}
            className="p-1 text-teal-700 hover:bg-teal-100 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Patient Identity Banner Card */}
      <section className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-600 via-teal-500 to-sky-600" />
        <div className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl font-bold tracking-tight shrink-0 shadow-xs">
              {profile.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-teal-700 font-medium">
                <span>Verified CareBridge Patient Chart</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-mono tabular-nums text-slate-600">
                  MRN {profile.mrn}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-slate-500 font-normal">
                  {isCloudSynced ? 'Cloud Firestore Record' : 'Active Session Profile'}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {profile.fullName}
              </h2>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span>
                  DOB: <strong className="font-mono tabular-nums font-semibold text-slate-800">{profile.dateOfBirth}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  Sex: <strong className="font-semibold text-slate-800">{profile.gender}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  Blood Type: <strong className="font-mono font-semibold text-teal-700">{profile.bloodType}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  Height / Weight:{' '}
                  <strong className="font-mono tabular-nums font-semibold text-slate-800">
                    {profile.height} / {profile.weight}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Edit Patient Details</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Medical Record</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFormData(profile);
                  setIsEditing(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Editing</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Edit Mode Form OR Structured Read-Only Clinical Cards */}
      {isEditing ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Update Patient Profile & Clinical Chart
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Modify demographic details, vitals, allergies, and care provider contacts.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Profile...' : 'Save Changes'}</span>
            </button>
          </div>

          {/* Section 1: Demographics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => handleFieldChange('fullName', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Biological Sex / Gender
              </label>
              <input
                type="text"
                required
                value={formData.gender}
                onChange={(e) => handleFieldChange('gender', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Blood Type
              </label>
              <input
                type="text"
                required
                value={formData.bloodType}
                onChange={(e) => handleFieldChange('bloodType', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Height
              </label>
              <input
                type="text"
                required
                value={formData.height}
                onChange={(e) => handleFieldChange('height', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Weight
              </label>
              <input
                type="text"
                required
                value={formData.weight}
                onChange={(e) => handleFieldChange('weight', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Section 2: Vitals */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Blood Pressure
              </label>
              <input
                type="text"
                value={formData.bloodPressure}
                onChange={(e) => handleFieldChange('bloodPressure', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Resting Heart Rate
              </label>
              <input
                type="text"
                value={formData.heartRate}
                onChange={(e) => handleFieldChange('heartRate', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Blood Oxygen (SpO2)
              </label>
              <input
                type="text"
                value={formData.spO2}
                onChange={(e) => handleFieldChange('spO2', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fasting Glucose
              </label>
              <input
                type="text"
                value={formData.fastingGlucose}
                onChange={(e) => handleFieldChange('fastingGlucose', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Section 3: Contact, Provider & Insurance */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Primary Care Physician
              </label>
              <input
                type="text"
                value={formData.primaryPhysician}
                onChange={(e) => handleFieldChange('primaryPhysician', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Insurance Provider & Plan
              </label>
              <input
                type="text"
                value={formData.insuranceProvider}
                onChange={(e) => handleFieldChange('insuranceProvider', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Insurance Policy / Member ID
              </label>
              <input
                type="text"
                value={formData.insurancePolicyNumber}
                onChange={(e) =>
                  handleFieldChange('insurancePolicyNumber', e.target.value)
                }
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Emergency Contact Name & Relation
              </label>
              <input
                type="text"
                value={formData.emergencyContactName}
                onChange={(e) =>
                  handleFieldChange('emergencyContactName', e.target.value)
                }
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="text"
                value={formData.emergencyContactPhone}
                onChange={(e) =>
                  handleFieldChange('emergencyContactPhone', e.target.value)
                }
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Section 4: Allergies, Conditions & Voice-Dictated Clinical Summary */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Documented Allergies (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => handleFieldChange('allergies', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Active Conditions & Diagnoses (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.chronicConditions}
                  onChange={(e) =>
                    handleFieldChange('chronicConditions', e.target.value)
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Patient Clinical Summary & Care Notes
                </label>
                <AudioRecorderButton
                  label="Dictate clinical summary"
                  onTranscriptionComplete={(transcript) =>
                    handleFieldChange(
                      'clinicalSummary',
                      formData.clinicalSummary
                        ? `${formData.clinicalSummary} ${transcript}`
                        : transcript
                    )
                  }
                />
              </div>
              <textarea
                rows={3}
                value={formData.clinicalSummary}
                onChange={(e) =>
                  handleFieldChange('clinicalSummary', e.target.value)
                }
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* Row 1: 4 Clinical Vital Signs Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Blood Pressure</span>
                <HeartPulse className="w-4 h-4 text-teal-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {profile.bloodPressure}
              </p>
              <p className="mt-1 text-xs text-emerald-700 font-medium">
                Nominal · Resting Seated
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Resting Heart Rate</span>
                <HeartPulse className="w-4 h-4 text-teal-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {profile.heartRate}
              </p>
              <p className="mt-1 text-xs text-emerald-700 font-medium">
                Normal Sinus Rhythm
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Blood Oxygen (SpO2)</span>
                <UserCheck className="w-4 h-4 text-teal-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {profile.spO2}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Room Air Pulse Oximetry
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Fasting Glucose</span>
                <Stethoscope className="w-4 h-4 text-teal-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {profile.fastingGlucose}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Reference: 70–99 mg/dL
              </p>
            </div>
          </div>

          {/* Row 2: 3-Card Structured Patient Clinical Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1: Personal Demographics & Contact Information */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Demographics & Contact
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">Verified</span>
                </div>

                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-800 text-right">
                      {profile.phone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="font-medium text-slate-800 text-right truncate">
                      {profile.email}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500 shrink-0">Address</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {profile.address}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                <p className="font-semibold text-slate-700">Emergency Contact</p>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{profile.emergencyContactName}</span>
                  <span className="font-mono tabular-nums font-medium text-slate-800">
                    {profile.emergencyContactPhone}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Allergies & Active Conditions */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Allergies & Active Conditions
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {allergyItems.length + conditionItems.length} entries
                  </span>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    Known Allergies & Reactions
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-800">
                    {allergyItems.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between py-1 px-2.5 rounded-md bg-amber-50/70 border border-amber-200/70"
                      >
                        <span className="font-medium text-amber-950">{item}</span>
                        <span className="text-[11px] text-amber-700">Alert</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    Active Clinical Conditions
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {conditionItems.map((cond, idx) => (
                      <li
                        key={idx}
                        className="py-1.5 px-2.5 rounded-md bg-slate-50 border border-slate-200/70 font-medium text-slate-800"
                      >
                        {cond}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Card 3: Care Team, Insurance & Clinical Summary */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Care Provider & Coverage
                    </h3>
                  </div>
                  <span className="text-xs text-teal-700 font-medium">Active</span>
                </div>

                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-slate-500">Primary Care Physician</dt>
                    <dd className="font-semibold text-slate-900 mt-0.5">
                      {profile.primaryPhysician}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 pt-1">
                    <dt className="text-slate-500">Insurance Plan</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {profile.insuranceProvider}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Member Policy ID</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-800 text-right">
                      {profile.insurancePolicyNumber}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-1">
                  Clinical Continuity Summary
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {profile.clinicalSummary}
                </p>
              </div>
            </div>
          </div>

          {/* Row 3: Linked Patient Medical Records Card Grid */}
          <section className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Associated Patient Medical Records ({records.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clinical documents linked to {profile.fullName} (MRN {profile.mrn})
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenUploadModal}
                className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
              >
                + Add Record to Chart
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onInspectRecord(rec)}
                  className="group p-4 rounded-xl border border-slate-200/90 hover:border-teal-500/70 bg-slate-50/40 hover:bg-white transition-all cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 truncate">
                        {rec.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {rec.provider}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {rec.category} · {rec.fileType}
                    </span>
                    <span className="font-mono tabular-nums">{rec.uploadedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
