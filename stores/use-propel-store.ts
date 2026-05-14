"use client";

import {
  AuditEvent,
  DoctorReviewStatus,
  NotificationItem,
  Patient,
  PipelineStage,
  ReadinessStatus,
} from "@/lib/types";
import { create } from "zustand";

const DEMO_PATIENTS_STORAGE_KEY = "propel_demo_patients_v1";
const DEMO_NOTIFICATIONS_STORAGE_KEY = "propel_demo_notifications_v1";
const DEMO_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

const nowIso = () => new Date().toISOString();

function toStage(value: string): PipelineStage {
  const allowed: PipelineStage[] = [
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
  ];
  return allowed.includes(value as PipelineStage) ? (value as PipelineStage) : "New Lead";
}

function toReadiness(value: string): ReadinessStatus {
  if (value === "critical" || value === "incomplete" || value === "ready") return value;
  return "incomplete";
}

function toDoctorReview(value: string): DoctorReviewStatus {
  if (value === "pending" || value === "approved" || value === "rejected") return value;
  return "pending";
}

function createDemoPatients(): Patient[] {
  const base = [
    {
      id: "demo-1",
      name: "Elena Rossi",
      nationality: "Italy",
      treatmentType: "dental implants",
      stage: "Coordinator Review",
      readinessStatus: "critical",
      doctorReviewStatus: "pending",
      notes: "Missing passport",
      complianceScore: 52,
      revenueEstimate: 14000,
      missingDocuments: ["passport"],
    },
    {
      id: "demo-2",
      name: "Jean-Pierre Dubois",
      nationality: "France",
      treatmentType: "hair transplant",
      stage: "Doctor Review",
      readinessStatus: "incomplete",
      doctorReviewStatus: "pending",
      notes: "Doctor review pending",
      complianceScore: 61,
      revenueEstimate: 9000,
      missingDocuments: [],
    },
    {
      id: "demo-3",
      name: "Sarah Mitchell",
      nationality: "UK",
      treatmentType: "full-mouth reconstruction",
      stage: "Awaiting Documents",
      readinessStatus: "critical",
      doctorReviewStatus: "approved",
      notes: "Missing translation",
      complianceScore: 58,
      revenueEstimate: 22000,
      missingDocuments: ["translation"],
    },
    {
      id: "demo-4",
      name: "Hans Weber",
      nationality: "Germany",
      treatmentType: "deposit paid",
      stage: "Treatment Approved",
      readinessStatus: "ready",
      doctorReviewStatus: "approved",
      notes: "Ready",
      complianceScore: 90,
      revenueEstimate: 17500,
      missingDocuments: [],
    },
    {
      id: "demo-5",
      name: "Ahmed Ben Ali",
      nationality: "Tunisia",
      treatmentType: "rhinoplasty",
      stage: "Awaiting Documents",
      readinessStatus: "incomplete",
      doctorReviewStatus: "pending",
      notes: "Waiting documents",
      complianceScore: 65,
      revenueEstimate: 11000,
      missingDocuments: ["passport", "medical_report"],
    },
    {
      id: "demo-6",
      name: "Layla Mansour",
      nationality: "UAE",
      treatmentType: "veneers",
      stage: "New Lead",
      readinessStatus: "incomplete",
      doctorReviewStatus: "pending",
      notes: "New lead",
      complianceScore: 71,
      revenueEstimate: 8000,
      missingDocuments: [],
    },
  ] as const;

  return base.map((item) => ({
    id: item.id,
    name: item.name,
    phone: null,
    email: null,
    nationality: item.nationality,
    treatmentType: item.treatmentType,
    riskScore: Math.max(0, 100 - item.complianceScore),
    complianceScore: item.complianceScore,
    readinessStatus: item.readinessStatus,
    revenueEstimate: item.revenueEstimate,
    clinicId: DEMO_CLINIC_ID,
    coordinatorAssigned: "Demo Coordinator",
    notes: item.notes,
    doctorNote: null,
    lastActivity: nowIso(),
    missingDocuments: [...item.missingDocuments],
    timelineStatus: "active",
    aiInsights: item.notes,
    bookingProbability: Math.min(100, item.complianceScore),
    doctorReviewStatus: item.doctorReviewStatus,
    stage: item.stage,
    syncReady: item.readinessStatus === "ready",
    documents: [],
  }));
}

