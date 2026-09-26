/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Eye,
  Trash2,
  CheckCircle2,
  X,
  Plus,
  LogIn,
  LogOut,
  FolderKanban,
  MessageSquare,
  Globe,
  MapPin,
  ShieldCheck,
  UserRound,
  Pill,
  LayoutGrid,
  List,
  Stethoscope,
  ShieldAlert,
  Calendar,
  Circle,
  Sparkles,
  Activity,
  ArrowRight,
  Moon,
  Sun,
  Presentation,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  db,
  auth,
  signOutUser,
  onAuthStateChanged,
  OperationType,
  handleFirestoreError,
  User,
} from './firebase';
import { UploadRecordCard } from './components/UploadRecordCard';
import { UploadRecordModal } from './components/UploadRecordModal';
import { CareBridgeChatbot } from './components/CareBridgeChatbot';
import { ClinicalSearchExplorer } from './components/ClinicalSearchExplorer';
import { CareTeamMapsFinder } from './components/CareTeamMapsFinder';
import { AudioRecorderButton } from './components/AudioRecorderButton';
import { LoginPage, SessionAccount } from './components/LoginPage';
import { PatientDetailsPage } from './components/PatientDetailsPage';
import { RecordInspectionModal } from './components/RecordInspectionModal';
import { CareScheduleHub } from './components/CareScheduleHub';
import { EmergencyMedicalIdModal } from './components/EmergencyMedicalIdModal';
import { PitchDeckModal } from './components/PitchDeckModal';
import {
  MedicalRecord,
  RecordCategory,
  UploadedFilePayload,
  PatientProfileData,
  MedicationReminder,
  MedicationFrequency,
  MedicationTimeSlot,
  ClinicalAppointment,
  AppointmentVisitType,
  AppointmentStatus,
} from './types/records';

const INITIAL_SEED_RECORDS: Omit<MedicalRecord, 'id'>[] = [
  {
    title: 'Comprehensive Lipid & HbA1c Panel',
    fileName: 'Lipid_Panel_HbA1c_Aug2026.pdf',
    category: 'Blood / Lab Report',
    fileType: 'PDF',
    fileSize: '1.2 MB',
    uploadedAt: '2026-08-19',
    provider: 'Quest Diagnostics Clinical Lab',
    status: 'Verified',
    referenceId: 'CB-2026-8841',
    notes:
      'Fasting 12-hour blood draw. Total cholesterol 178 mg/dL, HDL 58 mg/dL, LDL 94 mg/dL, triglycerides 112 mg/dL, and Hemoglobin A1c 5.4% within reference range.',
  },
  {
    title: 'Atorvastatin Calcium 20mg Maintenance Rx',
    fileName: 'Atorvastatin_20mg_Renewal_Rx.pdf',
    category: 'Prescription',
    fileType: 'PDF',
    fileSize: '420 KB',
    uploadedAt: '2026-08-04',
    provider: 'Dr. Elena Rostova, MD · Cardiology',
    status: 'Verified',
    referenceId: 'CB-2026-7912',
    notes:
      'Take 1 tablet daily in the evening. 90-day supply with 3 refills authorized.',
  },
  {
    title: 'Outpatient Arthroscopic Procedure Summary',
    fileName: 'Discharge_Summary_Ortho_Jul2026.pdf',
    category: 'Discharge Summary',
    fileType: 'PDF',
    fileSize: '2.4 MB',
    uploadedAt: '2026-07-14',
    provider: 'Mount Sinai Orthopedic Pavilion',
    status: 'Verified',
    referenceId: 'CB-2026-6409',
    notes:
      'Post-operative recovery instructions, physical therapy referral schedule, and wound care protocol.',
  },
  {
    title: 'Diagnostic Chest Radiograph & Interpretation',
    fileName: 'Chest_Radiograph_PA_Lateral.png',
    category: 'Medical Report',
    fileType: 'PNG',
    fileSize: '3.6 MB',
    uploadedAt: '2026-06-28',
    provider: 'Midtown Diagnostic Imaging Center',
    status: 'Verified',
    referenceId: 'CB-2026-5310',
    notes:
      'Clear lung fields bilaterally. Normal cardiomediastinal silhouette. No acute cardiopulmonary findings.',
  },
  {
    title: 'Annual Occupational & Travel Fitness Clearance',
    fileName: 'Medical_Fitness_Certificate_2026.jpg',
    category: 'Medical Certificate',
    fileType: 'JPG',
    fileSize: '690 KB',
    uploadedAt: '2026-05-11',
    provider: 'Dr. Marcus Vance, MD · Primary Care',
    status: 'Verified',
    referenceId: 'CB-2026-4102',
    notes:
      'Certified medically fit for unrestricted occupational duty and international air travel.',
  },
];

const DEFAULT_PATIENT_PROFILE: PatientProfileData = {
  fullName: 'Jordan Taylor',
  mrn: 'CB-90412',
  dateOfBirth: '1988-04-16',
  gender: 'Female',
  bloodType: 'O+',
  height: '170 cm',
  weight: '66 kg',
  phone: '+1 (415) 890-4312',
  email: 'jordan.taylor@carebridge.health',
  address: '742 Sutter Street, Suite 400, San Francisco, CA 94109',
  emergencyContactName: 'Michael Taylor (Spouse)',
  emergencyContactPhone: '+1 (415) 890-9920',
  primaryPhysician: 'Dr. Elena Rostova, MD · Cardiology & Internal Medicine',
  insuranceProvider: 'BlueCross Shield PPO Premier',
  insurancePolicyNumber: 'BCS-8849201-CA',
  allergies: 'Penicillin (Moderate Urticaria), Latex (Mild Contact Dermatitis)',
  chronicConditions:
    'Familial Hyperlipidemia (Controlled on Statin), Post-Arthroscopic Right Knee Rehabilitation',
  bloodPressure: '118/76 mmHg',
  heartRate: '68 bpm',
  spO2: '99%',
  fastingGlucose: '92 mg/dL',
  clinicalSummary:
    'Patient maintains active cardiovascular prevention regimen with Atorvastatin 20mg daily. Fasting lipid panel and HbA1c (5.4%) remain well within target clinical thresholds. Completed outpatient right knee arthroscopy in July 2026 with full range of motion restored.',
};

