import { interestLine, interestOf } from "@/lib/leads/interest";
import {
  durationLabel,
  type SessionSummary,
} from "@/lib/leads/session-summary";
import { whatsappLink } from "@/lib/tour/whatsapp";
import { formatPhone } from "@/lib/validacoes/perfil";

// The new-lead e-mail to the broker (issue #70). Pure: builds subject, HTML
// and plain text. EVERYTHING typed by the visitor (name, message...) or the
// broker (project name) is escaped: it is shown as text, never as HTML.

export type NewLeadEmail = {
  brokerName: string;
  projectName: string;
  unitNumber: string | null;
  lead: {
    name: string;
    phone: string | null; // E.164
    email: string | null;
    message: string | null;
    origin: string | null;
  };
  summary: SessionSummary | null;
  panelUrl: string;
};

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** One line per thing seen in the visit, in plain Portuguese. */
export function summaryLines(summary: SessionSummary | null): string[] {
  if (!summary) return [];
  const lines: string[] = [];
  if (summary.units.length)
    lines.push(
      `Unidades abertas: ${summary.units.slice(0, 5).join(", ")}${summary.units.length > 5 ? "…" : ""}`,
    );
  if (summary.rooms.length)
    lines.push(
      `Cômodos vistos: ${summary.rooms.slice(0, 8).join(", ")}${summary.rooms.length > 8 ? "…" : ""}`,
    );
  if (summary.seconds)
    lines.push(`Tempo no tour: ${durationLabel(summary.seconds)}`);
  if (summary.walked) lines.push("Caminhou por dentro da unidade em 3D");
  if (summary.days > 1)
    lines.push(`Visitou em ${summary.days} dias diferentes`);
  return lines;
}

export function buildNewLeadEmail(input: NewLeadEmail) {
  const { lead, projectName, unitNumber } = input;
  const where = unitNumber
    ? `${projectName}, unidade ${unitNumber}`
    : projectName;
  // One line, cut by characters (an emoji is never split in half).
  const subject = Array.from(
    `Novo interessado: ${lead.name} – ${where}`.replace(/\s+/g, " "),
  )
    .slice(0, 200)
    .join("");
  // Answer on WhatsApp, already greeting by name.
  const reply = whatsappLink(
    lead.phone,
    `Olá, ${lead.name}! Aqui é ${input.brokerName}, sobre o seu interesse no ${where}.`,
  );
  const rows: [string, string][] = [
    ["Nome", lead.name],
    ...(lead.phone
      ? ([["Telefone", formatPhone(lead.phone)]] as [string, string][])
      : []),
    ...(lead.email ? ([["E-mail", lead.email]] as [string, string][]) : []),
    ["Interesse", where],
    ...(lead.origin ? ([["Veio de", lead.origin]] as [string, string][]) : []),
  ];
  // The thermometer: hot, warm or cold, with WHY (same rule as the panel).
  const temperature = interestLine(interestOf(input.summary));
  const visit = summaryLines(input.summary);

  const text = [
    `Olá, ${input.brokerName}! Você tem um novo interessado pelo tour 3D.`,
    "",
    `Termômetro: ${temperature}`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(lead.message ? ["", "Mensagem:", lead.message] : []),
    ...(visit.length
      ? ["", "O que a pessoa viu:", ...visit.map((l) => `- ${l}`)]
      : []),
    "",
    ...(reply ? [`Responder no WhatsApp: ${reply}`] : []),
    `Abrir no painel: ${input.panelUrl}`,
  ].join("\n");

  const e = escapeHtml;
  const button = (href: string, label: string, primary: boolean) =>
    `<a href="${e(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;${
      primary
        ? "background:#1a7f4b;color:#ffffff"
        : "background:#ffffff;color:#17202b;border:1px solid #d6d3cd"
    }">${e(label)}</a>`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f2f1ee;font-family:Arial,Helvetica,sans-serif;color:#17202b">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-radius:12px;padding:24px">
<p style="margin:0 0 4px;font-size:13px;color:#5b6573">Vitrine 3D</p>
<h1 style="margin:0 0 8px;font-size:20px">Novo interessado: ${e(lead.name)}</h1>
<p style="margin:0 0 16px;font-size:15px"><strong>Termômetro:</strong> ${e(temperature)}</p>
<table role="presentation" style="border-collapse:collapse;width:100%;font-size:15px">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#5b6573;white-space:nowrap;vertical-align:top">${e(label)}</td><td style="padding:4px 0">${e(value)}</td></tr>`,
    )
    .join("")}</table>
${lead.message ? `<p style="margin:16px 0 4px;color:#5b6573;font-size:13px">Mensagem</p><p style="margin:0;white-space:pre-line">${e(lead.message)}</p>` : ""}
${visit.length ? `<p style="margin:16px 0 4px;color:#5b6573;font-size:13px">O que a pessoa viu</p><ul style="margin:0;padding-left:20px">${visit.map((l) => `<li>${e(l)}</li>`).join("")}</ul>` : ""}
<p style="margin:20px 0 0">${reply ? button(reply, "Responder no WhatsApp", true) : ""}${button(input.panelUrl, "Abrir no painel", !reply)}</p>
</div>
<p style="font-size:12px;color:#5b6573;margin:12px 4px 0">O aviso de novos interessados está ligado no seu perfil da Vitrine 3D. Para desligar, abra o perfil no painel.</p>
</div></body></html>`;
  return { subject, text, html };
}
