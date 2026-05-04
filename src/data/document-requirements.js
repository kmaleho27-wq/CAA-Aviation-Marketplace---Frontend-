// Document requirements per SACAA discipline.
//
// Drives both:
//   1. The contractor's "Compliance Documents" checklist (mobile/Profile.jsx)
//      — they see what's needed to clear admin verification.
//   2. The admin's pending-personnel card (admin/KYC.jsx) — uses the
//      same list to highlight which docs are missing.
//
// Each entry's `type` MUST be a valid value of the document_type enum
// (0001_init.sql). Adding a new doc type means a migration.

export const DOC_REQUIREMENTS = {
  flight_crew: [
    { type: 'Personnel Licence',    label: 'Pilot Licence (Part 61)',  hint: 'PPL / CPL / ATPL — official SACAA card' },
    { type: 'Medical Certificate',  label: 'Class 1 Medical',          hint: 'Issued by a SACAA DAME' },
    { type: 'Personnel Licence',    label: 'Type Rating (each aircraft)', hint: 'Add one per type — B737, A320 etc.' },
  ],
  national_pilot: [
    { type: 'Personnel Licence',    label: 'NPL (Part 62)',            hint: 'National Pilot Licence card' },
    { type: 'Medical Certificate',  label: 'Class 4 Medical',          hint: 'Recreational pilot medical' },
  ],
  flight_engineer: [
    { type: 'Personnel Licence',    label: 'Flight Engineer Licence (Part 63)', hint: 'FE licence card' },
    { type: 'Medical Certificate',  label: 'Class 1 Medical',          hint: 'Required for FE duties' },
    { type: 'Personnel Licence',    label: 'Type Rating',              hint: 'B747 / A340 etc.' },
  ],
  cabin_crew: [
    { type: 'Personnel Licence',    label: 'Cabin Crew Member Licence (Part 64)', hint: 'CCM licence card' },
    { type: 'Medical Certificate',  label: 'Class 2 Medical',          hint: 'Required for cabin duties' },
    { type: 'Personnel Licence',    label: 'SEP Currency',             hint: 'Safety & Emergency Procedures — last 12 months' },
    { type: 'Personnel Licence',    label: 'CRM Certificate',          hint: 'Crew Resource Management — current' },
  ],
  atc: [
    { type: 'Personnel Licence',    label: 'ATC Licence (Part 65)',    hint: 'Approach / Aerodrome / Enroute' },
    { type: 'Medical Certificate',  label: 'Class 2 or 3 Medical',     hint: 'Per rating category' },
    { type: 'Personnel Licence',    label: 'Rating Endorsement',       hint: 'Tower / Approach / Area sign-off' },
  ],
  ame: [
    { type: 'Personnel Licence',    label: 'AME Licence (Part 66)',    hint: 'Cat A / B1 / B2 / C — both sides' },
    { type: 'Organisation Cert',    label: 'AMO Authorisation Letter', hint: 'From your Part 145 AMO' },
  ],
  aviation_medical: [
    { type: 'Personnel Licence',    label: 'DAME Authorisation (Part 67)', hint: 'SACAA designation letter' },
    { type: 'Personnel Licence',    label: 'Medical Practitioner Reg.',    hint: 'HPCSA registration card' },
  ],
  glider_pilot: [
    { type: 'Personnel Licence',    label: 'Glider Pilot Licence (Part 68)', hint: 'SACAA card' },
    { type: 'Medical Certificate',  label: 'Class 4 Medical',          hint: 'Recreational' },
  ],
  balloon_pilot: [
    { type: 'Personnel Licence',    label: 'Balloon Pilot Licence (Part 69)', hint: 'SACAA card' },
    { type: 'Medical Certificate',  label: 'Class 4 Medical',          hint: 'Recreational' },
  ],
  rpas_pilot: [
    { type: 'Personnel Licence',    label: 'RPL (Part 71)',            hint: 'Remote Pilot Licence' },
    { type: 'Personnel Licence',    label: 'BVLOS Approval',           hint: 'Only if you operate beyond visual line of sight' },
    { type: 'Organisation Cert',    label: 'RPAS Operator Certificate',hint: 'If commercial — RPAS OC from SACAA' },
  ],
  non_licensed: [
    { type: 'Personnel Licence',    label: 'Employer Letter',          hint: 'On airport letterhead — confirms your role' },
    { type: 'Personnel Licence',    label: 'Background / Security Check', hint: 'ID document or airport security clearance' },
  ],
};

export function getDocRequirements(discipline) {
  return DOC_REQUIREMENTS[discipline] || [];
}
