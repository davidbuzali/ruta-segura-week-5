const fs = require("node:fs");
const path = require("node:path");

const playwrightModule = process.env.PLAYWRIGHT_MODULE;
const chromeExecutable = process.env.CHROME_EXECUTABLE ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetUrl = process.env.PERSONA_URL ?? "http://127.0.0.1:4173";
const outputDirectory = path.resolve(process.env.PERSONA_OUTPUT ?? "docs/persona-assets");
const staleActionNote = "Actualizar la carta de la ruta y registrar quién verificó su vigencia antes de reevaluar.";
const expectStaleDraft = process.env.PERSONA_EXPECT_STALE === "1";

if (!playwrightModule) {
  throw new Error("Set PLAYWRIGHT_MODULE to the installed Playwright package path.");
}

const { chromium } = require(playwrightModule);

async function capture(page, filename, locator) {
  const target = locator ?? page;
  await target.screenshot({ path: path.join(outputDirectory, filename) });
}

(async () => {
  fs.mkdirSync(outputDirectory, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromeExecutable,
    headless: true,
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    await page.getByText("Compromiso de financiamiento", { exact: true }).waitFor();
    await page.getByText("Referencia técnica: funding.fundingStatus", { exact: true }).waitFor();
    if (await page.locator(".issue-list strong", { hasText: "funding.fundingStatus" }).count()) {
      throw new Error("The decision card still presents an internal field path as its primary label.");
    }

    await capture(page, "01-incomplete-case.png");

    await page.getByLabel("Estado del financiamiento").selectOption("committed");
    await capture(page, "02-evidence-entry.png", page.locator("#section-editor"));
    await capture(page, "03-stop-result.png", page.locator(".decision-card"));

    await page.getByRole("button", { name: "Generar resumen simulado con IA" }).click();
    await page.getByText(/Se identificaron \d+ condiciones/).waitFor();
    if (await page.locator(".ai-result", { hasText: "Verificar y corregir route.evidence.verifiedAt" }).count()) {
      throw new Error("The simulated-AI guidance still exposes an internal field path.");
    }
    await capture(page, "04-simulated-ai-summary.png", page.locator(".ai-card"));

    await page.getByLabel("Responsable").selectOption({ label: "Operaciones clínicas" });
    await page.getByLabel("Acción").selectOption({ label: "Solicitar evidencia" });
    await page.getByLabel("Nota breve").fill(staleActionNote);
    await page.getByRole("button", { name: "Guardar acción" }).click();
    await capture(page, "05-assigned-next-action.png", page.locator(".action-card"));

    await page.getByLabel(/Caso de práctica/).selectOption("SYN-CDMX-001");
    const staleNoteCount = await page.getByText(staleActionNote, { exact: true }).count();
    if (expectStaleDraft && staleNoteCount === 0) {
      throw new Error("The expected before-fix stale action note was not visible.");
    }
    if (!expectStaleDraft && staleNoteCount > 0) {
      throw new Error("The prior case's action note remained visible after the case changed.");
    }
    if (!expectStaleDraft) {
      await page.getByText("Las seis condiciones están verificadas. Completa la confirmación humana para habilitar la simulación.").waitFor();
    }
    await page.getByLabel("Confirmo que revisé las seis condiciones y su evidencia.").check();
    await page.getByRole("heading", { name: expectStaleDraft ? "LISTO PARA SIMULACIÓN" : "LISTO PARA SIMULACIÓN DEL PILOTO" }).waitFor();
    await capture(page, "06-complete-case.png", page.locator(".decision-column"));
  } finally {
    await browser.close();
  }
})();
