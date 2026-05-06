"use client";

import { AuditEvent, NotificationItem, Patient, PipelineStage } from "@/lib/types";
import { create } from "zustand";

interface PropelState {
  patients: Patient[];
  auditEvents: AuditEvent[];
  notifications: NotificationItem[];
  loading: boolean;
  error: string | null;
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
}

export const usePropelStore = create<PropelState>((set) => ({
  patients: [],
  auditEvents: [],
  notifications: [],
  loading: true,
  error: null,
  lastUpdatedAt: null,
  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const [patientsRes, auditRes, notificationsRes] = await Promise.all([
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/audit-events", { cache: "no-store" }),
        fetch("/api/notifications", { cache: "no-store" }),
      ]);
      const patientsJson = await patientsRes.json();
      const auditJson = await auditRes.json();
      const notificationsJson = await notificationsRes.json();

      if (!patientsRes.ok) throw new Error(patientsJson.error ?? "Failed to load patients");
      if (!auditRes.ok) throw new Error(auditJson.error ?? "Failed to load audit events");
      if (!notificationsRes.ok) {
        throw new Error(notificationsJson.error ?? "Failed to load notifications");
      }

      set({
        patients: patientsJson.patients ?? patientsJson.data?.patients ?? [],
        auditEvents: auditJson.auditEvents ?? auditJson.data?.auditEvents ?? [],
        notifications:
          notificationsJson.notifications ?? notificationsJson.data?.notifications ?? [],
        loading: false,
        lastUpdatedAt: Date.now(),
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
  hydrateNotifications: async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Failed to load notifications");
    set({
      notifications: json.notifications ?? json.data?.notifications ?? [],
    });
  },
  markNotificationRead: async (id) => {
    const response = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Failed to mark notification");
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    }));
  },
  createPatient: async (input) => {
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to create patient");
    await usePropelStore.getState().hydrate();
  },
  updatePatient: async (patientId, input) => {
    const response = await fetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to update patient");
    await usePropelStore.getState().hydrate();
  },
  movePatient: async (patientId, stage) => {
    const previousPatients = usePropelStore.getState().patients;
    set((state) => ({
      patients: state.patients.map((p) => (p.id === patientId ? { ...p, stage } : p)),
      notifications: state.notifications,
    }));
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to move patient");
      await usePropelStore.getState().hydrate();
    } catch (error) {
      set({
        patients: previousPatients,
        error: error instanceof Error ? error.message : "Failed to move patient",
      });
      throw error;
    }
  },
  runSyncReadiness: async (patientId) => {
    const response = await fetch(`/api/patients/${patientId}/sync`, {
      method: "POST",
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "Failed to validate readiness");
    }
    const data = json.data ?? json;
    await usePropelStore.getState().hydrate();
    await usePropelStore.getState().hydrateNotifications();
    return {
      ok: data.ok as boolean,
      message: data.message as string,
      compliance: data.compliance as { complianceScore: number; readinessStatus: string; missingItems: string[] },
      riskLevel: data.riskLevel as string,
      recommendedActions: data.recommendedActions as string[],
    };
  },
}));
