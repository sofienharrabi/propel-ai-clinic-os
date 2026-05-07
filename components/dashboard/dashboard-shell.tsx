"use client";

import { pipelineStages } from "@/lib/mock-data";
import { DocumentType, Patient, UserRole } from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";
import { usePropelStore } from "@/stores/use-propel-store";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Bell, Bot, Plus, ShieldCheck, Stethoscope, UploadCloud, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { hasPermission } from "@/lib/rbac";
import { useLiveClinicData } from "@/hooks/use-live-clinic-data";

export function DashboardShell({ role }: { role: UserRole }) {
  const {
    patients,
    auditEvents,
    notifications,
    loading,
    hydrate,
    markNotificationRead,
    movePatient,
    runSyncReadiness,
    createPatient,
    updatePatient,
  } = usePropelStore();
  const [uploadingPatientId, setUploadingPatientId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [syncResult, setSyncResult] = useState<{
    patientName: string;
    ok: boolean;
    message: string;
    score: number;
    readinessStatus: string;
    missingItems: string[];
    riskLevel: string;
    recommendedActions: string[];
  } | null>(null);

  useEffect(() => {
    hydrate().catch(() => null);
  }, [hydrate]);
  useLiveClinicData(hydrate, 12000);

  const onDragEnd = (event: DragEndEvent) => {
    const patientId = String(event.active.id);
    const stage = event.over?.id as (typeof pipelineStages)[number] | undefined;
    if (stage && hasPermission(role, "patient:move_stage")) {
      movePatient(patientId, stage)
        .then(() => toast.success(`Patient moved to ${stage}`))
        .catch((moveError) => {
          console.error(moveError);
        });
    }
  };

  if (loading) {
    return <Card className="p-6 text-sm text-zinc-300">Loading patient operations...</Card>;
  }


  if (patients.length === 0) {
    return <Card className="p-6 text-sm text-zinc-400">No patients yet. Add a patient to start the pipeline.</Card>;
  }

  const totalRevenue = patients.reduce((acc, p) => acc + p.revenueEstimate, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Pipeline Patients" value={String(patients.length)} />
        <Metric title="Average Compliance" value={formatPercent(patients.reduce((a, p) => a + p.complianceScore, 0) / patients.length)} />
        <Metric title="Forecast Revenue" value={`$${totalRevenue.toLocaleString()}`} />
        <Metric title="Critical Alerts" value={String(patients.filter((p) => p.complianceScore < 70).length)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">International Patient Pipeline</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">Drag and drop cards to update workflow</span>
              {hasPermission(role, "patient:create") && (
                <Button size="sm" onClick={() => setNewOpen(true)}>
                  <Plus size={14} className="mr-1" /> New Patient
                </Button>
              )}
            </div>
          </div>
          <DndContext onDragEnd={onDragEnd}>
            <div className="grid gap-3 overflow-auto pb-2 md:grid-cols-2 xl:grid-cols-4">
              {pipelineStages.slice(0, 8).map((stage) => (
                <StageColumn key={stage} stage={stage}>
                  <p className="mb-3 text-sm font-semibold text-cyan-300">{stage}</p>
                  <div className="space-y-2">
                    {patients
                      .filter((p) => p.stage === stage)
                      .map((patient) => (
                        <PatientCard key={patient.id} patientId={patient.id} onOpen={() => setSelectedPatient(patient)}>
                          <p className="text-sm font-medium text-zinc-100">{patient.name}</p>
                          <p className="text-xs text-zinc-400">{patient.nationality} - {patient.treatmentType}</p>
                          <p className="mt-1 text-xs text-zinc-300">Compliance {formatPercent(patient.complianceScore)}</p>
                          <p
                            className={cn(
                              "text-[11px]",
                              patient.readinessStatus === "ready"
                                ? "text-emerald-400"
                                : patient.readinessStatus === "incomplete"
                                  ? "text-yellow-400"
                                  : "text-red-400",
                            )}
                          >
                            {patient.readinessStatus.toUpperCase()}
                          </p>
                          <p className="text-xs text-zinc-500">{patient.aiInsights}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 w-full border border-zinc-700"
                            disabled={!hasPermission(role, "compliance:validate")}
                            onClick={() => {
                              runSyncReadiness(patient.id)
                                .then((result) => {
                                  setSyncResult({
                                    patientName: patient.name,
                                    ok: result.ok,
                                    message: result.message,
                                    score: result.compliance.complianceScore,
                                    readinessStatus: result.compliance.readinessStatus,
                                    missingItems: result.compliance.missingItems,
                                    riskLevel: result.riskLevel,
                                    recommendedActions: result.recommendedActions,
                                  });
                                  if (result.ok) {
                                    toast.success(result.message);
                                  }
                                })
                                .catch((syncError) => {
                                  console.error(syncError);
                                });
                            }}
                          >
                            Sync Readiness
                          </Button>
                          <input
                            className="mt-2 w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-zinc-200"
                            type="file"
                            disabled={!hasPermission(role, "document:upload") || uploadingPatientId === patient.id}
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              setUploadingPatientId(patient.id);
                              try {
                                const formData = new FormData();
                                formData.append("file", file);
                                formData.append("documentType", "medical_report");
                                const response = await fetch(`/api/patients/${patient.id}/documents`, {
                                  method: "POST",
                                  body: formData,
                                });
                                const data = await response.json();
                                if (!response.ok) throw new Error(data.error ?? "Upload failed");
                                toast.success("Document uploaded");
                                await hydrate();
                              } catch (uploadError) {
                                console.error(uploadError);
                              } finally {
                                setUploadingPatientId(null);
                              }
                            }}
                          />
                        </PatientCard>
                      ))}
                  </div>
                </StageColumn>
              ))}
            </div>
          </DndContext>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-100">AI Medical Coordinator</h3>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2"><Bot size={14} /> WhatsApp multilingual responses</li>
              <li className="flex items-center gap-2"><Stethoscope size={14} /> Doctor-facing summaries</li>
              <li className="flex items-center gap-2"><ShieldCheck size={14} /> Compliance risk checks</li>
              <li className="flex items-center gap-2"><UploadCloud size={14} /> Intake and report summarization</li>
            </ul>
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-100">Live Notifications</h3>
            <div className="space-y-2">
              {notifications.slice(0, 5).map((note, i) => (
                <button
                  key={`${note.id}-${i}`}
                  className={cn(
                    "flex w-full items-start gap-2 text-left text-xs",
                    note.readAt ? "text-zinc-500" : "text-zinc-300",
                  )}
                  onClick={() => markNotificationRead(note.id).catch(() => null)}
                >
                  <Bell size={13} className={cn("mt-0.5", note.readAt ? "text-zinc-500" : "text-cyan-400")} />
                  <span>
                    <span className="text-zinc-100">{note.title}</span> - {note.message}
                  </span>
                </button>
              ))}
              {notifications.length === 0 && <p className="text-xs text-zinc-500">No new alerts</p>}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-100">Audit Timeline</h3>
            <div className="space-y-2">
              {auditEvents.slice(0, 4).map((event) => (
                <p key={event.id} className="text-xs text-zinc-400">
                  <span className="text-zinc-200">{event.actor}</span>: {event.description}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </div>
      {newOpen && (
        <PatientFormModal
          title="Create New Patient"
          onClose={() => setNewOpen(false)}
          onSave={async (values) => {
            await createPatient(values);
            toast.success("Patient created");
            setNewOpen(false);
          }}
        />
      )}
      {selectedPatient && (
        <PatientDrawer
          patient={selectedPatient}
          role={role}
          auditEvents={auditEvents.filter((e) => e.patientId === selectedPatient.id)}
          onClose={() => setSelectedPatient(null)}
          onSaved={async () => {
            await hydrate();
            const refreshed = usePropelStore.getState().patients.find((p) => p.id === selectedPatient.id);
            if (refreshed) setSelectedPatient(refreshed);
          }}
          onUpdate={updatePatient}
          onSync={async () => {
            const result = await runSyncReadiness(selectedPatient.id);
            setSyncResult({
              patientName: selectedPatient.name,
              ok: result.ok,
              message: result.message,
              score: result.compliance.complianceScore,
              readinessStatus: result.compliance.readinessStatus,
              missingItems: result.compliance.missingItems,
              riskLevel: result.riskLevel,
              recommendedActions: result.recommendedActions,
            });
          }}
        />
      )}
      {syncResult && <SyncResultModal result={syncResult} onClose={() => setSyncResult(null)} />}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
    </Card>
  );
}

function StageColumn({
  stage,
  children,
}: {
  stage: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  return (
    <Card
      ref={setNodeRef}
      className={`min-h-60 p-3 transition-colors ${isOver ? "border-cyan-400/70 bg-zinc-900" : ""}`}
    >
      {children}
    </Card>
  );
}

function PatientCard({
  patientId,
  onOpen,
  children,
}: {
  patientId: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: patientId,
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      whileHover={{ scale: 1.02 }}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 20 : 1,
      }}
      className="rounded-lg border border-zinc-700 bg-zinc-900 p-3"
      onClick={onOpen}
      {...listeners}
      {...attributes}
    >
      {children}
    </motion.div>
  );
}

function PatientFormModal({
  title,
  onClose,
  onSave,
  initial,
}: {
  title: string;
  onClose: () => void;
  onSave: (values: {
    name: string;
    nationality: string;
    phone?: string;
    email?: string;
    treatmentType: string;
    estimatedRevenue?: number;
    assignedCoordinator?: string;
    notes?: string;
  }) => Promise<void>;
  initial?: Partial<Patient>;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [nationality, setNationality] = useState(initial?.nationality ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [treatmentType, setTreatmentType] = useState(initial?.treatmentType ?? "");
  const [estimatedRevenue, setEstimatedRevenue] = useState(String(initial?.revenueEstimate ?? ""));
  const [assignedCoordinator, setAssignedCoordinator] = useState(initial?.coordinatorAssigned ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input className={inputCls} placeholder="Patient name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputCls} placeholder="Nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} />
          <input className={inputCls} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={inputCls} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputCls} placeholder="Treatment type" value={treatmentType} onChange={(e) => setTreatmentType(e.target.value)} />
          <input className={inputCls} placeholder="Estimated revenue" value={estimatedRevenue} onChange={(e) => setEstimatedRevenue(e.target.value)} />
          <input className={inputCls} placeholder="Assigned coordinator" value={assignedCoordinator} onChange={(e) => setAssignedCoordinator(e.target.value)} />
          <input className={inputCls} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={loading}
            onClick={async () => {
              if (!name || !nationality || !treatmentType) {
                setError("Name, nationality, and treatment type are required.");
                return;
              }
              setLoading(true);
              setError(null);
              try {
                await onSave({
                  name,
                  nationality,
                  phone,
                  email,
                  treatmentType,
                  estimatedRevenue: Number(estimatedRevenue || 0),
                  assignedCoordinator,
                  notes,
                });
              } catch (err) {
                console.error(err);
                setError("Action failed. Please try again.");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PatientDrawer({
  patient,
  role,
  auditEvents,
  onClose,
  onSaved,
  onUpdate,
  onSync,
}: {
  patient: Patient;
  role: UserRole;
  auditEvents: { id: string; actor: string; description: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onUpdate: (patientId: string, input: Record<string, unknown>) => Promise<void>;
  onSync: () => Promise<void>;
}) {
  const [docType, setDocType] = useState<DocumentType>("passport");
  const [docLoading, setDocLoading] = useState(false);
  const missingRequiredDocs = ["passport", "consent_form", "medical_report", "treatment_image", "payment_confirmation"].filter(
    (required) => !patient.documents.some((d) => d.type === required),
  );
  const [editing, setEditing] = useState(false);

  return (
    <motion.div initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }} className="fixed right-0 top-0 z-50 h-full w-full max-w-xl border-l border-zinc-800 bg-zinc-950 p-5 overflow-y-auto">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{patient.name}</h3>
        <button onClick={onClose}><X size={16} /></button>
      </div>
      <div className="space-y-4 text-sm">
        <Card className="p-3">
          <p>{patient.nationality} - {patient.treatmentType}</p>
          <p className="text-zinc-400">{patient.email ?? "No email"} | {patient.phone ?? "No phone"}</p>
          <p>Stage: <span className="text-cyan-300">{patient.stage}</span></p>
          <p>Compliance: {formatPercent(patient.complianceScore)} ({patient.readinessStatus})</p>
          <p>Doctor review: {patient.doctorReviewStatus}</p>
          <p>Coordinator: {patient.coordinatorAssigned ?? "Unassigned"}</p>
          <p className="text-zinc-400">{patient.aiInsights}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit Patient</Button>
            <Button size="sm" onClick={onSync} disabled={!hasPermission(role, "compliance:validate")}>Sync Readiness</Button>
          </div>
        </Card>

        <Card className="p-3">
          <p className="mb-2 font-medium">Doctor Review Panel</p>
          <textarea className={inputCls} placeholder="Doctor note" defaultValue={patient.doctorNote ?? ""} id={`doctor-note-${patient.id}`} />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!hasPermission(role, "patient:doctor_review")}
              onClick={async () => {
                const note = (document.getElementById(`doctor-note-${patient.id}`) as HTMLTextAreaElement | null)?.value ?? "";
                await onUpdate(patient.id, { doctorReviewStatus: "pending", doctorNote: note });
                toast.success("Doctor review requested");
                await onSaved();
              }}
            >Request Review</Button>
            <Button
              size="sm"
              disabled={!hasPermission(role, "patient:doctor_review")}
              onClick={async () => {
                const note = (document.getElementById(`doctor-note-${patient.id}`) as HTMLTextAreaElement | null)?.value ?? "";
                await onUpdate(patient.id, { doctorReviewStatus: "approved", doctorNote: note });
                toast.success("Patient approved by doctor");
                await onSaved();
              }}
            >Approve</Button>
            <Button
              size="sm"
              variant="danger"
              disabled={!hasPermission(role, "patient:doctor_review")}
              onClick={async () => {
                const note = (document.getElementById(`doctor-note-${patient.id}`) as HTMLTextAreaElement | null)?.value ?? "";
                await onUpdate(patient.id, { doctorReviewStatus: "rejected", doctorNote: note });
                toast.success("Patient rejected by doctor");
                await onSaved();
              }}
            >Reject</Button>
          </div>
        </Card>

        <Card className="p-3">
          <p className="mb-2 font-medium">Document Manager</p>
          <select className={inputCls} value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
            <option value="passport">passport</option>
            <option value="consent_form">consent_form</option>
            <option value="medical_report">medical_report</option>
            <option value="treatment_image">treatment_image</option>
            <option value="payment_confirmation">payment_confirmation</option>
            <option value="translation">translation</option>
            <option value="invoice">invoice</option>
          </select>
          <input
            className="mt-2 w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-zinc-200"
            type="file"
            disabled={!hasPermission(role, "document:upload") || docLoading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setDocLoading(true);
              try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("documentType", docType);
                const response = await fetch(`/api/patients/${patient.id}/documents`, { method: "POST", body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error ?? "Upload failed");
                toast.success("Document uploaded");
                await onSaved();
              } catch (uploadError) {
                console.error(uploadError);
              } finally {
                setDocLoading(false);
              }
            }}
          />
          <div className="mt-3 space-y-1 text-xs">
            {patient.documents.map((doc) => (
              <p key={doc.id} className="text-zinc-300">{doc.type} - {doc.status}</p>
            ))}
            {patient.documents.length === 0 && <p className="text-zinc-500">No uploaded documents.</p>}
          </div>
          <p className="mt-2 text-xs text-yellow-300">
            Missing required: {missingRequiredDocs.length ? missingRequiredDocs.join(", ") : "none"}
          </p>
        </Card>

        <Card className="p-3">
          <p className="mb-2 font-medium">Audit Timeline</p>
          <div className="space-y-1 text-xs text-zinc-400">
            {auditEvents.slice(0, 10).map((event) => (
              <p key={event.id}><span className="text-zinc-200">{event.actor}</span>: {event.description}</p>
            ))}
          </div>
        </Card>
      </div>

      {editing && (
        <PatientFormModal
          title={`Edit ${patient.name}`}
          initial={patient}
          onClose={() => setEditing(false)}
          onSave={async (values) => {
            await onUpdate(patient.id, {
              ...values,
              coordinatorName: values.assignedCoordinator,
            });
            toast.success("Patient updated");
            setEditing(false);
            await onSaved();
          }}
        />
      )}
    </motion.div>
  );
}

function SyncResultModal({
  result,
  onClose,
}: {
  result: {
    patientName: string;
    ok: boolean;
    message: string;
    score: number;
    readinessStatus: string;
    missingItems: string[];
    riskLevel: string;
    recommendedActions: string[];
  };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-lg p-5">
        <h3 className="text-lg font-semibold">Readiness Result - {result.patientName}</h3>
        <p className="mt-2 text-sm text-zinc-300">{result.message}</p>
        <p className="mt-2 text-sm">Readiness: <span className="text-cyan-300">{result.readinessStatus}</span></p>
        <p className="text-sm">Score: {result.score}%</p>
        <p className="text-sm">Risk Level: {result.riskLevel}</p>
        <p className="mt-2 text-sm font-medium">Missing Items</p>
        <ul className="text-xs text-zinc-400">
          {result.missingItems.length ? result.missingItems.map((item) => <li key={item}>- {item}</li>) : <li>- None</li>}
        </ul>
        <p className="mt-2 text-sm font-medium">Recommended Next Actions</p>
        <ul className="text-xs text-zinc-400">
          {result.recommendedActions.map((item) => <li key={item}>- {item}</li>)}
        </ul>
        <p className="mt-2 text-xs text-zinc-500">
          Prepared for official workflow. Ready for HealthTürkiye/USHAŞ manual submission when all requirements are complete.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none ring-cyan-400 focus:ring-1";
