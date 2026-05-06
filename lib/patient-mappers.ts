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
  };
}
