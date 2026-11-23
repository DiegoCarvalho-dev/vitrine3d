import { expect, type Page } from "@playwright/test";

import { hasSupabaseEnv, loggedInTest as test, querySql } from "./fixtures";

// CSP (issue #86): nenhuma violação no tour, na unidade (3D e caminhar), no
// login e no painel. O navegador avisa cada violação com o evento
// "securitypolicyviolation" (também no modo só relatar); o teste anota todas.

const DEMO = "residencial-demo"; // prédio do seed (npm run db:seed)

async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    const list: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = list;
    document.addEventListener("securitypolicyviolation", (event) => {
      list.push(`${event.effectiveDirective} ← ${event.blockedURI}`);
    });
  });
}

const violations = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __csp?: string[] }).__csp ?? ["sem monitor"],
  );

test.describe("Política de conteúdo (CSP)", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(150_000);

  test("tour, unidade, login e painel sem nenhuma violação", async ({
    page,
    browser,
  }, testInfo) => {
    const [unit] = querySql<{ numero: string }>(
      `select u.numero from public.unidades u join public.empreendimentos e on e.id = u.empreendimento_id
        where e.slug = '${DEMO}' and e.status = 'publicado' and u.tipologia_id is not null
        order by u.andar, u.posicao_no_andar limit 1`,
    );
    test.skip(!unit, "Sem o prédio demo publicado (rode npm run db:seed).");

    const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
      testInfo.project.use;
    const visitor = await browser.newContext({
      // Sem login (o contexto herdaria a sessão do teste).
      storageState: { cookies: [], origins: [] },
      viewport,
      userAgent,
      deviceScaleFactor,
      isMobile,
      hasTouch,
    });
    const anon = await visitor.newPage();
    await watchViolations(anon);

    // Tour do prédio: a política chega com um nonce, e os scripts o usam.
    const response = await anon.goto(`/e/${DEMO}`);
    // (Pode haver mais de uma política: a fixa do next.config e a com nonce.)
    const policy = ((await response?.headersArray()) ?? [])
      .filter((h) => h.name.toLowerCase().startsWith("content-security-policy"))
      .map((h) => h.value)
      .join(" | ");
    const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce, "política com nonce").toBeTruthy();
    expect(
      await anon.locator(`script[nonce]`).count(),
      "scripts do Next com nonce",
    ).toBeGreaterThan(0);
    await anon.waitForLoadState("networkidle");
    expect(await violations(anon), "tour do prédio").toEqual([]);

    // Unidade: vista de cima e caminhar (WebGL), se o navegador tiver.
    await anon.goto(`/e/${DEMO}/u/${unit.numero}`);
    const walk = anon.getByRole("button", { name: "Caminhar por dentro" });
    if (await walk.isVisible({ timeout: 20_000 }).catch(() => false)) {
      await walk.click();
      await expect(
        anon.locator('[data-mode="walk"]').locator("canvas"),
      ).toBeVisible({ timeout: 30_000 });
      await anon.waitForTimeout(1_000);
    }
    expect(await violations(anon), "unidade").toEqual([]);

    // Login.
    await anon.goto("/entrar");
    await expect(anon.getByLabel("E-mail")).toBeVisible();
    expect(await violations(anon), "login").toEqual([]);
    await visitor.close();

    // Painel (logado): início, empreendimentos, leads e perfil.
    await watchViolations(page);
    for (const path of [
      "/painel",
      "/painel/empreendimentos",
      "/painel/leads",
      "/painel/perfil",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await violations(page), path).toEqual([]);
    }
  });
});
