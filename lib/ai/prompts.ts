import { Patient } from "@/lib/types";

export function patientSummaryPrompt(patient: Patient) {
  return `Create a concise coordination summary for patient ${patient.name}, treatment ${patient.treatmentType}, compliance ${patient.complianceScore}%. Use safe healthcare wording and avoid diagnosis claims.`;
}

export function coordinatorReplyPrompt(patient: Patient, language: string) {
  return `Draft a ${language} coordinator reply for ${patient.name} about document/workflow progress only. No diagnosis claims.`;
}

export function doctorBriefPrompt(patient: Patient) {
  return `Create an internal doctor workflow brief for ${patient.name} focusing on operational status and pending requirements.`;
}

export function complianceRecommendationsPrompt(patient: Patient) {
  return `List operational recommendations to improve compliance readiness for ${patient.name}.`;
}
