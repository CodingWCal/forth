import { expect, test } from "@playwright/test";

async function enterDemo(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore local demo" }).click();
  await page
    .getByRole("dialog", { name: "Welcome to Forth" })
    .getByRole("button", { name: "Start planning" })
    .click();
}

test("Tickets project tabs follow WAI-ARIA keyboard pattern", async ({ page }) => {
  await enterDemo(page);
  await page.getByRole("button", { name: "Tickets", exact: true }).click();

  const tablist = page.getByRole("tablist", { name: "Projects" });
  await expect(tablist).toBeVisible();

  const first = page.getByRole("tab", { name: "Forth Core" });
  const second = page.getByRole("tab", { name: "Cloud Keep" });
  const last = page.getByRole("tab", { name: "Release Gate" });

  await expect(first).toHaveAttribute("aria-selected", "true");
  await expect(first).toHaveAttribute("tabindex", "0");
  await expect(second).toHaveAttribute("tabindex", "-1");
  await expect(last).toHaveAttribute("tabindex", "-1");
  await expect(first).toHaveAttribute("aria-controls", /project-panel-/);

  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveAttribute(
    "aria-labelledby",
    await second.getAttribute("id") ?? "",
  );

  await page.keyboard.press("End");
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("Home");
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("ArrowLeft");
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-selected", "true");
});
