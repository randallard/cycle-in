// ADR-0019: axe against every view, in the states a person actually sees. Any WCAG 2.1 A/AA
// violation fails, with axe's own description of what and where.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const summary = violations.map(
    (v) => `${v.id} (${v.impact ?? "?"}): ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`
  );
  expect(summary).toEqual([]);
}

async function addItem(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Add item…" }).click();
  await page.locator('form[data-form="add"] input[name="name"]').fill(name);
  await page.locator('form[data-form="add"] input[name="category"]').fill("music");
  await page.locator('form[data-form="add"] button[type="submit"]').click();
  await expect(page.getByRole("link", { name })).toBeVisible();
}

test("the empty board", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByText("Nothing in rotation yet")).toBeVisible();
  await expectNoViolations(page);
});

test("the add-item form", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Add item…" }).click();
  await expect(page.locator('form[data-form="add"]')).toBeVisible();
  await expectNoViolations(page);
});

test("the board with an item, and its verbs open", async ({ page }) => {
  await page.goto("./");
  await addItem(page, "Scales");
  await expectNoViolations(page);
  await page.locator('[data-action="toggle-verbs"]').first().click();
  await expectNoViolations(page);
});

test("an item's detail view", async ({ page }) => {
  await page.goto("./");
  await addItem(page, "Scales");
  await page.getByRole("link", { name: "Scales" }).click();
  await expect(page).toHaveURL(/#item\//);
  await expectNoViolations(page);
});

test("the history view", async ({ page }) => {
  await page.goto("./");
  await addItem(page, "Scales");
  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(/#history/);
  await expectNoViolations(page);
});
