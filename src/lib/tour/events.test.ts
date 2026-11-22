// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetTracking, sessionId, track } from "./events";

const project = "0d3e0000-0000-4000-8000-000000000001";

describe("envio de eventos no navegador", () => {
  const fetchMock = vi.fn(() => Promise.resolve(new Response(null)));

  beforeEach(() => {
    resetTracking();
    localStorage.clear();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("id de sessão anônimo, guardado e reaproveitado", () => {
    const id = sessionId();
    expect(id).toMatch(/^[a-f0-9]{32}$/);
    expect(sessionId()).toBe(id);
    expect(localStorage.getItem("vitrine3d:sessao")).toBe(id);
  });

  it("envia para /api/eventos com a sessão, sem repetir o mesmo evento seguido", () => {
    track({ empreendimentoId: project, tipo: "abriu_tour" });
    track({ empreendimentoId: project, tipo: "abriu_tour" }); // repetido
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/eventos");
    expect(JSON.parse(init.body as string)).toMatchObject({
      empreendimentoId: project,
      tipo: "abriu_tour",
      sessaoId: sessionId(),
    });
    // Outro evento passa.
    track({ empreendimentoId: project, tipo: "caminhou" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("não envia evento inválido (erro de programação, não do visitante)", () => {
    track({ empreendimentoId: "nao-e-uuid", tipo: "abriu_tour" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ao sair usa sendBeacon (chega mesmo com a página fechando)", () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      value: beacon,
      configurable: true,
    });
    track(
      { empreendimentoId: project, tipo: "saiu", dados: { segundos: 30 } },
      { beacon: true },
    );
    expect(beacon).toHaveBeenCalledWith("/api/eventos", expect.any(Blob));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
