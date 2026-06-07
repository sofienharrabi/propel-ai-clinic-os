import { Patient, PatientDocument } from "@/lib/types";
import { formatDistanceToNowStrict } from "date-fns";

interface PatientRow {
  id: string;
  clinic_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  nationality: string;
  treatment_type: string;
  stage: Patient["stage"];
  risk_score: number;
  compliance_score: number;
  readiness_status: Patient["readinessStatus"];
  revenue_estimate: number;
  coordinator_name: string | null;
  notes: string | null;
  doctor_note: string | null;
  timeline_status: string | null;
  ai_insights: string | null;
  booking_probability: number;
  doctor_review_status: Patient["doctorReviewStatus"];
  sync_ready: boolean;
  updated_at: string;
  // USHAŞ fields
  passport_number?: string | null;
  arrival_date?: string | null;
  departure_date?: string | null;
  emergency_contact?: string | null;
  treatment_outcome?: string | null;
  payment_status?: string | null;
  followup_scheduled?: boolean;
  // Archive fields
  archived?: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  stage_before_archive?: string | null;
  patient_documents?: {
    id: string;
    document_type: PatientDocument["type"];
    file_path: string;
    status: "uploaded" | "verified" | "rejected";
    verified: boolean;
    uploaded_at: string;
  }[];
}

export function toPatient(row: PatientRow): Patient {
  const documents: PatientDocument[] = (row.patient_documents ?? []).map((doc) => ({
    id: doc.id,
    type: doc.document_type,
    filename: doc.file_path.split("/").pop() ?? doc.file_path,
    uploadedAt: doc.uploaded_at,
    verified: doc.verified,
    status: doc.status,
  }));

  const allowedStages = [
    "New Lead",
    "AI Qualified",
    "Coordinator Review",
    "Doctor Review",
    "Awaiting Documents",
    "Treatment Approved",
    "Visa Preparation",
    "Arrival Scheduled",
    "In Treatment",
    "Post Treatment Follow-up",
    "Completed",
  ] as Patient["stage"][];

  const stageBeforeArchive =
    row.stage_before_archive && allowedStages.includes(row.stage_before_archive as Patient["stage"])
      ? (row.stage_before_archive as Patient["stage"])
      : null;

  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    nationality: row.nationality,
    treatmentType: row.treatment_type,
    riskScore: row.risk_score,
    complianceScore: row.compliance_score,
    readinessStatus: row.readiness_status,
    revenueEstimate: Number(row.revenue_estimate),
    coordinatorAssigned: row.coordinator_name,
    notes: row.notes,
    doctorNote: row.doctor_note,
    lastActivity: formatDistanceToNowStrict(new Date(row.updated_at), { addSuffix: true }),
    missingDocuments: [],
    timelineStatus: row.timeline_status ?? "No timeline updates yet",
    aiInsights: row.ai_insights ?? "No AI insight generated yet",
    bookingProbability: row.booking_probability,
    doctorReviewStatus: row.doctor_review_status,
    stage: row.stage,
    syncReady: row.sync_ready,
    documents,
    // USHAŞ fields
    passportNumber: row.passport_number ?? null,
    arrivalDate: row.arrival_date ?? null,
    departureDate: row.departure_date ?? null,
    emergencyContact: row.emergency_contact ?? null,
    treatmentOutcome: row.treatment_outcome ?? null,
    paymentStatus: row.payment_status ?? null,
    followupScheduled: row.followup_scheduled ?? false,
    // Archive fields
    archived: row.archived ?? false,
    archivedAt: row.archived_at ?? null,
    archivedBy: row.archived_by ?? null,
    stageBeforeArchive,
  };
}
