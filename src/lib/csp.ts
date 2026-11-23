// Content Security Policy (issue #86): the browser only runs scripts that
// carry this request's nonce (Next.js stamps it on its own scripts) and only
// talks to this site and to Supabase. Even if some bug let an attacker put
// HTML on a page, the browser would refuse their script.

export type CspOptions = {
  nonce: string;
  /** NEXT_PUBLIC_SUPABASE_URL (images from Storage, API and auth calls). */
  supabaseUrl?: string;
  /** `next dev` needs eval (React debugging) and a websocket (hot reload). */
  dev?: boolean;
};

/** A fresh random nonce (128 bits, base64), one per request. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildCsp({ nonce, supabaseUrl, dev = false }: CspOptions) {
  const supabase = originOf(supabaseUrl);
  // Realtime/auth may use the websocket version of the same address.
  const supabaseWs = supabase?.replace(/^http/, "ws");
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic': a script with the nonce may load the site's chunks.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    // Tailwind, the 3D labels and toasts set inline styles: allowed (styles
    // can't run code).
    "style-src": ["'self'", "'unsafe-inline'"],
    // Photos from Storage; blob:/data: for the upload preview and 3D textures.
    "img-src": ["'self'", "blob:", "data:", ...(supabase ? [supabase] : [])],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(supabase ? [supabase] : []),
      ...(supabaseWs ? [supabaseWs] : []),
      ...(dev ? ["ws:"] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** Report-only (CSP_REPORT_ONLY=1): logs violations without blocking. */
export function cspHeaderName(reportOnly: boolean) {
  return reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
}
