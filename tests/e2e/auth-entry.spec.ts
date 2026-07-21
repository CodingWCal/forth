import { expect, test } from "@playwright/test";

const SEEDED_TICKET = "Surface actionable Firebase sync errors";

test("keeps ticket data behind auth or explicit demo entry", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
  await expect(page.getByText(SEEDED_TICKET)).toHaveCount(0);
  await expect(page.getByText("Uses sample tickets stored only in this browser.")).toBeVisible();

  await page.getByRole("button", { name: "Explore local demo" }).click();
  await expect(page.getByText("Disposable demo - this device only").last()).toBeVisible();
  await expect(page.getByRole("heading", { name: SEEDED_TICKET }).first()).toBeVisible();

  await page.getByRole("button", { name: "Guild Hall" }).click();
  await page.getByRole("button", { name: "Exit demo" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  await expect(page.getByText(SEEDED_TICKET)).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  await expect(page.getByText(SEEDED_TICKET)).toHaveCount(0);
});

for (const viewport of [
  { width: 320, height: 720 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`landing and demo fit ${viewport.width}px without hidden horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const landingMetrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(landingMetrics.scrollWidth).toBeLessThanOrEqual(landingMetrics.clientWidth + 1);

    const demoButton = page.getByRole("button", { name: "Explore local demo" });
    await expect(demoButton).toBeVisible();
    expect((await demoButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await demoButton.click();

    const demoMetrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(demoMetrics.scrollWidth).toBeLessThanOrEqual(demoMetrics.clientWidth + 1);
    await expect(page.getByRole("button", { name: "New quest" })).toBeVisible();
  });
}

test("entry controls have a visible keyboard path", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const firstInteractive = page.locator(":focus");
  await expect(firstInteractive).toBeVisible();
  await expect(firstInteractive).toHaveAccessibleName(/Continue with Google|Continue with GitHub|Explore local demo/);

  await page.getByRole("button", { name: "Explore local demo" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Choose today’s three quests." })).toBeVisible();
});
