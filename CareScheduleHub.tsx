import React, { useState, useMemo } from 'react';
import {
  Pill,
  Calendar,
  Clock,
  Bell,
  BellOff,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Stethoscope,
  MapPin,
  Video,
  FlaskConical,
  X,
  ShieldCheck,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  MedicationReminder,
  MedicationFrequency,
  MedicationTimeSlot,
  ClinicalAppointment,
  AppointmentVisitType,
  AppointmentStatus,
} from '../types/records';
import { AudioRecorderButton } from './AudioRecorderButton';

export interface CareScheduleHubProps {
  medications: MedicationReminder[];
  appointments: ClinicalAppointment[];
  patientAllergies?: string;
  initialTab?: 'all' | 'medications' | 'appointments';
  onAddMedication: (med: Omit<MedicationReminder, 'id' | 'ownerId'>) => Promise<void>;
  onToggleMedicationTaken: (med: MedicationReminder) => Promise<void>;
  onToggleMedicationReminder: (med: MedicationReminder) => Promise<void>;
  onDeleteMedication: (med: MedicationReminder) => Promise<void>;
  onAddAppointment: (appt: Omit<ClinicalAppointment, 'id' | 'ownerId'>) => Promise<void>;
  onUpdateAppointmentStatus: (
    appt: ClinicalAppointment,
    status: AppointmentStatus
  ) => Promise<void>;
  onDeleteAppointment: (appt: ClinicalAppointment) => Promise<void>;
  isCloudSynced: boolean;
}

const TIME_SLOTS: Array<'ALL' | MedicationTimeSlot> = [
  'ALL',
  'Morning',
  'Afternoon',
  'Evening',
  'Bedtime',
];

const FREQUENCIES: MedicationFrequency[] = [
  'Once daily',
  'Twice daily',
  'Every 8 hours',
  'Weekly',
  'As needed',
];

const VISIT_TYPES: AppointmentVisitType[] = [
  'In-Person Clinic',
  'Telehealth Video',
  'Lab / Diagnostic',
];

