import { expect, type Page } from "@playwright/test";
import { initialBoard } from "../src/test/board";
import type { BoardData } from "../src/lib/kanban";

export const columns = (page: Page) => page.locator('[data-testid^="column-"]');

// A separate user, so the tests never touch the real "user" board.
export const TEST_USER = "e2e";

export const resetBoard = async (page: Page, board: BoardData = initialBoard) => {
  const response = await page.request.put(`/api/users/${TEST_USER}/board`, { data: board });
  expect(response.ok()).toBe(true);
};

// The login form only accepts "user", so sign in through localStorage instead.
export const signIn = async (page: Page, board?: BoardData) => {
  await resetBoard(page, board);
  await page.goto("/");
  await page.evaluate((user) => localStorage.setItem("pm-user", user), TEST_USER);
  await page.reload();
  await expect(columns(page)).toHaveCount(5);
};
