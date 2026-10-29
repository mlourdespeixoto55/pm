import { expect, test, type Page } from "@playwright/test";
import { columns, signIn } from "./helpers";

const submitLogin = async (page: Page, password: string) => {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
};

test("shows the login screen first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(columns(page)).toHaveCount(0);
});

test("rejects wrong credentials", async ({ page }) => {
  await submitLogin(page, "nope");
  await expect(page.getByText("Invalid username or password.")).toBeVisible();
  await expect(columns(page)).toHaveCount(0);
});

test("signs in and stays signed in after reload", async ({ page }) => {
  await submitLogin(page, "password");
  await expect(columns(page)).toHaveCount(5);
  await page.reload();
  await expect(columns(page)).toHaveCount(5);
});

test("logs out and stays signed out after reload", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
