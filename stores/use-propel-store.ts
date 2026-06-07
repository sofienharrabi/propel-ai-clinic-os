"use client";

import {
  AuditEvent,
  NotificationItem,
  Patient,
  PipelineStage,
} from "@/lib/types";
import { create } from "zustand";

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
    input: Record<string, unknown>,
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

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? `Request failed: ${res.status}`);
  }
  return json.data as T;
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
    try {
      const [patientsData, notificationsData, auditData] = await Promise.all([
        apiFetch<{ patients: Patient[] }>("/api/patients"),
        apiFetch<{ notifications: NotificationItem[] }>("/api/notifications"),
        apiFetch<{ auditEvents: AuditEvent[] }>("/api/audit-events").catch(() => ({
          auditEvents: [] as AuditEvent[],
        })),
      ]);

      set({
        patients: patientsData.patients,
        notifications: notificationsData.notifications,
        auditEvents: auditData.auditEvents,
        loading: false,
        error: null,
        hydrateError: null,
        lastUpdatedAt: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      set({ loading: false, hydrateError: message, lastUpdatedAt: Date.now() });
    }
  },

  hydrateNotifications: async () => {
    try {
      const data = await apiFetch<{ notifications: NotificationItem[] }>("/api/notifications");
      set({ notifications: data.notifications });
    } catch {
      // non-fatal
    }
  },

  markNotificationRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    }));
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      // revert on error
      await get().hydrateNotifications();
    }
  },

  createPatient: async (input) => {
    await apiFetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        nationality: input.nationality,
        phone: input.phone,
        email: input.email,
        treatmentType: input.treatmentType,
        estimatedRevenue: input.estimatedRevenue ?? 0,
        assignedCoordinator: input.assignedCoordinator,
        notes: input.notes,
      }),
    });
    await get().hydrate();
  },

  updatePatient: async (patientId, input) => {
    await apiFetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await get().hydrate();
  },

  movePatient: async (patientId, stage) => {
    // optimistic update
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId ? { ...p, stage } : p,
      ),
    }));
    try {
      await apiFetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
    } catch (err) {
      // revert
      await get().hydrate();
      throw err;
    }
  },

  runSyncReadiness: async (patientId) => {
    const result = await apiFetch<{
      ok: boolean;
      message: string;
      compliance: { complianceScore: number; readinessStatus: string; missingItems: string[] };
      riskLevel: string;
      recommendedActions: string[];
    }>(`/api/patients/${patientId}/sync`, { method: "POST" });
    await get().hydrate();
    return result;
  },

  archivePatient: async (patientId) => {
    // optimistic
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId
          ? { ...p, archived: true, archivedAt: new Date().toISOString() }
          : p,
      ),
    }));
    try {
      await apiFetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
    } catch (err) {
      await get().hydrate();
      throw err;
    }
  },

  restorePatient: async (patientId) => {
    // optimistic
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId
          ? {
              ...p,
              archived: false,
              archivedAt: null,
              stage: p.stageBeforeArchive ?? p.stage,
              stageBeforeArchive: null,
            }
          : p,
      ),
    }));
    try {
      await apiFetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
    } catch (err) {
      await get().hydrate();
      throw err;
    }
  },

  deletePatient: async (patientId) => {
    // optimistic
    set((state) => ({
      patients: state.patients.filter((p) => p.id !== patientId),
    }));
    try {
      await apiFetch(`/api/patients/${patientId}`, { method: "DELETE" });
    } catch (err) {
      await get().hydrate();
      throw err;
    }
  },

  clearDemoWorkspace: async () => {
    // no-op in production — retained for interface compatibility
  },
}));
