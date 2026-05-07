import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error(`NEXT_PUBLIC_SUPABASE_URL exists: ${Boolean(url)}`);
  console.error(`SUPABASE_SERVICE_ROLE_KEY exists: ${Boolean(key)}`);
  process.exit(1);
}

const supabase = createClient(url, key, {
  realtime: {
    transport: WebSocket,
  },
});

const DEMO_CLINIC_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_COORDINATOR = "Demo Coordinator";

const patients = [
  {
    name: "Elena Rossi",
    nationality: "Italy",
    treatment_type: "Dental implants",
    stage: "Coordinator Review",
    doctor_review_status: "pending",
    readiness_status: "critical",
    notes: "Missing passport",
    compliance_score: 52,
    revenue_estimate: 14000,
  },
  {
    name: "Jean-Pierre Dubois",
    nationality: "France",
    treatment_type: "Hair transplant",
    stage: "Doctor Review",
    doctor_review_status: "pending",
    readiness_status: "incomplete",
    notes: "Doctor review pending",
    compliance_score: 61,
    revenue_estimate: 9000,
  },
  {
    name: "Sarah Mitchell",
    nationality: "UK",
    treatment_type: "Full-mouth reconstruction",
    stage: "Compliance Check",
    doctor_review_status: "approved",
    readiness_status: "critical",
    notes: "Missing translation",
    compliance_score: 58,
    revenue_estimate: 22000,
  },
  {
    name: "Hans Weber",
    nationality: "Germany",
    treatment_type: "Dental restoration",
    stage: "Booking",
    doctor_review_status: "approved",
    readiness_status: "ready",
    notes: "Deposit paid - ready",
    compliance_score: 90,
    revenue_estimate: 17500,
  },
  {
    name: "Ahmed Ben Ali",
    nationality: "Tunisia",
    treatment_type: "Rhinoplasty",
    stage: "Document Collection",
    doctor_review_status: "pending",
    readiness_status: "incomplete",
    notes: "Waiting documents",
    compliance_score: 65,
    revenue_estimate: 11000,
  },
  {
    name: "Layla Mansour",
    nationality: "UAE",
    treatment_type: "Veneers",
    stage: "New Lead",
    doctor_review_status: "pending",
    readiness_status: "incomplete",
    notes: "New lead",
    compliance_score: 71,
    revenue_estimate: 8000,
  },
];

async function upsertPatient(patient) {
  const { data: existing, error: findError } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", DEMO_CLINIC_ID)
    .eq("name", patient.name)
    .maybeSingle();

  if (findError) throw findError;

  const payload = {
    clinic_id: DEMO_CLINIC_ID,
    name: patient.name,
    nationality: patient.nationality,
    treatment_type: patient.treatment_type,
    stage: patient.stage,
    doctor_review_status: patient.doctor_review_status,
    readiness_status: patient.readiness_status,
    coordinator_name: DEMO_COORDINATOR,
    notes: patient.notes,
    compliance_score: patient.compliance_score,
    revenue_estimate: patient.revenue_estimate,
    sync_ready: false,
  };

  if (existing?.id) {
    const { error: updateError } = await supabase.from("patients").update(payload).eq("id", existing.id);
    if (updateError) throw updateError;
    return { id: existing.id, mode: "updated" };
  }

  const { data: created, error: insertError } = await supabase.from("patients").insert(payload).select("id").single();
  if (insertError || !created) throw insertError ?? new Error("Failed to insert patient");
  return { id: created.id, mode: "inserted" };
}

async function run() {
  let inserted = 0;
  let updated = 0;

  for (const patient of patients) {
    const result = await upsertPatient(patient);
    if (result.mode === "inserted") inserted += 1;
    if (result.mode === "updated") updated += 1;
  }

  console.log(
    `Demo patients seed complete for clinic ${DEMO_CLINIC_ID}. Inserted: ${inserted}, Updated: ${updated}, Total configured: ${patients.length}.`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
