"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Email+and+password+are+required");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const clinicName = String(formData.get("clinicName") ?? "").trim();

  if (!email || !password || !fullName || !clinicName) {
    redirect("/login?tab=signup&error=All+fields+are+required");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    redirect(`/login?tab=signup&error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .insert({ name: clinicName })
      .select("id")
      .single();

    if (clinicError || !clinic) {
      redirect(`/login?tab=signup&error=${encodeURIComponent("Failed to create clinic. Please try again.")}`);
    }

    await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      role: "admin",
      clinic_id: clinic.id,
    });
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
