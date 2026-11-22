import { describe, expect, it } from "vitest";

import { buildNewLeadEmail, escapeHtml, summaryLines } from "./new-lead";

const base = {
  brokerName: "Diego",
  projectName: "Residencial Casa Nova",
  unitNumber: "902",
  lead: {
    name: "Maria Souza",
    phone: "+5511988887777",
    email: "maria@exemplo.com",
    message: "Tem vaga coberta?",
    origin: "instagram",
  },
  summary: {
    units: ["902", "1002"],
    rooms: ["Sala", "Suíte"],
    seconds: 480,
    walked: true,
    days: 2,
  },
  panelUrl: "https://vitrine3d.example/painel",
};

describe("e-mail de novo lead", () => {
  it("assunto, contato, interesse e o que a pessoa viu", () => {
    const email = buildNewLeadEmail(base);
    expect(email.subject).toBe(
      "Novo interessado: Maria Souza – Residencial Casa Nova, unidade 902",
    );
    expect(email.text).toContain("Telefone: (11) 98888-7777");
    expect(email.text).toContain("Veio de: instagram");
    expect(email.text).toContain("Mensagem:\nTem vaga coberta?");
    expect(email.text).toContain("- Unidades abertas: 902, 1002");
    expect(email.text).toContain("- Tempo no tour: 8 min");
    expect(email.text).toContain("- Caminhou por dentro da unidade em 3D");
    expect(email.text).toContain("- Visitou em 2 dias diferentes");
    expect(email.html).toContain("Responder no WhatsApp");
    expect(email.html).toContain("https://wa.me/5511988887777?text=Ol%C3%A1");
  });

  it("termômetro com o motivo no e-mail (texto e HTML)", () => {
    const email = buildNewLeadEmail({
      ...base,
      summary: { ...base.summary, walkedIn: "902" },
    });
    // 8 min (2) + caminhou (2) + 2 dias (2) + 2 unidades (1) + 2 cômodos (0) = 7
    expect(email.text).toContain(
      "Termômetro: Quente: voltou em outro dia, caminhou por dentro da unidade 902, ficou 8 min no tour",
    );
    expect(email.html).toContain("<strong>Termômetro:</strong> Quente:");
    // Sem registro da visita: frio, com o motivo (nunca quebra).
    const cold = buildNewLeadEmail({ ...base, summary: null });
    expect(cold.text).toContain(
      "Termômetro: Frio: sem registro da visita no tour",
    );
  });

  it("texto do visitante nunca vira HTML", () => {
    const email = buildNewLeadEmail({
      ...base,
      lead: {
        ...base.lead,
        name: '<img src=x onerror="alert(1)">',
        message: "<script>alert('oi')</script>",
      },
      projectName: "A & B",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain(
      "&lt;script&gt;alert(&#39;oi&#39;)&lt;/script&gt;",
    );
    expect(email.html).toContain("A &amp; B");
  });

  it("sem telefone: sem botão de WhatsApp, painel como ação principal", () => {
    const email = buildNewLeadEmail({
      ...base,
      lead: { ...base.lead, phone: null },
      summary: null,
    });
    expect(email.html).not.toContain("wa.me");
    expect(email.text).not.toContain("O que a pessoa viu");
    expect(email.html).toContain("Abrir no painel");
  });

  it("escapa os 5 caracteres especiais", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("resumo vazio: nenhuma linha", () => {
    expect(
      summaryLines({
        units: [],
        rooms: [],
        seconds: 0,
        walked: false,
        days: 1,
      }),
    ).toEqual([]);
  });
});
