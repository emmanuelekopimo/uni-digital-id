import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("mobile: card fits the screen and the lecturer can scan from a phone", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await signIn(page, "student");
  await expect(page.getByTestId("id-card")).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.getByTestId("logout").click({ force: true }).catch(() => {});
  await page.context().clearCookies();
  await signIn(page, "lecturer");
  await page.getByTestId("samples").getByText("Tobi Adebayo (suspended)").click();
  await expect(page.getByTestId("result").first()).toHaveAttribute("data-result", "suspended");
  await expect(page.getByTestId("result")).toBeInViewport();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await ctx.close();
});
