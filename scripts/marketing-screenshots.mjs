import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.FORTH_SCREENSHOT_URL ?? "http://127.0.0.1:3100";
const OUT_DIR = resolve(process.cwd(), "marketing", "screenshots");

const shots = [
  { name: "01-landing.png", kind: "landing" },
  { name: "02-dashboard.png", kind: "dashboard" },
  { name: "03-quest-log.png", kind: "quest-log" },
  { name: "04-create-quest-modal.png", kind: "create-quest-modal" },
  { name: "05-quest-details.png", kind: "quest-details" },
  { name: "06-retro-ui.png", kind: "retro-ui" },
  { name: "07-mobile-quest-log.png", kind: "mobile-quest-log", mobile: true },
];

async function settle(page) {
  await page.evaluate(async () => {
    const fonts = document.fonts;
    if (fonts?.ready) await fonts.ready;
    await Promise.all(
      Array.from(document.images).map(async (img) => {
        if (img.complete) return;
        await new Promise((resolve) => img.addEventListener("load", resolve, { once: true }));
      }),
    );
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function maybeDismissWelcome(page) {
  await page.evaluate(() => {
    for (const dialog of Array.from(document.querySelectorAll("dialog[open]"))) {
      dialog.close();
    }
  });
  await settle(page);
}

async function openDemo(page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await settle(page);
  await maybeDismissWelcome(page);
  const demoButton = page.getByRole("button", { name: /Explore local demo/i });
  await demoButton.click();
  await page.waitForLoadState("networkidle");
  await settle(page);
  await maybeDismissWelcome(page);
}

async function capture(page, fileName) {
  await page.screenshot({
    path: resolve(OUT_DIR, fileName),
    fullPage: false,
    animations: "disabled",
  });
}

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_BROWSER_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

await page.addStyleTag({
  content: `
    html, body, * { cursor: none !important; }
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-delay: 0ms !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  `,
});

for (const shot of shots) {
  if (shot.mobile) {
    await page.setViewportSize({ width: 390, height: 844 });
  } else {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }

  if (shot.kind === "landing") {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await settle(page);
    await maybeDismissWelcome(page);
  } else {
    await openDemo(page);

    if (shot.kind === "quest-log" || shot.kind === "mobile-quest-log") {
      await page.getByRole("button", { name: "Tickets", exact: true }).click();
      await settle(page);
    }

    if (shot.kind === "create-quest-modal") {
      await page.getByRole("button", { name: /New ticket/i }).click();
      await settle(page);
    }

    if (shot.kind === "quest-details") {
      await page.getByRole("button", { name: /Edit/i }).first().click();
      await settle(page);
    }

    if (shot.kind === "retro-ui") {
      await page.getByRole("button", { name: /Workspace & team/i }).click();
      await settle(page);
    }
  }

  await capture(page, shot.name);
}

await browser.close();
