export type UserRole =
  | "admin"
  | "coordinator"
  | "doctor"
  | "secretary"
  | "compliance_manager";

export type PipelineStage =
  | "New Lead"
  | "AI Qualified"
  | "Coordinator Review"
  | "Doctor Review"
  | "Awaiting Documents"
  | "Treatment Approved"
  | "Visa Preparation"
  | "Arrival Scheduled"
  | "In Treatment"
  | "Post Treatment Follow-up"
  | "Completed";

export type DocumentType =
  | "passport"
  | "consent_form"
  | "medical_report"
  | "treatment_image"
  | "payment_confirmation"
  | "translation"
  | "invoice";

export type ReadinessStatus = "critical" | "incomplete" | "ready";
export type DoctorReviewStatus = "pending" | "approved" | "rejected";
export type SubscriptionStatus = "trial" | "active" | "suspended";

export interface PatientDocument {
  id: string;
  type: DocumentType;
  filename: string;
  uploadedAt: string;
  verified: boolean;
  status: "uploaded" | "verified" | "rejected";
}

export interface AuditEvent {
  id: string;
  patientId: string;
  userId: string | null;
  actor: string;
  action: string;
  description: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  nationality: string;
  treatmentType: string;
  riskScore: number;
  complianceScore: number;
  readinessStatus: ReadinessStatus;
  revenueEstimate: number;
  clinicId: string;
  coordinatorAssigned: string | null;
  notes: string | null;
  doctorNote: string | null;
  lastActivity: string;
  missingDocuments: string[];
  timelineStatus: string;
  aiInsights: string;
  bookingProbability: number;
  doctorReviewStatus: DoctorReviewStatus;
  stage: PipelineStage;
  syncReady: boolean;
  documents: PatientDocument[];
  // USHAŞ compliance fields
  passportNumber: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  emergencyContact: string | null;
  treatmentOutcome: string | null;
  paymentStatus: string | null;
  followupScheduled: boolean;
  // Archive fields
  archived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
  stageBeforeArchive?: PipelineStage | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type:
    | "missing_documents"
    | "doctor_review_requested"
    | "doctor_review_overdue"
    | "sync_failed"
    | "ready_for_official_workflow";
  patientId: string | null;
  readAt: string | null;
  createdAt: string;
}
