import { expect, type Page } from "@playwright/test";

export const E2E_SECRET = "e2e-secret-uniid-0123456789";

export async function signIn(page: Page, who: "lecturer" | "student" | "law") {
  await page.goto("/login");
  await page.getByTestId(`demo-${who}`).click();
  await page.getByTestId("sign-in").click();
  await expect(page).toHaveURL(who === "lecturer" ? /\/scan$/ : /\/card$/);
}
