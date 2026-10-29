import { expect, test, type Locator, type Page } from "@playwright/test";
import { columns, signIn } from "./helpers";
import { initialBoard } from "../src/test/board";

const dragTo = async (page: Page, card: Locator, target: Locator, offsetY?: number) => {
  const cardBox = (await card.boundingBox())!;
  const targetBox = (await target.boundingBox())!;

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + (offsetY ?? targetBox.height / 2),
    { steps: 12 }
  );
  await page.mouse.up();
};

test("loads the kanban board", async ({ page }) => {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failed.push(response.url());
  });
  await signIn(page);
  await page.waitForLoadState("networkidle");
  expect(failed).toEqual([]);
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(columns(page)).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await signIn(page);
  const firstColumn = columns(page).first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await signIn(page);
  const targetColumn = page.getByTestId("column-col-review");
  await dragTo(page, page.getByTestId("card-card-1"), targetColumn, 120);
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
});

test("moves a card into a tall empty column", async ({ page }) => {
  // A full In Progress column makes every column tall, which is when the drop used to miss.
  const columnCards: Record<string, string[]> = {
    "col-backlog": [],
    "col-discovery": [],
    "col-progress": ["card-4", "card-5", "card-1", "card-2", "card-3"],
  };
  await signIn(page, {
    ...initialBoard,
    columns: initialBoard.columns.map((column) => ({
      ...column,
      cardIds: columnCards[column.id] ?? column.cardIds,
    })),
  });
  const targetColumn = page.getByTestId("column-col-discovery");
  await dragTo(page, page.getByTestId("card-card-4"), targetColumn);
  await expect(targetColumn.getByTestId("card-card-4")).toBeVisible();
  await expect(targetColumn.getByText("1 card", { exact: true })).toBeVisible();
});

test("edits a card", async ({ page }) => {
  await signIn(page);
  const card = page.getByTestId("card-card-1");
  await card.getByRole("button", { name: /edit align roadmap themes/i }).click();
  await card.getByLabel("Card title").fill("Edited in e2e");
  await card.getByLabel("Card details").fill("New details.");
  await card.getByRole("button", { name: /save/i }).click();
  await expect(card.getByText("Edited in e2e")).toBeVisible();
  await expect(card.getByText("New details.")).toBeVisible();
});