const INITIAL_SEED_MEDICATIONS: Omit<MedicationReminder, 'id'>[] = [
  {
    medicationName: 'Atorvastatin Calcium',
    dosage: '20 mg Tablet',
    frequency: 'Once daily',
    scheduleTime: '20:00',
    timeSlot: 'Evening',
    instructions: 'Take 1 tablet daily with evening meal for lipid management.',
    prescribedBy: 'Dr. Elena Rostova, MD · Cardiology',
    refillsRemaining: 3,
    reminderEnabled: true,
    takenToday: true,
    lastTakenDate: '2026-09-26',
  },
  {
    medicationName: 'Vitamin D3 (Cholecalciferol)',
    dosage: '2000 IU Softgel',
    frequency: 'Once daily',
    scheduleTime: '08:00',
    timeSlot: 'Morning',
    instructions: 'Take 1 softgel with breakfast for bone & immune support.',
    prescribedBy: 'Dr. Marcus Vance, MD · Primary Care',
    refillsRemaining: 5,
    reminderEnabled: true,
    takenToday: true,
    lastTakenDate: '2026-09-26',
  },
  {
    medicationName: 'Meloxicam',
    dosage: '15 mg Tablet',
    frequency: 'Once daily',
    scheduleTime: '12:30',
    timeSlot: 'Afternoon',
    instructions: 'Take with lunch following right knee physical therapy sessions.',
    prescribedBy: 'Mount Sinai Orthopedic Pavilion',
    refillsRemaining: 1,
    reminderEnabled: true,
    takenToday: false,
    lastTakenDate: '2026-09-25',
  },
];

const INITIAL_SEED_APPOINTMENTS: Omit<ClinicalAppointment, 'id'>[] = [
  {
    title: 'Cardiology & Lipid Panel Follow-Up',
    doctorName: 'Dr. Elena Rostova, MD',
    specialty: 'Cardiology & Internal Medicine',
    facilityName: 'CareBridge Heart & Vascular Institute · Suite 400',
    appointmentDate: '2026-10-08',
    appointmentTime: '09:30',
    visitType: 'In-Person Clinic',
    status: 'Confirmed',
    notes: 'Review 6-month Atorvastatin 20mg response and fasting lipid profile.',
  },
  {
    title: 'Post-Arthroscopic Right Knee Mobility Assessment',
    doctorName: 'Dr. Julian Mercer, MD',
    specialty: 'Orthopedic Sports Medicine',
    facilityName: 'Mount Sinai Orthopedic Pavilion',
    appointmentDate: '2026-10-15',
    appointmentTime: '14:00',
    visitType: 'Telehealth Video',
    status: 'Confirmed',
    notes: 'Final range-of-motion clearance check and physical therapy graduation.',
  },
  {
    title: 'Quarterly Comprehensive Metabolic & HbA1c Draw',
    doctorName: 'Quest Clinical Phlebotomy Team',
    specialty: 'Clinical Pathology & Diagnostics',
    facilityName: 'Quest Diagnostics Clinical Lab · Sutter St',
    appointmentDate: '2026-11-02',
    appointmentTime: '08:15',
    visitType: 'Lab / Diagnostic',
    status: 'Confirmed',
    notes: '12-hour water-only fasting required prior to morning venous blood draw.',
  },
];

const FILTER_TABS: Array<{ label: string; value: 'ALL' | RecordCategory }> = [
  { label: 'All Records', value: 'ALL' },
  { label: 'Prescriptions', value: 'Prescription' },
  { label: 'Lab Reports', value: 'Blood / Lab Report' },
  { label: 'Discharge', value: 'Discharge Summary' },
  { label: 'Medical Reports', value: 'Medical Report' },
  { label: 'Certificates', value: 'Medical Certificate' },
];

type WorkspaceTab =
  | 'overview'
  | 'records'
  | 'schedule'
  | 'patient'
  | 'ai-suite';

type AiToolMode = 'assistant' | 'evidence' | 'care-network';

function formatReadableTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt.replace(/[_-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionAccount, setSessionAccount] = useState<SessionAccount | null>(() => {
    try {
      const saved = window.localStorage.getItem('carebridge-session-user');
      return saved ? (JSON.parse(saved) as SessionAccount) : null;
    } catch {
      return null;
    }
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showLoginPage, setShowLoginPage] = useState<boolean>(() => {
    try {
      return !window.localStorage.getItem('carebridge-session-user');
    } catch {
      return true;
    }
  });
  const [records, setRecords] = useState<MedicalRecord[]>(() =>
    INITIAL_SEED_RECORDS.map((r, i) => ({ ...r, id: `seed-${i + 1}` }))
  );
  const [medications, setMedications] = useState<MedicationReminder[]>(() =>
    INITIAL_SEED_MEDICATIONS.map((m, i) => ({ ...m, id: `med-seed-${i + 1}` }))
  );
  const [appointments, setAppointments] = useState<ClinicalAppointment[]>(() =>
    INITIAL_SEED_APPOINTMENTS.map((a, i) => ({ ...a, id: `appt-seed-${i + 1}` }))
  );
  const [scheduleSubTab, setScheduleSubTab] = useState<
    'all' | 'medications' | 'appointments'
  >('all');
  const [aiToolMode, setAiToolMode] = useState<AiToolMode>('assistant');
  const [patientProfile, setPatientProfile] = useState<PatientProfileData>(
    DEFAULT_PATIENT_PROFILE
  );
  const [activeFilter, setActiveFilter] = useState<'ALL' | RecordCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState<WorkspaceTab>('overview');
  const [recordsDisplayMode, setRecordsDisplayMode] = useState<'cards' | 'table'>(
    'table'
  );
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [isEmergencyIdOpen, setIsEmergencyIdOpen] = useState(false);
  const [isPitchDeckOpen, setIsPitchDeckOpen] = useState(false);
  const [showInlineDropzone, setShowInlineDropzone] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('carebridge-theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [selectedRecordForPreview, setSelectedRecordForPreview] =
    useState<MedicalRecord | null>(null);
  const [recentUploadNotice, setRecentUploadNotice] = useState<string | null>(null);

  const seededUsersRef = useRef<Set<string>>(new Set());
  const seededProfilesRef = useRef<Set<string>>(new Set());
  const seededMedsRef = useRef<Set<string>>(new Set());
  const seededApptsRef = useRef<Set<string>>(new Set());
  const localFileUrlsRef = useRef<Record<string, string>>({});

  // Sync dark mode class on <html> and persist preference
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('carebridge-theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDarkMode]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setShowLoginPage(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore /patients/{uid} when signed in
  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      if (sessionAccount) {
        setPatientProfile((prev) => ({
          ...prev,
          fullName: sessionAccount.displayName || DEFAULT_PATIENT_PROFILE.fullName,
          email: sessionAccount.email || DEFAULT_PATIENT_PROFILE.email,
        }));
      } else {
        setPatientProfile(DEFAULT_PATIENT_PROFILE);
      }
      return;
    }

    const patientDocRef = doc(db, 'patients', user.uid);
    const unsubscribe = onSnapshot(
      patientDocRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          if (!seededProfilesRef.current.has(user.uid)) {
            seededProfilesRef.current.add(user.uid);
            const initialProfile: PatientProfileData = {
              ...DEFAULT_PATIENT_PROFILE,
              ownerId: user.uid,
              fullName: (
                user.displayName?.trim() || DEFAULT_PATIENT_PROFILE.fullName
              ).slice(0, 120),
              email: (
                user.email?.trim() || DEFAULT_PATIENT_PROFILE.email
              ).slice(0, 160),
            };
            try {
              await setDoc(patientDocRef, {
                ...initialProfile,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(
                err,
                OperationType.CREATE,
                `patients/${user.uid}`
              );
            }
          }
          return;
        }

        const data = docSnap.data();
        setPatientProfile({
          ownerId: data.ownerId,
          fullName: data.fullName,
          mrn: data.mrn,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodType: data.bloodType,
          height: data.height,
          weight: data.weight,
          phone: data.phone,
          email: data.email,
          address: data.address,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          primaryPhysician: data.primaryPhysician,
          insuranceProvider: data.insuranceProvider,
          insurancePolicyNumber: data.insurancePolicyNumber,
          allergies: data.allergies,
          chronicConditions: data.chronicConditions,
          bloodPressure: data.bloodPressure,
          heartRate: data.heartRate,
          spO2: data.spO2,
          fastingGlucose: data.fastingGlucose,
          clinicalSummary: data.clinicalSummary,
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `patients/${user.uid}`);
      }
    );

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Subscribe to Firestore /records when signed in
  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setRecords(
        INITIAL_SEED_RECORDS.map((r, i) => ({ ...r, id: `seed-${i + 1}` }))
      );
      return;
    }

    const q = query(
      collection(db, 'records'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty && !seededUsersRef.current.has(user.uid)) {
          seededUsersRef.current.add(user.uid);
          try {
            for (let i = 0; i < INITIAL_SEED_RECORDS.length; i++) {
              const seed = INITIAL_SEED_RECORDS[i];
              const docId = `rec_${user.uid.slice(0, 8)}_${i + 1}`;
              await setDoc(doc(db, 'records', docId), {
                ownerId: user.uid,
                title: seed.title,
                fileName: seed.fileName,
                category: seed.category,
                fileType: seed.fileType,
                fileSize: seed.fileSize,
                uploadedAt: seed.uploadedAt,
                provider: seed.provider,
                status: seed.status,
                referenceId: seed.referenceId,
                notes: seed.notes || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'records');
          }
          return;
        }

        const loaded: MedicalRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: data.ownerId,
            title: data.title,
            fileName: data.fileName,
            category: data.category as RecordCategory,
            fileType: data.fileType as 'PDF' | 'JPG' | 'PNG',
            fileSize: data.fileSize,
            uploadedAt: data.uploadedAt,
            provider: data.provider,
            status: data.status as 'Verified' | 'Ready for Review',
            referenceId: data.referenceId,
            notes: data.notes || '',
            fileDataUrl: localFileUrlsRef.current[docSnap.id],
          };
        });

        loaded.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
        setRecords(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'records');
      }
    );

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Subscribe to Firestore /medications when signed in
  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setMedications(
        INITIAL_SEED_MEDICATIONS.map((m, i) => ({
          ...m,
          id: `med-seed-${i + 1}`,
        }))
      );
      return;
    }

    const q = query(
      collection(db, 'medications'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty && !seededMedsRef.current.has(user.uid)) {
          seededMedsRef.current.add(user.uid);
          try {
            for (let i = 0; i < INITIAL_SEED_MEDICATIONS.length; i++) {
              const seed = INITIAL_SEED_MEDICATIONS[i];
              const docId = `med_${user.uid.slice(0, 8)}_${i + 1}`;
              await setDoc(doc(db, 'medications', docId), {
                ownerId: user.uid,
                medicationName: seed.medicationName,
                dosage: seed.dosage,
                frequency: seed.frequency,
                scheduleTime: seed.scheduleTime,
                timeSlot: seed.timeSlot,
                instructions: seed.instructions,
                prescribedBy: seed.prescribedBy,
                refillsRemaining: seed.refillsRemaining,
                reminderEnabled: seed.reminderEnabled,
                takenToday: seed.takenToday,
                lastTakenDate: seed.lastTakenDate,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'medications');
          }
          return;
        }

        const loaded: MedicationReminder[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: data.ownerId,
            medicationName: data.medicationName,
            dosage: data.dosage,
            frequency: data.frequency as MedicationFrequency,
            scheduleTime: data.scheduleTime,
            timeSlot: data.timeSlot as MedicationTimeSlot,
            instructions: data.instructions,
            prescribedBy: data.prescribedBy,
            refillsRemaining: Number(data.refillsRemaining) || 0,
            reminderEnabled: Boolean(data.reminderEnabled),
            takenToday: Boolean(data.takenToday),
            lastTakenDate: data.lastTakenDate || '',
          };
        });

        loaded.sort((a, b) => a.scheduleTime.localeCompare(b.scheduleTime));
        setMedications(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'medications');
      }
    );

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Subscribe to Firestore /appointments when signed in
  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setAppointments(
        INITIAL_SEED_APPOINTMENTS.map((a, i) => ({
          ...a,
          id: `appt-seed-${i + 1}`,
        }))
      );
      return;
    }

    const q = query(
      collection(db, 'appointments'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty && !seededApptsRef.current.has(user.uid)) {
          seededApptsRef.current.add(user.uid);
          try {
            for (let i = 0; i < INITIAL_SEED_APPOINTMENTS.length; i++) {
              const seed = INITIAL_SEED_APPOINTMENTS[i];
              const docId = `appt_${user.uid.slice(0, 8)}_${i + 1}`;
              await setDoc(doc(db, 'appointments', docId), {
                ownerId: user.uid,
                title: seed.title,
                doctorName: seed.doctorName,
                specialty: seed.specialty,
                facilityName: seed.facilityName,
                appointmentDate: seed.appointmentDate,
                appointmentTime: seed.appointmentTime,
                visitType: seed.visitType,
                status: seed.status,
                notes: seed.notes,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'appointments');
          }
          return;
        }

        const loaded: ClinicalAppointment[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: data.ownerId,
            title: data.title,
            doctorName: data.doctorName,
            specialty: data.specialty,
            facilityName: data.facilityName,
            appointmentDate: data.appointmentDate,
            appointmentTime: data.appointmentTime,
            visitType: data.visitType as AppointmentVisitType,
            status: data.status as AppointmentStatus,
            notes: data.notes || '',
          };
        });

        loaded.sort((a, b) =>
          `${a.appointmentDate}_${a.appointmentTime}`.localeCompare(
            `${b.appointmentDate}_${b.appointmentTime}`
          )
        );
        setAppointments(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'appointments');
      }
    );

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleSavePatientProfile = async (updated: PatientProfileData) => {
    const cleanProfile: PatientProfileData = {
      ownerId: user?.uid || 'guest',
      fullName: updated.fullName.trim().slice(0, 120),
      mrn: patientProfile.mrn,
      dateOfBirth: updated.dateOfBirth.trim().slice(0, 40),
      gender: updated.gender.trim().slice(0, 40),
      bloodType: updated.bloodType.trim().slice(0, 16),
      height: updated.height.trim().slice(0, 32),
      weight: updated.weight.trim().slice(0, 32),
      phone: updated.phone.trim().slice(0, 64),
      email: updated.email.trim().slice(0, 160),
      address: updated.address.trim().slice(0, 300),
      emergencyContactName: updated.emergencyContactName.trim().slice(0, 160),
      emergencyContactPhone: updated.emergencyContactPhone.trim().slice(0, 64),
      primaryPhysician: updated.primaryPhysician.trim().slice(0, 160),
      insuranceProvider: updated.insuranceProvider.trim().slice(0, 160),
      insurancePolicyNumber: updated.insurancePolicyNumber.trim().slice(0, 80),
      allergies: updated.allergies.trim().slice(0, 1000),
      chronicConditions: updated.chronicConditions.trim().slice(0, 1000),
      bloodPressure: updated.bloodPressure.trim().slice(0, 40),
      heartRate: updated.heartRate.trim().slice(0, 40),
      spO2: updated.spO2.trim().slice(0, 40),
      fastingGlucose: updated.fastingGlucose.trim().slice(0, 40),
      clinicalSummary: updated.clinicalSummary.trim().slice(0, 4000),
    };

    if (user) {
      try {
        const { ownerId: _o, mrn: _m, ...mutableFields } = cleanProfile;
        await updateDoc(doc(db, 'patients', user.uid), {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `patients/${user.uid}`
        );
      }
    } else {
      setPatientProfile(cleanProfile);
    }
  };

  const handleRecordUploaded = async (payload: UploadedFilePayload) => {
    const todayIso = new Date().toISOString().split('T')[0];
    const randomRef = `CB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const recordId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const defaultNotes =
      payload.notes ||
      `Uploaded via CareBridge patient dashboard on ${todayIso}. Categorized under ${payload.category}.`;

    if (payload.fileDataUrl) {
      localFileUrlsRef.current[recordId] = payload.fileDataUrl;
    }

    const newRecord: MedicalRecord = {
      id: recordId,
      ownerId: user?.uid,
      title: formatReadableTitle(payload.fileName).slice(0, 230),
      fileName: payload.fileName.slice(0, 230),
      category: payload.category,
      fileType: payload.fileType,
      fileSize: payload.fileSize,
      uploadedAt: todayIso,
      provider: (
        payload.provider || 'Patient Direct Upload · CareBridge Portal'
      ).slice(0, 230),
      status: 'Ready for Review',
      referenceId: randomRef,
      notes: defaultNotes.slice(0, 4900),
      fileDataUrl: payload.fileDataUrl,
    };

    if (user) {
      try {
        await setDoc(doc(db, 'records', recordId), {
          ownerId: user.uid,
          title: newRecord.title,
          fileName: newRecord.fileName,
          category: newRecord.category,
          fileType: newRecord.fileType,
          fileSize: newRecord.fileSize,
          uploadedAt: newRecord.uploadedAt,
          provider: newRecord.provider,
          status: newRecord.status,
          referenceId: newRecord.referenceId,
          notes: newRecord.notes || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `records/${recordId}`);
      }
    } else {
      setRecords((prev) => [newRecord, ...prev]);
    }

    setRecentUploadNotice(
      `"${payload.fileName}" has been added to your medical records.`
    );
    window.setTimeout(() => {
      setRecentUploadNotice((current) =>
        current?.includes(payload.fileName) ? null : current
      );
    }, 6000);
  };

  const handleSaveRecordNotes = async (
    recordId: string,
    notesText: string,
    newStatus?: 'Verified' | 'Ready for Review'
  ) => {
    const targetRecord =
      records.find((r) => r.id === recordId) || selectedRecordForPreview;
    if (!targetRecord) return;

    const trimmed = notesText.trim().slice(0, 4900);
    const resolvedStatus = newStatus || targetRecord.status;

    if (user && targetRecord.ownerId === user.uid) {
      try {
        await updateDoc(doc(db, 'records', recordId), {
          notes: trimmed,
          status: resolvedStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `records/${recordId}`
        );
      }
    } else {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? { ...r, notes: trimmed, status: resolvedStatus }
            : r
        )
      );
    }

    setSelectedRecordForPreview((prev) =>
      prev && prev.id === recordId
        ? { ...prev, notes: trimmed, status: resolvedStatus }
        : prev
    );
  };

  // Medication Reminder Handlers
  const handleAddMedication = async (
    med: Omit<MedicationReminder, 'id' | 'ownerId'>
  ) => {
    const medId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanMed: MedicationReminder = {
      id: medId,
      ownerId: user?.uid,
      medicationName: med.medicationName.trim().slice(0, 120),
      dosage: med.dosage.trim().slice(0, 80),
      frequency: med.frequency,
      scheduleTime: med.scheduleTime.trim().slice(0, 16),
      timeSlot: med.timeSlot,
      instructions: med.instructions.trim().slice(0, 500),
      prescribedBy: med.prescribedBy.trim().slice(0, 160),
      refillsRemaining: Math.max(0, Math.min(99, Number(med.refillsRemaining) || 0)),
      reminderEnabled: Boolean(med.reminderEnabled),
      takenToday: Boolean(med.takenToday),
      lastTakenDate: med.lastTakenDate.trim().slice(0, 32),
    };

    if (user) {
      try {
        await setDoc(doc(db, 'medications', medId), {
          ownerId: user.uid,
          medicationName: cleanMed.medicationName,
          dosage: cleanMed.dosage,
          frequency: cleanMed.frequency,
          scheduleTime: cleanMed.scheduleTime,
          timeSlot: cleanMed.timeSlot,
          instructions: cleanMed.instructions,
          prescribedBy: cleanMed.prescribedBy,
          refillsRemaining: cleanMed.refillsRemaining,
          reminderEnabled: cleanMed.reminderEnabled,
          takenToday: cleanMed.takenToday,
          lastTakenDate: cleanMed.lastTakenDate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `medications/${medId}`);
      }
    } else {
      setMedications((prev) => [...prev, cleanMed]);
    }
  };

  const handleToggleMedicationTaken = async (med: MedicationReminder) => {
    const nextTaken = !med.takenToday;
    const todayIso = new Date().toISOString().split('T')[0];
    const nextLastTaken = nextTaken ? todayIso : med.lastTakenDate;

    if (user && med.ownerId === user.uid) {
      try {
        await updateDoc(doc(db, 'medications', med.id), {
          takenToday: nextTaken,
          lastTakenDate: nextLastTaken,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `medications/${med.id}`);
      }
    } else {
      setMedications((prev) =>
        prev.map((m) =>
          m.id === med.id
            ? { ...m, takenToday: nextTaken, lastTakenDate: nextLastTaken }
            : m
        )
      );
    }
  };

  const handleToggleMedicationReminder = async (med: MedicationReminder) => {
    const nextEnabled = !med.reminderEnabled;
    if (user && med.ownerId === user.uid) {
      try {
        await updateDoc(doc(db, 'medications', med.id), {
          reminderEnabled: nextEnabled,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `medications/${med.id}`);
      }
    } else {
      setMedications((prev) =>
        prev.map((m) =>
          m.id === med.id ? { ...m, reminderEnabled: nextEnabled } : m
        )
      );
    }
  };

  const handleDeleteMedication = async (med: MedicationReminder) => {
    if (user && med.ownerId === user.uid) {
      try {
        await deleteDoc(doc(db, 'medications', med.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `medications/${med.id}`);
      }
    } else {
      setMedications((prev) => prev.filter((m) => m.id !== med.id));
    }
  };

  // Clinical Appointment Handlers
  const handleAddAppointment = async (
    appt: Omit<ClinicalAppointment, 'id' | 'ownerId'>
  ) => {
    const apptId = `appt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanAppt: ClinicalAppointment = {
      id: apptId,
      ownerId: user?.uid,
      title: appt.title.trim().slice(0, 160),
      doctorName: appt.doctorName.trim().slice(0, 120),
      specialty: appt.specialty.trim().slice(0, 120),
      facilityName: appt.facilityName.trim().slice(0, 200),
      appointmentDate: appt.appointmentDate.trim().slice(0, 20),
      appointmentTime: appt.appointmentTime.trim().slice(0, 16),
      visitType: appt.visitType,
      status: appt.status,
      notes: appt.notes.trim().slice(0, 1000),
    };

    if (user) {
      try {
        await setDoc(doc(db, 'appointments', apptId), {
          ownerId: user.uid,
          title: cleanAppt.title,
          doctorName: cleanAppt.doctorName,
          specialty: cleanAppt.specialty,
          facilityName: cleanAppt.facilityName,
          appointmentDate: cleanAppt.appointmentDate,
          appointmentTime: cleanAppt.appointmentTime,
          visitType: cleanAppt.visitType,
          status: cleanAppt.status,
          notes: cleanAppt.notes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `appointments/${apptId}`);
      }
    } else {
      setAppointments((prev) => [...prev, cleanAppt]);
    }
  };

  const handleUpdateAppointmentStatus = async (
    appt: ClinicalAppointment,
    status: AppointmentStatus
  ) => {
    if (user && appt.ownerId === user.uid) {
      try {
        await updateDoc(doc(db, 'appointments', appt.id), {
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `appointments/${appt.id}`);
      }
    } else {
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status } : a))
      );
    }
  };

  const handleDeleteAppointment = async (appt: ClinicalAppointment) => {
    if (user && appt.ownerId === user.uid) {
      try {
        await deleteDoc(doc(db, 'appointments', appt.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `appointments/${appt.id}`);
      }
    } else {
      setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
    }
  };

  const handleDeleteRecord = async (record: MedicalRecord) => {
    if (user && record.ownerId === user.uid) {
      try {
        await deleteDoc(doc(db, 'records', record.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `records/${record.id}`);
      }
    } else {
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
    }
    if (selectedRecordForPreview?.id === record.id) {
      setSelectedRecordForPreview(null);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesCategory =
        activeFilter === 'ALL' || record.category === activeFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        record.title.toLowerCase().includes(q) ||
        record.fileName.toLowerCase().includes(q) ||
        record.category.toLowerCase().includes(q) ||
        record.provider.toLowerCase().includes(q) ||
        record.referenceId.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [records, activeFilter, searchQuery]);

  const dosesTakenToday = useMemo(
    () => medications.filter((m) => m.takenToday).length,
    [medications]
  );

  const confirmedAppointmentsCount = useMemo(
    () => appointments.filter((a) => a.status === 'Confirmed').length,
    [appointments]
  );

  const handleSessionSignIn = (account: SessionAccount) => {
    setSessionAccount(account);
    try {
      window.localStorage.setItem('carebridge-session-user', JSON.stringify(account));
    } catch {
      // ignore storage errors
    }
    setPatientProfile((prev) => ({
      ...prev,
      fullName: account.displayName || prev.fullName,
      email: account.email || prev.email,
    }));
    setShowLoginPage(false);
  };

  const handleSignOutAll = async () => {
    if (user) {
      await signOutUser();
    }
    setSessionAccount(null);
    try {
      window.localStorage.removeItem('carebridge-session-user');
    } catch {
      // ignore storage errors
    }
    setShowLoginPage(true);
  };

  const activeAccountLabel =
    user?.displayName ||
    user?.email ||
    sessionAccount?.displayName ||
    sessionAccount?.email ||
    null;

  if (showLoginPage && !user && !sessionAccount) {
    return (
      <LoginPage
        onContinueAsGuest={() => setShowLoginPage(false)}
        onSessionSignIn={handleSessionSignIn}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Top Bar Contract: Zone 1 (Brand wordmark) — Zone 2 (5 clean nav links) — Zone 3 (2 primary actions) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('overview');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 hover:text-teal-700 transition-colors"
        >
          CareBridge
        </a>

        {/* Zone 2: 5 Clean text navigation links */}
        <nav
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          aria-label="Primary Workspace Navigation"
        >
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'records', label: 'Medical Records' },
              { id: 'schedule', label: 'Care Schedule' },
              { id: 'patient', label: 'Health Profile' },
              { id: 'ai-suite', label: 'AI Care Suite' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'schedule') setScheduleSubTab('all');
                setActiveNav(item.id);
              }}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                activeNav === item.id
                  ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2 decoration-teal-600'
                  : 'hover:text-slate-900 hover:underline hover:underline-offset-8'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Top-right actions (Dark Mode Toggle + Upload Record + Login/Sign-Out) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsHeaderModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.25]" />
            <span>Upload Record</span>
          </button>

          {user || sessionAccount ? (
            <button
              type="button"
              onClick={handleSignOutAll}
              title={`Signed in as ${activeAccountLabel}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate max-w-[110px]">
                {activeAccountLabel?.split(' ')[0] || 'Sign out'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginPage(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-teal-600" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Calm Left Sidebar: Patient Identity + 5 Clear Sections + Allergy Notice */}
        <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col justify-between bg-white border-r border-slate-200/80 p-5 select-none">
          <div className="space-y-6">
            {/* Patient Identity Summary */}
            <div
              onClick={() => setActiveNav('patient')}
              className="p-3.5 rounded-xl bg-slate-50/90 hover:bg-teal-50/40 border border-slate-200/70 transition-colors cursor-pointer space-y-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {patientProfile.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {patientProfile.fullName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                    MRN {patientProfile.mrn} · {patientProfile.bloodType}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                <span>BP {patientProfile.bloodPressure.split(' ')[0]}</span>
                <span>·</span>
                <span>HR {patientProfile.heartRate}</span>
                <span>·</span>
                <span>SpO2 {patientProfile.spO2}</span>
              </div>
            </div>

            {/* 5 Calm, Non-Redundant Navigation Sections */}
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-slate-400 mb-2">
                Patient Portal
              </p>
              {(
                [
                  {
                    id: 'overview',
                    label: 'Daily Overview',
                    icon: Activity,
                    meta: 'Home',
                  },
                  {
                    id: 'records',
                    label: 'Medical Records',
                    icon: FolderKanban,
                    meta: String(records.length),
                  },
                  {
                    id: 'schedule',
                    label: 'Care Schedule',
                    icon: Calendar,
                    meta: `${dosesTakenToday}/${medications.length} Meds`,
                  },
                  {
                    id: 'patient',
                    label: 'Health Profile',
                    icon: UserRound,
                    meta: 'Chart',
                  },
                  {
                    id: 'ai-suite',
                    label: 'AI Care Suite',
                    icon: Sparkles,
                    meta: '3 Tools',
                  },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'schedule') setScheduleSubTab('all');
                      setActiveNav(item.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-teal-50/90 text-teal-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-teal-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span
                      className={`font-mono tabular-nums text-[11px] ${
                        active ? 'text-teal-700' : 'text-slate-400'
                      }`}
                    >
                      {item.meta}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quiet Clinical Allergy Alert + Emergency ID Trigger */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60 space-y-2">
              <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Recorded Allergies</span>
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {patientProfile.allergies}
              </p>
              <button
                type="button"
                onClick={() => setIsEmergencyIdOpen(true)}
                className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-white/90 hover:bg-white text-red-700 border border-amber-200/90 text-[11px] font-semibold transition-colors cursor-pointer text-center"
              >
                Open Emergency Medical ID
              </button>
            </div>
          </div>

          {/* Bottom Cloud Sync Indicator */}
          <div className="pt-4 border-t border-slate-200/80 px-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 truncate">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="truncate">
                {activeAccountLabel || 'Guest Session'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {user
                ? 'Synced with Cloud Firestore'
                : sessionAccount
                ? 'Authenticated Patient Session'
                : 'Sign in to sync across devices'}
            </p>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-8">
          {/* Mobile Navigation Bar */}
          <div className="flex md:hidden items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'records', label: 'Records' },
                { id: 'schedule', label: 'Schedule' },
                { id: 'patient', label: 'Profile' },
                { id: 'ai-suite', label: 'AI Suite' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeNav === item.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Upload Notification Toast */}
          {recentUploadNotice && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-sm"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{recentUploadNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setRecentUploadNotice(null)}
                className="p-1 text-teal-700 hover:bg-teal-100 rounded-md transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* =====================================================================
              VIEW 1: CALM, SOPHISTICATED PATIENT OVERVIEW (DEFAULT HOME)
             ===================================================================== */}
          {activeNav === 'overview' && (
            <div className="space-y-8">
              {/* Section 1: Patient Welcome & Unified Vitals Strip */}
              <section className="bg-white rounded-xl border border-slate-200/90 overflow-hidden">
                <div className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-teal-700">
                        Patient Care Overview
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        MRN {patientProfile.mrn}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{patientProfile.primaryPhysician}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Good day, {patientProfile.fullName}
                    </h1>
                    <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                      {patientProfile.clinicalSummary}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsPitchDeckOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Presentation className="w-3.5 h-3.5 text-teal-600" />
                      <span>Pitch Deck (PPT)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEmergencyIdOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      <span>Emergency ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNav('patient')}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Edit Health Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNav('ai-suite')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Ask Clinical AI</span>
                    </button>
                  </div>
                </div>

                {/* Clean Hairline-Divided Vital Signs & Status Bar (Single Elevation, No Nested Cards) */}
                <div className="border-t border-slate-200/80 bg-slate-50/60 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:divide-x divide-slate-200/80 text-xs">
                  <div className="sm:pr-4">
                    <span className="text-slate-400 block">Blood Pressure &amp; HR</span>
                    <span className="font-semibold text-slate-900 font-mono tabular-nums mt-0.5 block text-sm">
                      {patientProfile.bloodPressure} · {patientProfile.heartRate}
                    </span>
                  </div>
                  <div className="sm:px-4">
                    <span className="text-slate-400 block">Blood Type &amp; SpO2</span>
                    <span className="font-semibold text-slate-900 font-mono tabular-nums mt-0.5 block text-sm">
                      {patientProfile.bloodType} · {patientProfile.spO2}
                    </span>
                  </div>
                  <div className="sm:px-4">
                    <span className="text-slate-400 block">Today&apos;s Medications</span>
                    <span className="font-semibold text-teal-700 font-mono tabular-nums mt-0.5 block text-sm">
                      {dosesTakenToday} of {medications.length} Doses Taken
                    </span>
                  </div>
                  <div className="sm:pl-4">
                    <span className="text-slate-400 block">Upcoming Visits</span>
                    <span className="font-semibold text-slate-900 font-mono tabular-nums mt-0.5 block text-sm">
                      {confirmedAppointmentsCount} Confirmed
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 2: Today's Care Plan (2 Balanced Columns: Medicine Reminders + Upcoming Appointments) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Column 1: Today's Medicine Reminders (6 cols) */}
                <section
                  aria-label="Daily Medicine Reminders"
                  className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 flex flex-col justify-between"
                >
                  <div>
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Medicine Reminders
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Check off your scheduled daily prescriptions
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleSubTab('medications');
                          setActiveNav('schedule');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer whitespace-nowrap"
                      >
                        <span>Manage All</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {medications.slice(0, 3).map((med) => (
                        <div
                          key={med.id}
                          className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200/80 flex flex-col items-center justify-center shrink-0 font-mono tabular-nums">
                              <span className="text-[10px] font-semibold text-slate-500">
                                {med.timeSlot.slice(0, 4)}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {med.scheduleTime}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-semibold truncate ${
                                  med.takenToday
                                    ? 'text-slate-400 line-through'
                                    : 'text-slate-900'
                                }`}
                              >
                                {med.medicationName}{' '}
                                <span className="font-mono tabular-nums text-xs text-teal-700 font-medium">
                                  {med.dosage}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {med.frequency} · {med.instructions}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleMedicationTaken(med)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                              med.takenToday
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-teal-600 text-white hover:bg-teal-700'
                            }`}
                          >
                            {med.takenToday ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Taken</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-3.5 h-3.5" />
                                <span>Mark Taken</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Need to add a new prescription alarm?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleSubTab('medications');
                        setActiveNav('schedule');
                      }}
                      className="font-semibold text-teal-700 hover:underline cursor-pointer"
                    >
                      + Add Reminder
                    </button>
                  </div>
                </section>

                {/* Column 2: Upcoming Clinical Appointments (6 cols) */}
                <section
                  aria-label="Upcoming Clinical Appointments"
                  className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 flex flex-col justify-between"
                >
                  <div>
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Upcoming Appointments
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Scheduled clinic consultations, telehealth &amp; lab draws
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleSubTab('appointments');
                          setActiveNav('schedule');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer whitespace-nowrap"
                      >
                        <span>Full Schedule</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {appointments.slice(0, 3).map((appt) => (
                        <div
                          key={appt.id}
                          onClick={() => {
                            setScheduleSubTab('appointments');
                            setActiveNav('schedule');
                          }}
                          className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-lg bg-teal-50/80 border border-teal-200/70 flex flex-col items-center justify-center shrink-0 font-mono tabular-nums">
                              <span className="text-[10px] font-bold text-teal-700">
                                {appt.appointmentDate.slice(5, 7)}/
                                {appt.appointmentDate.slice(8, 10)}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {appt.appointmentTime}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {appt.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {appt.doctorName} · {appt.visitType}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-semibold shrink-0 ${
                              appt.status === 'Confirmed'
                                ? 'text-emerald-700'
                                : appt.status === 'Completed'
                                ? 'text-sky-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {appt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Planning a specialist or lab visit?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleSubTab('appointments');
                        setActiveNav('schedule');
                      }}
                      className="font-semibold text-teal-700 hover:underline cursor-pointer"
                    >
                      + Book Appointment
                    </button>
                  </div>
                </section>
              </div>

              {/* Section 3: Recent Medical Documents Table (Clean, High-Scannability) */}
              <section
                aria-label="Recent Medical Records"
                className="bg-white rounded-xl border border-slate-200/90 overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Recent Medical Records ({records.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click any document to open the embedded PDF, lab report, or radiograph viewer
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsHeaderModalOpen(true)}
                      className="px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      + Upload Document
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNav('records')}
                      className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>Open Document Vault</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-semibold text-slate-500">
                        <th className="py-3 pl-6 pr-4">Document Title</th>
                        <th className="py-3 px-4">Category &amp; Format</th>
                        <th className="py-3 px-4 hidden md:table-cell">
                          Issuing Provider
                        </th>
                        <th className="py-3 px-4 text-right">Date</th>
                        <th className="py-3 pl-4 pr-6 text-right">Viewer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {records.slice(0, 4).map((record) => (
                        <tr
                          key={record.id}
                          onClick={() => setSelectedRecordForPreview(record)}
                          className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 pl-6 pr-4">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors truncate max-w-xs sm:max-w-md">
                                  {record.title}
                                </p>
                                <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                                  {record.fileName} · {record.referenceId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                            <span className="font-medium text-slate-800">
                              {record.category}
                            </span>{' '}
                            · {record.fileType} ({record.fileSize})
                          </td>
                          <td className="py-3.5 px-4 hidden md:table-cell text-xs text-slate-600 truncate max-w-[220px]">
                            {record.provider}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap text-xs text-slate-600 font-mono tabular-nums">
                            {record.uploadedAt}
                          </td>
                          <td className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 group-hover:underline">
                              <Eye className="w-3.5 h-3.5" />
                              <span>View File</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* =====================================================================
              VIEW 2: DEDICATED MEDICAL RECORDS VAULT
             ===================================================================== */}
          {activeNav === 'records' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Medical Records Vault
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Inspect your clinical PDFs, lab reports, prescriptions, and diagnostic radiographs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInlineDropzone((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-600" />
                  <span>
                    {showInlineDropzone ? 'Hide Upload Dropzone' : 'Show Drag & Drop Uploader'}
                  </span>
                </button>
              </div>

              {showInlineDropzone && (
                <UploadRecordCard
                  onRecordUploaded={(payload) => {
                    handleRecordUploaded(payload);
                    setShowInlineDropzone(false);
                  }}
                  className="w-full"
                />
              )}

              <section
                aria-labelledby="records-section-heading"
                className="bg-white rounded-xl border border-slate-200/90 overflow-hidden"
              >
                {/* Clean Single Toolbar */}
                <div className="p-5 sm:p-6 border-b border-slate-200/80 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Category Filter Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                      {FILTER_TABS.map((tab) => {
                        const isActive = activeFilter === tab.value;
                        const count =
                          tab.value === 'ALL'
                            ? records.length
                            : records.filter((r) => r.category === tab.value)
                                .length;

                        return (
                          <button
                            key={tab.value}
                            type="button"
                            onClick={() => setActiveFilter(tab.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={`font-mono tabular-nums text-[11px] ${
                                isActive
                                  ? 'text-teal-700 font-semibold'
                                  : 'text-slate-400'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Search + View Mode Switcher */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 sm:w-60">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search title or provider..."
                          className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600"
                        />
                      </div>

                      <AudioRecorderButton
                        compact
                        onTranscriptionComplete={(transcript) =>
                          setSearchQuery(transcript)
                        }
                      />

                      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setRecordsDisplayMode('table')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                            recordsDisplayMode === 'table'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>List</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordsDisplayMode('cards')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                            recordsDisplayMode === 'cards'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Grid</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Records Content */}
                {filteredRecords.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-900">
                      No matching clinical records found
                    </p>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      No documents match your current filter criteria.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFilter('ALL');
                          setSearchQuery('');
                        }}
                        className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Reset filters
                      </button>
                    </div>
                  </div>
                ) : recordsDisplayMode === 'cards' ? (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredRecords.map((record) => (
                      <article
                        key={record.id}
                        onClick={() => setSelectedRecordForPreview(record)}
                        className="group bg-white rounded-xl border border-slate-200/90 hover:border-teal-600 p-5 transition-all cursor-pointer flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-teal-700">
                              {record.category}
                            </span>
                            <span className="font-mono tabular-nums">
                              {record.referenceId}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1">
                            {record.title}
                          </h3>

                          <p className="text-xs text-slate-500 truncate">
                            {record.provider}
                          </p>

                          {record.notes && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1">
                              {record.notes}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="font-mono tabular-nums">
                            {record.fileType} · {record.fileSize} · {record.uploadedAt}
                          </span>

                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedRecordForPreview(record)}
                              className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-md transition-colors"
                            >
                              Open Viewer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(record)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              aria-label={`Delete ${record.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-semibold text-slate-500">
                          <th className="py-3 pl-6 pr-4">Document</th>
                          <th className="py-3 px-4">Category &amp; Format</th>
                          <th className="py-3 px-4 hidden xl:table-cell">
                            Issuing Provider
                          </th>
                          <th className="py-3 px-4 text-right">Date Uploaded</th>
                          <th className="py-3 pl-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredRecords.map((record) => (
                          <tr
                            key={record.id}
                            onClick={() => setSelectedRecordForPreview(record)}
                            className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                          >
                            <td className="py-4 pl-6 pr-4">
                              <div className="flex items-start gap-3">
                                <FileText className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors truncate max-w-xs sm:max-w-sm">
                                    {record.title}
                                  </p>
                                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                    <span className="truncate max-w-[190px]">
                                      {record.fileName}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono tabular-nums">
                                      {record.referenceId}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600">
                              <span className="font-medium text-slate-800">
                                {record.category}
                              </span>{' '}
                              · {record.fileType} ·{' '}
                              <span className="font-mono tabular-nums">
                                {record.fileSize}
                              </span>
                            </td>

                            <td className="py-4 px-4 hidden xl:table-cell text-xs text-slate-600 truncate max-w-[230px]">
                              {record.provider}
                            </td>

                            <td className="py-4 px-4 text-right whitespace-nowrap text-xs text-slate-600 font-mono tabular-nums">
                              {record.uploadedAt}
                            </td>

                            <td
                              className="py-4 pl-4 pr-6 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedRecordForPreview(record)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Inspect</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(record)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Remove record"
                                  aria-label={`Remove ${record.title}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* =====================================================================
              VIEW 3: CARE SCHEDULE (MEDICINE REMINDERS & APPOINTMENTS)
             ===================================================================== */}
          {activeNav === 'schedule' && (
            <CareScheduleHub
              key={scheduleSubTab}
              medications={medications}
              appointments={appointments}
              patientAllergies={patientProfile.allergies}
              initialTab={scheduleSubTab}
              onAddMedication={handleAddMedication}
              onToggleMedicationTaken={handleToggleMedicationTaken}
              onToggleMedicationReminder={handleToggleMedicationReminder}
              onDeleteMedication={handleDeleteMedication}
              onAddAppointment={handleAddAppointment}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onDeleteAppointment={handleDeleteAppointment}
              isCloudSynced={Boolean(user)}
            />
          )}

          {/* =====================================================================
              VIEW 4: HEALTH PROFILE & PATIENT CHART
             ===================================================================== */}
          {activeNav === 'patient' && (
            <PatientDetailsPage
              profile={patientProfile}
              records={records}
              onSaveProfile={handleSavePatientProfile}
              onOpenUploadModal={() => setIsHeaderModalOpen(true)}
              onInspectRecord={(rec) => setSelectedRecordForPreview(rec)}
              isCloudSynced={Boolean(user)}
            />
          )}

          {/* =====================================================================
              VIEW 5: UNIFIED AI CARE SUITE (ASSISTANT + EVIDENCE + CARE LOCATIONS)
             ===================================================================== */}
          {activeNav === 'ai-suite' && (
            <div className="space-y-6">
              {/* Clean AI Suite Header with Segmented Tool Switcher */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    AI Clinical Care Suite
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consult the Gemini health advisor, verify biomarker evidence, or locate nearby pharmacies and diagnostic labs.
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                  {(
                    [
                      {
                        id: 'assistant',
                        label: 'Clinical AI Advisor',
                        icon: MessageSquare,
                      },
                      {
                        id: 'evidence',
                        label: 'Medical Evidence Search',
                        icon: Globe,
                      },
                      {
                        id: 'care-network',
                        label: 'Nearby Pharmacies & Labs',
                        icon: MapPin,
                      },
                    ] as const
                  ).map((tool) => {
                    const Icon = tool.icon;
                    const active = aiToolMode === tool.id;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => setAiToolMode(tool.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-teal-600" />
                        <span>{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-8">
                  {aiToolMode === 'assistant' && (
                    <CareBridgeChatbot user={user} records={records} />
                  )}
                  {aiToolMode === 'evidence' && <ClinicalSearchExplorer />}
                  {aiToolMode === 'care-network' && <CareTeamMapsFinder />}
                </div>

                {/* Calm Reference Rail */}
                <div className="xl:col-span-4 space-y-5">
                  <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Your Medical Records ({records.length})
                        </h3>
                        <p className="text-xs text-slate-500">
                          Click any file to open the PDF/image viewer
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                      {records.map((rec) => (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={() => setSelectedRecordForPreview(rec)}
                          className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {rec.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span>{rec.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {rec.uploadedAt}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Clean Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              CareBridge Health Systems
            </span>
            <span aria-hidden="true">·</span>
            <span>Patient Health Record &amp; Care Coordination</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsPitchDeckOpen(true)}
              className="font-semibold text-teal-700 hover:underline cursor-pointer"
            >
              Open 8-Slide Hackathon Pitch Deck
            </button>
            <span aria-hidden="true">·</span>
            <span>Cloud Firestore Encrypted Vault</span>
          </div>
        </div>
      </footer>

      {/* Header "Upload Record" Modal Instance */}
      <UploadRecordModal
        isOpen={isHeaderModalOpen}
        onClose={() => setIsHeaderModalOpen(false)}
        onUploadComplete={(payload) => {
          setIsHeaderModalOpen(false);
          handleRecordUploaded(payload);
        }}
      />

      {/* Record Inspection Modal with Embedded PDF / Image Document Viewer */}
      <RecordInspectionModal
        record={selectedRecordForPreview}
        patientProfile={patientProfile}
        onClose={() => setSelectedRecordForPreview(null)}
        onSaveNotes={handleSaveRecordNotes}
        onCreateReminderFromRecord={handleAddMedication}
      />

      {/* Emergency Medical ID & Paramedic Handover Card Modal */}
      <EmergencyMedicalIdModal
        isOpen={isEmergencyIdOpen}
        onClose={() => setIsEmergencyIdOpen(false)}
        profile={patientProfile}
        medications={medications}
        appointments={appointments}
      />

      {/* Interactive 8-Slide Hackathon Pitch Deck Presenter Modal */}
      <PitchDeckModal
        isOpen={isPitchDeckOpen}
        onClose={() => setIsPitchDeckOpen(false)}
      />
    </div>
  );
}
