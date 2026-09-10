const fs = require("node:fs");
const path = require("node:path");

const playwrightModule = process.env.PLAYWRIGHT_MODULE;
const chromeExecutable = process.env.CHROME_EXECUTABLE ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetUrl = process.env.MECHANICAL_URL ?? "http://127.0.0.1:4173";
const outputDirectory = path.resolve(process.env.MECHANICAL_OUTPUT ?? "docs/testing-assets");
const expectStaleSummary = process.env.MECHANICAL_EXPECT_STALE === "1";

if (!playwrightModule) {
  throw new Error("Set PLAYWRIGHT_MODULE to the installed Playwright package path.");
}

const { chromium } = require(playwrightModule);

(async () => {
  fs.mkdirSync(outputDirectory, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromeExecutable,
    headless: true,
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "DETENER PILOTO" }).waitFor();

    await page.getByRole("button", { name: "Generar resumen simulado con IA" }).click();
    await page.getByLabel("Estado del financiamiento").selectOption("committed");
    await page.waitForTimeout(650);

    const staleTitle = page.getByText("Se identificaron 7 condiciones que impiden iniciar.", { exact: true });
    const staleTitleCount = await staleTitle.count();

    if (expectStaleSummary) {
      if (staleTitleCount === 0) {
        throw new Error("Expected the deployed before-fix build to render the stale seven-condition summary.");
      }
      await page.locator(".ai-card").screenshot({ path: path.join(outputDirectory, "stale-ai-summary.png") });
      return;
    }

    if (staleTitleCount > 0 || (await page.locator(".ai-result").count()) > 0) {
      throw new Error("A summary from the invalidated request appeared after the questionnaire changed.");
    }

    await page.locator(".ai-card").screenshot({ path: path.join(outputDirectory, "cancelled-request.png") });

    await page.getByRole("button", { name: "Generar resumen simulado con IA" }).click();
    await page.getByText("Se identificaron 6 condiciones que impiden iniciar.", { exact: true }).waitFor();
    await page.locator(".ai-card").screenshot({ path: path.join(outputDirectory, "fresh-summary.png") });

    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await mobilePage.goto(targetUrl, { waitUntil: "networkidle" });
    await mobilePage.getByText("Datos sintéticos", { exact: true }).waitFor();
    await mobilePage.getByRole("heading", { name: "¿La ruta completa existe hoy?" }).waitFor();
    await mobilePage.getByRole("heading", { name: "DETENER PILOTO" }).waitFor();
    if ((await mobilePage.locator(".section-card").count()) !== 6) {
      throw new Error("The mobile checklist did not expose all six required sections.");
    }
    await mobilePage.screenshot({ path: path.join(outputDirectory, "mobile-smoke.png"), fullPage: true });
  } finally {
    await browser.close();
  }
})();
