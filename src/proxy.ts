import type { NextRequest } from "next/server";

import { buildCsp, createNonce, cspHeaderName } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16: "proxy" is the new name of "middleware".
export async function proxy(request: NextRequest) {
  // CSP with a fresh nonce per request (issue #86). Next.js reads the policy
  // from the REQUEST header and stamps the nonce on its scripts; the browser
  // gets the same policy in the response.
  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    dev: process.env.NODE_ENV === "development",
  });
  const header = cspHeaderName(process.env.CSP_REPORT_ONLY === "1");
  request.headers.set(header, csp);

  const response = await updateSession(request);
  response.headers.set(header, csp);
  return response;
}

export const config = {
  // Every path except Next's static files and files at the site ROOT
  // (favicon.ico, robots.txt...). A page like /e/x.png still goes through
  // here and gets the CSP (issue #86 review).
  matcher: [
    "/((?!_next/static|_next/image|[^/]+\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
