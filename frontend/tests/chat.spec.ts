import { expect, test, type Page } from "@playwright/test";
import { initialBoard } from "../src/test/board";
import { columns, signIn, TEST_USER } from "./helpers";

const openChat = async (page: Page) => {
  await page.getByRole("button", { name: /ai assistant/i }).click();
  return page.getByRole("complementary", { name: /ai assistant/i });
};

test("chats with the AI and updates the board", async ({ page }) => {
  const board = structuredClone(initialBoard);
  board.cards["card-9"] = { id: "card-9", title: "Created by AI", details: "From chat." };
  board.columns[0].cardIds.push("card-9");
  const requests: unknown[] = [];
  await page.route(`**/api/users/${TEST_USER}/chat`, async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { reply: "I added the card.", board } });
  });

  await signIn(page);
  const sidebar = await openChat(page);
  await sidebar.getByLabel("Message").fill("Add a card to Backlog");
  await sidebar.getByRole("button", { name: /send/i }).click();

  await expect(sidebar.getByText("I added the card.")).toBeVisible();
  await expect(page.getByTestId("column-col-backlog").getByText("Created by AI")).toBeVisible();
  expect(requests).toEqual([{ message: "Add a card to Backlog", history: [] }]);

  await sidebar.getByRole("button", { name: /close/i }).click();
  await expect(sidebar).toHaveCount(0);
  await expect(columns(page)).toHaveCount(5);
});

test("shows an error when the AI fails", async ({ page }) => {
  await page.route(`**/api/users/${TEST_USER}/chat`, (route) => route.fulfill({ status: 502 }));

  await signIn(page);
  const sidebar = await openChat(page);
  await sidebar.getByLabel("Message").fill("Hello");
  await sidebar.getByRole("button", { name: /send/i }).click();

  await expect(sidebar.getByText(/something went wrong/i)).toBeVisible();
  await expect(page.getByTestId("card-card-1")).toContainText("Align roadmap themes");
});
