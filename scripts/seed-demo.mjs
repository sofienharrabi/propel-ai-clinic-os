import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const patients = [
  ["Elena Rossi", "Italy", "Dental Implant", "approved"],
  ["Mohammed Al Rahman", "UAE", "Hair Transplant", "pending"],
  ["Claire Dupont", "France", "Bariatric Surgery", "rejected"],
  ["George Smith", "UK", "Rhinoplasty", "pending"],
  ["Layla Haddad", "Jordan", "IVF", "approved"],
  ["Amina Benali", "Morocco", "Orthopedic Surgery", "pending"],
  ["Nour Saleh", "Saudi Arabia", "Cardiology Checkup", "approved"],
  ["Luca Bianchi", "Italy", "Eye Surgery", "rejected"],
];

async function run() {
  const { data: clinic } = await supabase.from("clinics").insert({ name: "Propel Demo Clinic" }).select("id").single();
  if (!clinic) throw new Error("Failed to create clinic");

  for (const [name, nationality, treatmentType, doctorReview] of patients) {
    const { data: patient } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinic.id,
        name,
        nationality,
        treatment_type: treatmentType,
        stage: "Coordinator Review",
        doctor_review_status: doctorReview,
        coordinator_name: "Demo Coordinator",
        revenue_estimate: Math.floor(Math.random() * 12000) + 3000,
        compliance_score: Math.floor(Math.random() * 100),
        readiness_status: "incomplete",
        sync_ready: false,
      })
      .select("id")
      .single();

    if (!patient) continue;
    await supabase.from("audit_events").insert([
      {
        clinic_id: clinic.id,
        patient_id: patient.id,
        actor_label: "Demo Seeder",
        action: "patient_created",
        description: `Created demo patient ${name}`,
        metadata: {},
      },
      {
        clinic_id: clinic.id,
        patient_id: patient.id,
        actor_label: "Demo Seeder",
        action: "doctor_review_requested",
        description: `Doctor review status set to ${doctorReview}`,
        metadata: { doctorReview },
      },
    ]);
  }

  console.log("Demo clinic and 8 patients seeded.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
