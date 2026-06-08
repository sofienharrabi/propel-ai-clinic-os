import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api");

  if (isProtectedPath && !user) {
    return pathname.startsWith("/api")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  if (isProtectedPath && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", user.id)
      .single();

    if (profile?.clinic_id) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("subscription_status, trial_ends_at")
        .eq("id", profile.clinic_id)
        .single();

      if (clinic) {
        const isSuspended = clinic.subscription_status === "suspended";
        const isTrialExpired =
          clinic.subscription_status === "trial" &&
          clinic.trial_ends_at &&
          new Date(clinic.trial_ends_at) < new Date();

        if (isSuspended || isTrialExpired) {
          if (pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Subscription suspended" }, { status: 402 });
          }
          return NextResponse.redirect(new URL("/suspended", request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
