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
  await page.getByRole("dialog", { name: "Welcome to Forth" }).getByRole("button", { name: "Start planning" }).click();
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
    const guide = page.getByRole("dialog", { name: "Welcome to Forth" });
    await expect(guide).toBeVisible();
    const guideBox = await guide.boundingBox();
    expect(guideBox?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect(guideBox?.width ?? viewport.width + 1).toBeLessThanOrEqual(viewport.width);
    expect(guideBox?.height ?? viewport.height + 1).toBeLessThanOrEqual(viewport.height);
    const startPlanning = guide.getByRole("button", { name: "Start planning" });
    await startPlanning.scrollIntoViewIfNeeded();
    expect((await startPlanning.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await startPlanning.click();

    const demoMetrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(demoMetrics.scrollWidth).toBeLessThanOrEqual(demoMetrics.clientWidth + 1);
    await expect(page.getByRole("button", { name: "New quest" })).toBeVisible();

    const focusPanel = page.locator(".focus-panel--primary");
    const pacePanel = page.locator(".pace-panel");
    const firstQuest = focusPanel.locator(".focus-task").first();
    const focusBox = await focusPanel.boundingBox();
    const paceBox = await pacePanel.boundingBox();
    const firstQuestBox = await firstQuest.boundingBox();
    expect(focusBox?.y ?? Number.MAX_SAFE_INTEGER).toBeLessThan(paceBox?.y ?? 0);
    expect(firstQuestBox?.y ?? Number.MAX_SAFE_INTEGER).toBeLessThan(viewport.height * 1.75);
    await expect(focusPanel.getByRole("button", { name: "Add ticket" })).toBeVisible();
    await expect(focusPanel.getByRole("button", { name: "Find tickets" })).toBeVisible();
    await expect(page.locator("details.guild-progress")).toHaveJSProperty("open", false);
  });
}

test("keeps task actions first and persists the optional Guild progress drawer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore local demo" }).click();
  await page.getByRole("dialog", { name: "Welcome to Forth" }).getByRole("button", { name: "Start planning" }).click();

  const focusPanel = page.locator(".focus-panel--primary");
  await expect(focusPanel.getByRole("heading", { name: "Today’s three quests" })).toBeVisible();
  await expect(page.getByText("Workspace: Disposable demo")).toBeVisible();

  const guildProgress = page.locator("details.guild-progress");
  await expect(guildProgress).toHaveJSProperty("open", false);
  await guildProgress.locator("summary").click();
  await expect(guildProgress).toHaveJSProperty("open", true);
  await expect(guildProgress.getByRole("heading", { name: "Code Squire" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("forth.guild-progress.v1.demo"))).toBe("open");

  await page.getByRole("button", { name: "Guild Hall" }).click();
  await page.getByRole("button", { name: "Exit demo" }).click();
  await page.getByRole("button", { name: "Explore local demo" }).click();
  await expect(page.locator("details.guild-progress")).toHaveJSProperty("open", true);
});

test("entry controls have a visible keyboard path", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const firstInteractive = page.locator(":focus");
  await expect(firstInteractive).toBeVisible();
  await expect(firstInteractive).toHaveAccessibleName(/Continue with Google|Continue with GitHub|Explore local demo/);

  await page.getByRole("button", { name: "Explore local demo" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Welcome to Forth" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Today’s quests." })).toBeVisible();
});

test("explains disposable demo data and reopens the guide from Guild Hall", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore local demo" }).click();

  const guide = page.getByRole("dialog", { name: "Welcome to Forth" });
  await expect(guide).toBeVisible();
  await expect(guide.getByText("Disposable browser demo", { exact: true })).toBeVisible();
  await expect(guide.getByText(/never sync to Firebase or enter your real workspace/i)).toBeVisible();
  await expect(guide.getByRole("listitem")).toHaveCount(5);
  await expect(guide.getByText("Use the Realm Map (Kanban board)", { exact: true })).toBeVisible();

  await guide.getByRole("button", { name: "Start planning" }).click();
  await expect(guide).not.toBeVisible();

  await page.getByRole("button", { name: "Guild Hall" }).click();
  const reopen = page.getByRole("button", { name: "How Forth works" });
  await expect(reopen).toBeVisible();
  expect((await reopen.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await reopen.click();
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "Close welcome guide" }).click();
  await expect(reopen).toBeFocused();

  await page.getByRole("button", { name: "Exit demo" }).click();
  await page.getByRole("button", { name: "Explore local demo" }).click();
  await expect(guide).not.toBeVisible();
});
