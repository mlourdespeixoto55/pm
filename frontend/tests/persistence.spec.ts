import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const makeChanges = async (page: Page) => {
  const firstColumn = page.getByTestId("column-col-backlog");
  await firstColumn.getByLabel("Column title").fill("Persisted column");
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Persisted card");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await page
    .getByTestId("card-card-6")
    .getByRole("button", { name: /delete qa micro-interactions/i })
    .click();
  await page.waitForLoadState("networkidle");
};

const expectChanges = async (page: Page) => {
  const firstColumn = page.getByTestId("column-col-backlog");
  await expect(firstColumn.getByLabel("Column title")).toHaveValue("Persisted column");
  await expect(firstColumn.getByText("Persisted card")).toBeVisible();
  await expect(page.getByTestId("card-card-6")).toHaveCount(0);
};

test("changes persist after reload", async ({ page }) => {
  await signIn(page);
  await makeChanges(page);
  await page.reload();
  await expectChanges(page);
});

test("changes persist after container restart", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await makeChanges(page);

  execSync("docker restart pm-app");
  await expect
    .poll(
      async () => {
        try {
          return (await page.request.get("/api/health")).status();
        } catch {
          return 0;
        }
      },
      { timeout: 60_000 }
    )
    .toBe(200);

  await page.reload();
  await expectChanges(page);
});
