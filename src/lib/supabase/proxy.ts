import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";

const PROTECTED_PREFIX = "/painel";
const AUTH_PAGES = ["/entrar", "/cadastro"];

/**
 * Runs on every request (src/proxy.ts): refreshes the Supabase session cookies
 * and does the "optimistic" redirects. The panel ALSO checks the user on the
 * server (Next.js: proxy is not a full authorization solution).
 * Based on the official example: supabase/examples/auth/nextjs.
 */
export async function updateSession(request: NextRequest) {
  let env;
  try {
    env = getPublicEnv();
  } catch {
    // Without Supabase env vars (e.g. a fresh machine), don't take the whole
    // site down: pages that need login check it themselves on the server.
    return NextResponse.next({ request });
  }
  let supabaseResponse = NextResponse.next({ request });

  // Create a new client per request (never share it between requests).
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims(): it refreshes
  // the session; without it users may be logged out at random.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const response = NextResponse.redirect(url);
    // Keep the refreshed session cookies on the redirect.
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  if (
    !isLoggedIn &&
    (pathname === PROTECTED_PREFIX ||
      pathname.startsWith(`${PROTECTED_PREFIX}/`))
  ) {
    return redirectTo("/entrar");
  }
  if (isLoggedIn && AUTH_PAGES.includes(pathname)) {
    return redirectTo(PROTECTED_PREFIX);
  }

  // Return supabaseResponse as is (it carries the refreshed cookies).
  return supabaseResponse;
}
