import { DocumentType, Patient, ReadinessStatus } from "@/lib/types";

const requiredDocuments: DocumentType[] = [
  "passport",
  "consent_form",
  "medical_report",
  "treatment_image",
  "payment_confirmation",
];

export function computeCompliance(patient: Patient) {
  const uploadedTypes = new Set(patient.documents.map((d) => d.type));
  const missing: string[] = [];

  requiredDocuments.forEach((docType) => {
    if (!uploadedTypes.has(docType)) {
      missing.push(docType.replace("_", " "));
    }
  });

  if (patient.doctorReviewStatus !== "approved") missing.push("doctor review approval");
  if (!patient.coordinatorAssigned) missing.push("coordinator assignment");

  const passedCount = 7 - missing.length;
  const score = Math.max(0, Math.round((passedCount / 7) * 100));
  const readinessStatus: ReadinessStatus =
    score >= 85 ? "ready" : score >= 50 ? "incomplete" : "critical";

  return {
    complianceScore: score,
    readinessStatus,
    missingItems: missing,
  };
}
