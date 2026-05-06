import {
  complianceRecommendationsPrompt,
  coordinatorReplyPrompt,
  doctorBriefPrompt,
  patientSummaryPrompt,
} from "@/lib/ai/prompts";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { AIProvider, DeterministicProvider } from "@/lib/ai/providers/base";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { Patient } from "@/lib/types";

function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "openai") return new OpenAIProvider();
  if (provider === "anthropic") return new AnthropicProvider();
  return new DeterministicProvider();
}

export async function generatePatientSummary(patient: Patient) {
  return getProvider().generateText(patientSummaryPrompt(patient));
}

export async function generateCoordinatorReply(patient: Patient, language = "English") {
  return getProvider().generateText(coordinatorReplyPrompt(patient, language));
}

export async function generateDoctorBrief(patient: Patient) {
  return getProvider().generateText(doctorBriefPrompt(patient));
}

export async function generateComplianceRecommendations(patient: Patient) {
  return getProvider().generateText(complianceRecommendationsPrompt(patient));
}

export async function scoreLeadQuality(patient: Patient) {
  return Math.max(0, Math.min(100, Math.round((patient.bookingProbability + (100 - patient.riskScore)) / 2)));
}