function normalizePatient(raw: Partial<Patient>): Patient {
  const complianceScore = typeof raw.complianceScore === "number" ? raw.complianceScore : 60;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name : "Demo Patient";
  const treatmentType =
    typeof raw.treatmentType === "string" && raw.treatmentType.trim()
      ? raw.treatmentType
      : "General Consultation";
  const nationality =
    typeof raw.nationality === "string" && raw.nationality.trim() ? raw.nationality : "Unknown";

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `demo-${crypto.randomUUID()}`,
    name,
    phone: typeof raw.phone === "string" || raw.phone === null ? raw.phone ?? null : null,
    email: typeof raw.email === "string" || raw.email === null ? raw.email ?? null : null,
    nationality,
    treatmentType,
    riskScore: typeof raw.riskScore === "number" ? raw.riskScore : Math.max(0, 100 - complianceScore),
    complianceScore,
    readinessStatus: toReadiness(String(raw.readinessStatus ?? "incomplete")),
    revenueEstimate: typeof raw.revenueEstimate === "number" ? raw.revenueEstimate : 0,
    clinicId: typeof raw.clinicId === "string" && raw.clinicId ? raw.clinicId : DEMO_CLINIC_ID,
    coordinatorAssigned:
      typeof raw.coordinatorAssigned === "string" || raw.coordinatorAssigned === null
        ? raw.coordinatorAssigned ?? "Demo Coordinator"
        : "Demo Coordinator",
    notes: typeof raw.notes === "string" || raw.notes === null ? raw.notes ?? null : null,
    doctorNote:
      typeof raw.doctorNote === "string" || raw.doctorNote === null ? raw.doctorNote ?? null : null,
    lastActivity: typeof raw.lastActivity === "string" && raw.lastActivity ? raw.lastActivity : nowIso(),
    missingDocuments: Array.isArray(raw.missingDocuments)
      ? raw.missingDocuments.filter((d): d is string => typeof d === "string")
      : [],
    timelineStatus:
      typeof raw.timelineStatus === "string" && raw.timelineStatus ? raw.timelineStatus : "active",
    aiInsights: typeof raw.aiInsights === "string" ? raw.aiInsights : "",
    bookingProbability:
      typeof raw.bookingProbability === "number" ? raw.bookingProbability : Math.min(100, complianceScore),
    doctorReviewStatus: toDoctorReview(String(raw.doctorReviewStatus ?? "pending")),
    stage: toStage(String(raw.stage ?? "New Lead")),
    syncReady: typeof raw.syncReady === "boolean" ? raw.syncReady : false,
    documents: Array.isArray(raw.documents) ? raw.documents : [],
    archived: typeof raw.archived === "boolean" ? raw.archived : false,
    archivedAt: typeof raw.archivedAt === "string" || raw.archivedAt === null ? raw.archivedAt ?? null : null,
    archivedBy: typeof raw.archivedBy === "string" || raw.archivedBy === null ? raw.archivedBy ?? null : null,
    stageBeforeArchive:
      typeof raw.stageBeforeArchive === "string" ? toStage(raw.stageBeforeArchive) : raw.stageBeforeArchive ?? null,
  };
}