export const CareScheduleHub: React.FC<CareScheduleHubProps> = ({
  medications,
  appointments,
  patientAllergies = 'Penicillin (Moderate Urticaria), Latex (Mild Contact Dermatitis)',
  initialTab = 'all',
  onAddMedication,
  onToggleMedicationTaken,
  onToggleMedicationReminder,
  onDeleteMedication,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  isCloudSynced,
}) => {
  const [activeView, setActiveView] = useState<'all' | 'medications' | 'appointments'>(
    initialTab
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'ALL' | MedicationTimeSlot>(
    'ALL'
  );
  const [appointmentFilter, setAppointmentFilter] = useState<'ALL' | AppointmentStatus>(
    'ALL'
  );

  // Add Medication Modal State
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState<MedicationFrequency>('Once daily');
  const [medTimeSlot, setMedTimeSlot] = useState<MedicationTimeSlot>('Morning');
  const [medScheduleTime, setMedScheduleTime] = useState('08:00');
  const [medPrescribedBy, setMedPrescribedBy] = useState(
    'Dr. Elena Rostova, MD · Cardiology'
  );
  const [medRefills, setMedRefills] = useState(3);
  const [medInstructions, setMedInstructions] = useState('');
  const [allergyOverrideConfirmed, setAllergyOverrideConfirmed] = useState(false);
  const [isSubmittingMed, setIsSubmittingMed] = useState(false);

  const detectedAllergyConflict = useMemo(() => {
    const candidate = medName.trim().toLowerCase();
    if (!candidate) return null;
    const lowerAllergies = patientAllergies.toLowerCase();

    const penicillinFamily = [
      'penicillin',
      'amoxicillin',
      'ampicillin',
      'augmentin',
      'piperacillin',
      'dicloxacillin',
      'nafcillin',
      'oxacillin',
    ];

    if (
      lowerAllergies.includes('penicillin') &&
      penicillinFamily.some((drug) => candidate.includes(drug))
    ) {
      return {
        allergen: 'Penicillin / Beta-Lactam Class',
        reaction: 'Moderate Urticaria (Recorded in Patient Chart)',
        explanation: `"${medName.trim()}" belongs to the Beta-Lactam / Penicillin antibiotic family and carries a direct cross-reactivity risk with the patient's documented Penicillin allergy.`,
      };
    }

    if (
      lowerAllergies.includes('sulfa') &&
      (candidate.includes('sulfamethoxazole') ||
        candidate.includes('bactrim') ||
        candidate.includes('septra'))
    ) {
      return {
        allergen: 'Sulfonamide Class',
        reaction: 'Documented Sulfa Sensitivity',
        explanation: `"${medName.trim()}" contains a sulfonamide component that conflicts with the patient's recorded allergy profile.`,
      };
    }

    return null;
  }, [medName, patientAllergies]);

  // Add Appointment Modal State
  const [isAddApptOpen, setIsAddApptOpen] = useState(false);
  const [apptTitle, setApptTitle] = useState('');
  const [apptDoctor, setApptDoctor] = useState('Dr. Elena Rostova, MD');
  const [apptSpecialty, setApptSpecialty] = useState('Cardiology & Internal Medicine');
  const [apptFacility, setApptFacility] = useState(
    'CareBridge Heart & Vascular Institute'
  );
  const [apptDate, setApptDate] = useState('2026-10-14');
  const [apptTime, setApptTime] = useState('09:30');
  const [apptVisitType, setApptVisitType] =
    useState<AppointmentVisitType>('In-Person Clinic');
  const [apptNotes, setApptNotes] = useState('');
  const [isSubmittingAppt, setIsSubmittingAppt] = useState(false);

  const filteredMedications = useMemo(() => {
    if (selectedTimeSlot === 'ALL') return medications;
    return medications.filter((m) => m.timeSlot === selectedTimeSlot);
  }, [medications, selectedTimeSlot]);

  const filteredAppointments = useMemo(() => {
    if (appointmentFilter === 'ALL') return appointments;
    return appointments.filter((a) => a.status === appointmentFilter);
  }, [appointments, appointmentFilter]);

  const medStats = useMemo(() => {
    const total = medications.length;
    const taken = medications.filter((m) => m.takenToday).length;
    const activeReminders = medications.filter((m) => m.reminderEnabled).length;
    const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 100;
    return { total, taken, activeReminders, adherencePct };
  }, [medications]);

  const apptStats = useMemo(() => {
    const confirmed = appointments.filter((a) => a.status === 'Confirmed').length;
    const completed = appointments.filter((a) => a.status === 'Completed').length;
    const nextAppt = appointments.find((a) => a.status === 'Confirmed');
    return { confirmed, completed, nextAppt };
  }, [appointments]);

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim() || !medDosage.trim()) return;
    if (detectedAllergyConflict && !allergyOverrideConfirmed) return;
    setIsSubmittingMed(true);
    try {
      await onAddMedication({
        medicationName: medName.trim(),
        dosage: medDosage.trim(),
        frequency: medFrequency,
        scheduleTime: medScheduleTime,
        timeSlot: medTimeSlot,
        instructions:
          medInstructions.trim() ||
          `Take ${medDosage.trim()} ${medFrequency.toLowerCase()} (${medTimeSlot.toLowerCase()}).`,
        prescribedBy: medPrescribedBy.trim() || 'CareBridge Attending Physician',
        refillsRemaining: Number(medRefills) || 0,
        reminderEnabled: true,
        takenToday: false,
        lastTakenDate: 'Not taken yet',
      });
      setMedName('');
      setMedDosage('');
      setMedInstructions('');
      setAllergyOverrideConfirmed(false);
      setIsAddMedOpen(false);
    } finally {
      setIsSubmittingMed(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptTitle.trim() || !apptDoctor.trim()) return;
    setIsSubmittingAppt(true);
    try {
      await onAddAppointment({
        title: apptTitle.trim(),
        doctorName: apptDoctor.trim(),
        specialty: apptSpecialty.trim() || 'General Practice',
        facilityName: apptFacility.trim() || 'CareBridge Outpatient Center',
        appointmentDate: apptDate,
        appointmentTime: apptTime,
        visitType: apptVisitType,
        status: 'Confirmed',
        notes:
          apptNotes.trim() ||
          'Bring updated medication list and recent CareBridge lab records.',
      });
      setApptTitle('');
      setApptNotes('');
      setIsAddApptOpen(false);
    } finally {
      setIsSubmittingAppt(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Summary & Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-teal-700 font-medium">
            <span>Medication Adherence & Clinical Scheduling</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 font-normal">
              {isCloudSynced ? 'Synced with Cloud Firestore' : 'Local Guest Session'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Medicine Reminders & Clinical Appointments
          </h2>
          <p className="text-xs text-slate-500">
            Track daily prescription doses, configure reminder times, and manage upcoming physician or laboratory visits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'Combined View' },
                { id: 'medications', label: `Medications (${medications.length})` },
                { id: 'appointments', label: `Appointments (${appointments.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeView === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsAddMedOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medicine Reminder</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddApptOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Today&apos;s Dose Adherence
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {medStats.taken} / {medStats.total}
            </p>
            <p className="mt-1 text-xs text-emerald-700 font-medium font-mono tabular-nums">
              {medStats.adherencePct}% daily completion
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Active Alarm Reminders
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {medStats.activeReminders}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Scheduled daily time slots
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Confirmed Appointments
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {apptStats.confirmed}
            </p>
            <p className="mt-1 text-xs text-slate-500 truncate">
              {apptStats.nextAppt
                ? `Next: ${apptStats.nextAppt.appointmentDate} at ${apptStats.nextAppt.appointmentTime}`
                : 'No upcoming visits'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Completed Visits
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {apptStats.completed}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Logged in clinical history
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div
        className={`grid grid-cols-1 ${
          activeView === 'all' ? 'xl:grid-cols-12' : ''
        } gap-6 items-start`}
      >
        {/* SECTION 1: MEDICINE REMINDERS */}
        {(activeView === 'all' || activeView === 'medications') && (
          <section
            aria-label="Medicine Reminders"
            className={`${
              activeView === 'all' ? 'xl:col-span-6' : ''
            } bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden`}
          >
            <div className="p-5 sm:p-6 border-b border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Medicine Reminders ({filteredMedications.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Check off daily doses and manage scheduled medication alarms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddMedOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Reminder</span>
                </button>
              </div>

              {/* Time Slot Filter Bar */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                {TIME_SLOTS.map((slot) => {
                  const active = selectedTimeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {slot === 'ALL' ? 'All Times' : slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredMedications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  No medicine reminders in this time slot
                </p>
                <p className="text-xs text-slate-500">
                  Add a prescription reminder to track daily adherence.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredMedications.map((med) => (
                  <div
                    key={med.id}
                    className={`p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      med.takenToday ? 'bg-emerald-50/25' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleMedicationTaken(med)}
                        className={`mt-0.5 w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          med.takenToday
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-slate-300 text-slate-400 hover:border-teal-600 hover:text-teal-600'
                        }`}
                        title={
                          med.takenToday ? 'Mark as not taken' : 'Mark dose as taken today'
                        }
                        aria-label={`Mark ${med.medicationName} as ${
                          med.takenToday ? 'not taken' : 'taken'
                        }`}
                      >
                        {med.takenToday ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono tabular-nums font-semibold text-teal-700">
                            {med.scheduleTime} · {med.timeSlot}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-slate-500">{med.frequency}</span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="font-mono tabular-nums text-slate-500">
                            {med.refillsRemaining} refills left
                          </span>
                        </div>

                        <h4
                          className={`text-sm font-bold ${
                            med.takenToday
                              ? 'text-slate-500 line-through'
                              : 'text-slate-900'
                          }`}
                        >
                          {med.medicationName}{' '}
                          <span className="font-mono tabular-nums font-semibold text-teal-700 no-underline">
                            {med.dosage}
                          </span>
                        </h4>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {med.instructions}
                        </p>

                        <p className="text-[11px] text-slate-400">
                          Prescribed by {med.prescribedBy}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleMedicationTaken(med)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          med.takenToday
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        {med.takenToday ? 'Taken Today' : 'Take Dose'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleMedicationReminder(med)}
                        className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                          med.reminderEnabled
                            ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                        }`}
                        title={
                          med.reminderEnabled
                            ? `Reminder active for ${med.scheduleTime}`
                            : 'Reminder muted'
                        }
                        aria-label="Toggle reminder alarm"
                      >
                        {med.reminderEnabled ? (
                          <Bell className="w-4 h-4" />
                        ) : (
                          <BellOff className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteMedication(med)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove medication reminder"
                        aria-label={`Remove ${med.medicationName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION 2: CLINICAL APPOINTMENTS */}
        {(activeView === 'all' || activeView === 'appointments') && (
          <section
            aria-label="Clinical Appointments"
            className={`${
              activeView === 'all' ? 'xl:col-span-6' : ''
            } bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden`}
          >
            <div className="p-5 sm:p-6 border-b border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Clinical Appointments ({filteredAppointments.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upcoming specialist consultations, telehealth visits, and diagnostic lab draws.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddApptOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Visit</span>
                </button>
              </div>

              {/* Appointment Status Filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                {(
                  ['ALL', 'Confirmed', 'Completed', 'Rescheduled', 'Cancelled'] as const
                ).map((status) => {
                  const active = appointmentFilter === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setAppointmentFilter(status)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {status === 'ALL' ? 'All Visits' : status}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  No appointments matching this filter
                </p>
                <p className="text-xs text-slate-500">
                  Schedule an upcoming clinic, telehealth, or laboratory appointment.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAppointments.map((appt) => {
                  const VisitIcon =
                    appt.visitType === 'Telehealth Video'
                      ? Video
                      : appt.visitType === 'Lab / Diagnostic'
                      ? FlaskConical
                      : Stethoscope;

                  return (
                    <div
                      key={appt.id}
                      className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Date Calendar Block */}
                          <div className="w-12 h-12 rounded-xl bg-teal-50/90 border border-teal-200/70 flex flex-col items-center justify-center shrink-0 font-mono tabular-nums">
                            <span className="text-[10px] font-bold text-teal-700 uppercase">
                              {appt.appointmentDate.slice(5, 7)}/{appt.appointmentDate.slice(8, 10)}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {appt.appointmentTime}
                            </span>
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="font-semibold text-teal-700 flex items-center gap-1">
                                <VisitIcon className="w-3.5 h-3.5" />
                                {appt.visitType}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="font-mono tabular-nums text-slate-500">
                                {appt.appointmentDate} at {appt.appointmentTime}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span
                                className={`font-semibold ${
                                  appt.status === 'Confirmed'
                                    ? 'text-emerald-700'
                                    : appt.status === 'Completed'
                                    ? 'text-sky-700'
                                    : appt.status === 'Cancelled'
                                    ? 'text-red-600'
                                    : 'text-amber-700'
                                }`}
                              >
                                {appt.status}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900">
                              {appt.title}
                            </h4>

                            <p className="text-xs text-slate-700 font-medium">
                              {appt.doctorName} ·{' '}
                              <span className="text-slate-500 font-normal">
                                {appt.specialty}
                              </span>
                            </p>

                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{appt.facilityName}</span>
                            </p>

                            {appt.notes && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 mt-1.5 leading-relaxed">
                                {appt.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Appointment Action Footer */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          {appt.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAppointmentStatus(appt, 'Completed')
                              }
                              className="px-2.5 py-1 rounded-md font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          )}
                          {appt.status !== 'Confirmed' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAppointmentStatus(appt, 'Confirmed')
                              }
                              className="px-2.5 py-1 rounded-md font-medium bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
                            >
                              Confirm Visit
                            </button>
                          )}
                          {appt.status !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAppointmentStatus(appt, 'Cancelled')
                              }
                              className="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteAppointment(appt)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Delete appointment"
                          aria-label={`Delete ${appt.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* MODAL 1: ADD MEDICINE REMINDER */}
      {isAddMedOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-med-modal-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => setIsAddMedOpen(false)}
            aria-hidden="true"
          />
          <form
            onSubmit={handleCreateMedication}
            className="relative z-10 w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3
                  id="add-med-modal-title"
                  className="text-base font-bold text-slate-900"
                >
                  Add Medicine Reminder
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure dosage schedule and daily adherence notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMedOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-600">
                  Allergy Safety Guard active for:{' '}
                  <strong className="text-slate-900">{patientAllergies}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMedName('Amoxicillin Clavulanate');
                    setMedDosage('500 mg Tablet');
                    setAllergyOverrideConfirmed(false);
                  }}
                  className="text-[11px] font-semibold text-teal-700 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Test Penicillin Check
                </button>
              </div>

              {detectedAllergyConflict && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-2 text-red-900">
                  <div className="flex items-center gap-2 font-bold text-xs text-red-800">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      Drug–Allergy Contraindication: {detectedAllergyConflict.allergen}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-red-800">
                    {detectedAllergyConflict.explanation}
                  </p>
                  <label className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-red-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allergyOverrideConfirmed}
                      onChange={(e) => setAllergyOverrideConfirmed(e.target.checked)}
                      className="rounded border-red-300 text-red-600 focus:ring-red-500"
                    />
                    <span>
                      Prescribing physician has reviewed and approved desensitization / override
                    </span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={medName}
                    onChange={(e) => {
                      setMedName(e.target.value);
                      setAllergyOverrideConfirmed(false);
                    }}
                    placeholder="e.g., Rosuvastatin Calcium"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dosage / Strength *
                  </label>
                  <input
                    type="text"
                    required
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="e.g., 10 mg Tablet"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={medFrequency}
                    onChange={(e) =>
                      setMedFrequency(e.target.value as MedicationFrequency)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-600"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Time Slot
                  </label>
                  <select
                    value={medTimeSlot}
                    onChange={(e) =>
                      setMedTimeSlot(e.target.value as MedicationTimeSlot)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-600"
                  >
                    {(['Morning', 'Afternoon', 'Evening', 'Bedtime'] as const).map(
                      (slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reminder Time
                  </label>
                  <input
                    type="time"
                    value={medScheduleTime}
                    onChange={(e) => setMedScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Prescribing Physician
                  </label>
                  <input
                    type="text"
                    value={medPrescribedBy}
                    onChange={(e) => setMedPrescribedBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Refills Remaining
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={medRefills}
                    onChange={(e) => setMedRefills(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Administration Instructions
                  </label>
                  <AudioRecorderButton
                    label="Dictate"
                    onTranscriptionComplete={(t) =>
                      setMedInstructions((prev) => (prev ? `${prev} ${t}` : t))
                    }
                  />
                </div>
                <textarea
                  rows={2}
                  value={medInstructions}
                  onChange={(e) => setMedInstructions(e.target.value)}
                  placeholder="e.g., Take with water after evening meal. Avoid grapefruit juice."
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddMedOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmittingMed ||
                  Boolean(detectedAllergyConflict && !allergyOverrideConfirmed)
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg shadow-2xs cursor-pointer"
              >
                {isSubmittingMed ? 'Saving...' : 'Save Medicine Reminder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: SCHEDULE CLINICAL APPOINTMENT */}
      {isAddApptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-appt-modal-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => setIsAddApptOpen(false)}
            aria-hidden="true"
          />
          <form
            onSubmit={handleCreateAppointment}
            className="relative z-10 w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3
                  id="add-appt-modal-title"
                  className="text-base font-bold text-slate-900"
                >
                  Schedule Clinical Appointment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Book an in-person specialist consultation, telehealth visit, or lab draw.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddApptOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Appointment Title / Reason for Visit *
                </label>
                <input
                  type="text"
                  required
                  value={apptTitle}
                  onChange={(e) => setApptTitle(e.target.value)}
                  placeholder="e.g., 6-Month Cardiology & Lipid Panel Review"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Attending Physician / Provider *
                  </label>
                  <input
                    type="text"
                    required
                    value={apptDoctor}
                    onChange={(e) => setApptDoctor(e.target.value)}
                    placeholder="e.g., Dr. Elena Rostova, MD"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Clinical Specialty
                  </label>
                  <input
                    type="text"
                    value={apptSpecialty}
                    onChange={(e) => setApptSpecialty(e.target.value)}
                    placeholder="e.g., Cardiology"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Visit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Visit Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Visit Format
                  </label>
                  <select
                    value={apptVisitType}
                    onChange={(e) =>
                      setApptVisitType(e.target.value as AppointmentVisitType)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-600"
                  >
                    {VISIT_TYPES.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinic / Hospital Location
                </label>
                <input
                  type="text"
                  value={apptFacility}
                  onChange={(e) => setApptFacility(e.target.value)}
                  placeholder="e.g., Mount Sinai Outpatient Pavilion, Suite 400"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Preparation Instructions / Notes
                  </label>
                  <AudioRecorderButton
                    label="Dictate"
                    onTranscriptionComplete={(t) =>
                      setApptNotes((prev) => (prev ? `${prev} ${t}` : t))
                    }
                  />
                </div>
                <textarea
                  rows={2}
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="e.g., Fast for 12 hours prior to appointment. Bring insurance card."
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddApptOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAppt}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs cursor-pointer"
              >
                {isSubmittingAppt ? 'Scheduling...' : 'Confirm Appointment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
