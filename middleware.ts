import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, response } = updateSession(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isApiPath = pathname.startsWith("/api");
  const isDashboardPath = pathname.startsWith("/dashboard");

  if (isApiPath && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isDashboardPath && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};