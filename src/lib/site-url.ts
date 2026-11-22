/**
 * The public address of the site, for absolute links (WhatsApp preview,
 * e-mails). NEXT_PUBLIC_SITE_URL (own domain) wins; then the Vercel
 * production URL; locally, localhost.
 */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  ).replace(/\/$/, "");
}
