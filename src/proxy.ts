import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16: "proxy" is the new name of "middleware".
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Every path except static files and images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
