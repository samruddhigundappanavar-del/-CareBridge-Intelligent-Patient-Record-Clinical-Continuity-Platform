# CareBridge Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Catch-All**: Any path not explicitly matched under `/records/{recordId}`, `/chatMessages/{messageId}`, `/patients/{patientId}`, `/medications/{medicationId}`, or `/appointments/{appointmentId}` is denied for all reads and writes.
2. **Identity Ownership (`ownerId`)**: Every document in `/records/{recordId}`, `/chatMessages/{messageId}`, `/patients/{patientId}`, `/medications/{medicationId}`, and `/appointments/{appointmentId}` must have `ownerId == request.auth.uid`. Furthermore, `/patients/{patientId}` enforces `patientId == request.auth.uid`. All `get` operations allow `(resource == null || existing().ownerId == request.auth.uid)` so existence checks succeed for owners.
3. **Strict Key Allowlisting**:
   - `MedicalRecord` documents must contain exact required keys: `['ownerId', 'title', 'fileName', 'category', 'fileType', 'fileSize', 'uploadedAt', 'provider', 'status', 'referenceId', 'notes', 'createdAt', 'updatedAt']`.
   - `ChatMessage` documents must contain exact required keys: `['ownerId', 'role', 'text', 'modelUsed', 'assistantPersona', 'createdAt']`.
   - `PatientProfile` documents must contain exact required keys: `['ownerId', 'fullName', 'mrn', 'dateOfBirth', 'gender', 'bloodType', 'height', 'weight', 'phone', 'email', 'address', 'emergencyContactName', 'emergencyContactPhone', 'primaryPhysician', 'insuranceProvider', 'insurancePolicyNumber', 'allergies', 'chronicConditions', 'bloodPressure', 'heartRate', 'spO2', 'fastingGlucose', 'clinicalSummary', 'createdAt', 'updatedAt']`.
   - `MedicationReminder` documents must contain exact required keys: `['ownerId', 'medicationName', 'dosage', 'frequency', 'scheduleTime', 'timeSlot', 'instructions', 'prescribedBy', 'refillsRemaining', 'reminderEnabled', 'takenToday', 'lastTakenDate', 'createdAt', 'updatedAt']`.
   - `ClinicalAppointment` documents must contain exact required keys: `['ownerId', 'title', 'doctorName', 'specialty', 'facilityName', 'appointmentDate', 'appointmentTime', 'visitType', 'status', 'notes', 'createdAt', 'updatedAt']`.
4. **Temporal Integrity**: `createdAt == request.time` on create; `updatedAt == request.time` and `createdAt == resource.data.createdAt` on update.
5. **String Size Bounds & Enum Guards**: All string fields have explicit `.size()` maximums and enum fields are validated against strict allowlists.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null`, creating `/records/rec_1` or `/medications/med_1` -> `PERMISSION_DENIED`.
2. **Cross-User Spoofing on Create**: `auth.uid = 'user_a'`, payload `ownerId: 'user_b'` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection**: Adding `isAdmin: true` to `/records/rec_1`, `/medications/med_1`, or `/appointments/appt_1` -> `PERMISSION_DENIED`.
4. **Forged Client Timestamp**: Setting `createdAt` to a past timestamp instead of `request.time` -> `PERMISSION_DENIED`.
5. **ID Poisoning Attack**: Document ID containing special characters or > 128 chars -> `PERMISSION_DENIED`.
6. **Denial-of-Wallet Oversized String**: `notes` string > 5000 chars -> `PERMISSION_DENIED`.
7. **Invalid Category or VisitType Enum**: `category: 'HackedCategory'` or `visitType: 'InvalidVisit'` -> `PERMISSION_DENIED`.
8. **Ownership Hijack on Update**: Mutating `ownerId` during an update on `/medications/med_1` or `/appointments/appt_1` -> `PERMISSION_DENIED`.
9. **Immutable `createdAt` or `mrn` Mutation**: Changing `createdAt` or `mrn` during an update -> `PERMISSION_DENIED`.
10. **Unauthorized Cross-User List Query**: Listing `/medications` or `/appointments` without filtering `ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
11. **Chat Message Mutation**: Attempting to `update` an immutable `/chatMessages/{messageId}` document -> `PERMISSION_DENIED`.
12. **Cross-User Patient Profile Read**: `auth.uid = 'user_b'` attempting `get` on `/patients/user_a` -> `PERMISSION_DENIED`.