function loadPatientsFromStorage(): Patient[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(DEMO_PATIENTS_STORAGE_KEY);
  if (!raw) {
    const seeded = createDemoPatients();
    window.localStorage.setItem(DEMO_PATIENTS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Patient>[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = createDemoPatients();
      window.localStorage.setItem(DEMO_PATIENTS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed.map(normalizePatient);
  } catch {
    const seeded = createDemoPatients();
    window.localStorage.setItem(DEMO_PATIENTS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function savePatientsToStorage(patients: Patient[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_PATIENTS_STORAGE_KEY, JSON.stringify(patients));
}

function loadNotificationsFromStorage(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(DEMO_NOTIFICATIONS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as NotificationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotificationsToStorage(notifications: NotificationItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

interface PropelState {
  patients: Patient[];
  auditEvents: AuditEvent[];
  notifications: NotificationItem[];
  loading: boolean;
  error: string | null;
  hydrateError: string | null;
  lastUpdatedAt: number | null;
  hydrate: () => Promise<void>;
  hydrateNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  createPatient: (input: {
    name: string;
    nationality: string;
    phone?: string;
    email?: string;
    treatmentType: string;
    estimatedRevenue?: number;
    assignedCoordinator?: string;
    notes?: string;
  }) => Promise<void>;
  updatePatient: (
    patientId: string,
    input: {
      name?: string;
      nationality?: string;
      phone?: string;
      email?: string;
      treatmentType?: string;
      estimatedRevenue?: number;
      coordinatorName?: string;
      notes?: string;
      doctorReviewStatus?: "pending" | "approved" | "rejected";
      doctorNote?: string;
    },
  ) => Promise<void>;
  movePatient: (patientId: string, stage: PipelineStage) => Promise<void>;
  runSyncReadiness: (
    patientId: string,
  ) => Promise<{
    ok: boolean;
    message: string;
    compliance: { complianceScore: number; readinessStatus: string; missingItems: string[] };
    riskLevel: string;
    recommendedActions: string[];
  }>;
  archivePatient: (patientId: string) => Promise<void>;
  restorePatient: (patientId: string) => Promise<void>;
  deletePatient: (patientId: string) => Promise<void>;
  clearDemoWorkspace: () => Promise<void>;
}

export const usePropelStore = create<PropelState>((set, get) => ({
  patients: [],
  auditEvents: [],
  notifications: [],
  loading: true,
  error: null,
  hydrateError: null,
  lastUpdatedAt: null,
  hydrate: async () => {
    const patients = loadPatientsFromStorage();
    const notifications = loadNotificationsFromStorage();
    set({
      patients,
      notifications,
      loading: false,
      error: null,
      hydrateError: null,
      lastUpdatedAt: Date.now(),
    });
  },
  hydrateNotifications: async () => {
    const notifications = loadNotificationsFromStorage();
    set({ notifications });
  },
  markNotificationRead: async (id) => {
    const notifications = get().notifications.map((n) =>
      n.id === id ? { ...n, readAt: nowIso() } : n,
    );
    saveNotificationsToStorage(notifications);
    set({ notifications });
  },
  createPatient: async (input) => {
    const patients = loadPatientsFromStorage();
    const newPatient = normalizePatient({
      id: `demo-${crypto.randomUUID()}`,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      nationality: input.nationality,
      treatmentType: input.treatmentType,
      stage: "New Lead",
      readinessStatus: "incomplete",
      doctorReviewStatus: "pending",
      syncReady: false,
      complianceScore: 60,
      riskScore: 40,
      revenueEstimate: input.estimatedRevenue ?? 0,
      clinicId: DEMO_CLINIC_ID,
      coordinatorAssigned: input.assignedCoordinator ?? "Demo Coordinator",
      notes: input.notes ?? null,
      doctorNote: null,
      lastActivity: nowIso(),
      missingDocuments: [],
      timelineStatus: "active",
      aiInsights: input.notes ?? "New lead",
      bookingProbability: 50,
      documents: [],
      archived: false,
      archivedAt: null,
      archivedBy: null,
      stageBeforeArchive: null,
    });
    const next = [newPatient, ...patients];
    savePatientsToStorage(next);
    set({ patients: next, error: null, hydrateError: null, lastUpdatedAt: Date.now() });
  },
  updatePatient: async (patientId, input) => {
    const next = get().patients.map((p) => {
      if (p.id !== patientId) return p;
      return normalizePatient({
        ...p,
        name: input.name ?? p.name,
        nationality: input.nationality ?? p.nationality,
        phone: input.phone ?? p.phone,
        email: input.email ?? p.email,
        treatmentType: input.treatmentType ?? p.treatmentType,
        revenueEstimate: typeof input.estimatedRevenue === "number" ? input.estimatedRevenue : p.revenueEstimate,
        coordinatorAssigned: input.coordinatorName ?? p.coordinatorAssigned,
        notes: typeof input.notes === "string" ? input.notes : p.notes,
        doctorReviewStatus: input.doctorReviewStatus ?? p.doctorReviewStatus,
        doctorNote: typeof input.doctorNote === "string" ? input.doctorNote : p.doctorNote,
        lastActivity: nowIso(),
      });
    });
    savePatientsToStorage(next);
    set({ patients: next, error: null, hydrateError: null, lastUpdatedAt: Date.now() });
  },
  movePatient: async (patientId, stage) => {
    const next = get().patients.map((p) =>
      p.id === patientId
        ? normalizePatient({
            ...p,
            stage,
            lastActivity: nowIso(),
          })
        : p,
    );
    savePatientsToStorage(next);
    set({ patients: next, error: null, hydrateError: null, lastUpdatedAt: Date.now() });
  },
  runSyncReadiness: async (patientId) => {
    const patient = get().patients.find((p) => p.id === patientId);
    const missingItems = patient?.documents.length ? [] : ["passport", "consent_form", "medical_report"];
    const nextStatus: ReadinessStatus = missingItems.length === 0 ? "ready" : "incomplete";
    const nextScore = missingItems.length === 0 ? 92 : Math.max(55, patient?.complianceScore ?? 60);

    const next = get().patients.map((p) =>
      p.id === patientId
        ? normalizePatient({
            ...p,
            complianceScore: nextScore,
            readinessStatus: nextStatus,
            syncReady: nextStatus === "ready",
            lastActivity: nowIso(),
            missingDocuments: missingItems,
          })
        : p,
    );
    savePatientsToStorage(next);
    set({ patients: next, error: null, hydrateError: null, lastUpdatedAt: Date.now() });

    return {
      ok: true,
      message: "Readiness synced in demo mode",
      compliance: {
        complianceScore: nextScore,
        readinessStatus: nextStatus,
        missingItems,
      },
      riskLevel: nextScore >= 80 ? "low" : nextScore >= 60 ? "medium" : "high",
      recommendedActions:
        missingItems.length === 0
          ? ["Proceed with booking confirmation"]
          : ["Upload missing required documents", "Re-run readiness sync after documents upload"],
    };
  },
  archivePatient: async (patientId) => {
    const prev = get().patients;
    const next = prev.map((p) =>
      p.id === patientId
        ? normalizePatient({
            ...p,
            archived: true,
            archivedAt: nowIso(),
            archivedBy: "Demo Admin",
            stageBeforeArchive: p.stage,
            lastActivity: nowIso(),
          })
        : p,
    );

    set({ patients: next, error: null, hydrateError: null, lastUpdatedAt: Date.now() });
    try {
      savePatientsToStorage(next);
    } catch {
      set({ patients: prev, error: "Failed to archive patient", lastUpdatedAt: Date.now() });
      throw new Error("Failed to archive patient");
    }
  },
  restorePatient: async (patientId) => {
    const prev = get().patients;
    const next = prev.map((p) =>
      p.id === patientId
        ? normalizePatient({
            ...p,
            archived: false,
            archivedAt: null,
            archivedBy: null,
            stage: p.stageBeforeArchive ?? p.stage,
            stageBeforeArchive: null,
            lastActivity: nowIso(),
          })
        : p,
    );

    set({ patients: next, error: null, hydrateError: null, lastUpdatedAt: Date.now() });
    try {
      savePatientsToStorage(next);
    } catch {
      set({ patients: prev, error: "Failed to restore patient", lastUpdatedAt: Date.now() });
      throw new Error("Failed to restore patient");
    }
  },
  deletePatient: async (patientId) => {
    const prev = get().patients;
    const next = prev.filter((p) => p.id !== patientId);

    set({ patients: next, error: null, hydrateError: null, lastUpdatedAt: Date.now() });
    try {
      savePatientsToStorage(next);
    } catch {
      set({ patients: prev, error: "Failed to delete patient", lastUpdatedAt: Date.now() });
      throw new Error("Failed to delete patient");
    }
  },
  clearDemoWorkspace: async () => {
    const prev = get().patients;
    set({ patients: [], error: null, hydrateError: null, lastUpdatedAt: Date.now() });
    try {
      savePatientsToStorage([]);
    } catch {
      set({ patients: prev, error: "Failed to clear workspace", lastUpdatedAt: Date.now() });
      throw new Error("Failed to clear workspace");
    }
  },
}));
