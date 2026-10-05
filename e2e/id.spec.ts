import path from "node:path";
import os from "node:os";
import QRCode from "qrcode";
import { expect, test } from "@playwright/test";
import { makeIdToken } from "../src/lib/idtoken";
import { E2E_SECRET, signIn } from "./helpers";

test("login page is prefilled with the lecturer demo account", async ({ page }) => {
  await page.goto("/scan");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#email")).toHaveValue("lecturer@uniuyo.edu.ng");
  await expect(page.locator("#password")).toHaveValue("lecturer123");
});

test("student sees their card, QR code and courses; the QR link verifies publicly", async ({ page }) => {
  await signIn(page, "student");
  await expect(page.getByTestId("card-name")).toHaveText("AKPAN Ubong Daniel");
  await expect(page.getByTestId("card-regno")).toHaveText("UU/23/CSC/045");
  await expect(page.getByTestId("card-status")).toContainText("Valid until");
  await expect(page.locator("#courses + .table-wrap")).toContainText("CSC 311");
  const qr = await page.getByTestId("id-card").getAttribute("data-qr");
  expect(qr).toMatch(/\/verify\/UU1\./);
  await page.goto(new URL(qr!).pathname);
  await expect(page.getByTestId("public-verdict")).toHaveText("Genuine UniUyo student ID");
});

test("lecturer verifies a class member, a Law student, and a forged code", async ({ page }) => {
  await signIn(page, "lecturer");
  await expect(page.getByTestId("course-select")).toHaveValue(/\d+/);
  await expect(page.getByRole("heading", { name: /CSC 311/ })).toBeVisible();

  await page.getByText("Sample: Ubong Akpan (CSC 311)").click();
  await expect(page.getByTestId("result").first()).toHaveAttribute("data-result", "in_class");
  await expect(page.getByTestId("verdict").first()).toHaveText("Belongs to CSC 311");

  await page.getByTestId("scan-input").fill("uu/23/law/112");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result").first()).toHaveAttribute("data-result", "other_department");
  await expect(page.getByTestId("result").first()).toContainText("UniUyo student, not in this class");
  await expect(page.getByTestId("result-name").first()).toHaveText("ETUK Uduak");

  await page.getByTestId("scan-input").fill("UU1.VVUvMjMvQ1NDLzk5OQ.1.AAAAAAAAAAAAAAAAAAAAAA");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result").first()).toHaveAttribute("data-result", "invalid");
  await expect(page.getByTestId("verdict").first()).toHaveText("Not a UniUyo ID");
});

test("lecturer uploads a photo of a QR code and it is decoded in the browser", async ({ page }) => {
  const file = path.join(os.tmpdir(), "uniid-amaka-qr.png");
  await QRCode.toFile(file, `http://localhost:3230/verify/${makeIdToken("UU/23/CSC/088", 1, E2E_SECRET)}`, { width: 420 });
  await signIn(page, "lecturer");
  await page.getByTestId("qr-upload").setInputFiles(file);
  await expect(page.getByTestId("result").first()).toHaveAttribute("data-result", "same_department");
  await expect(page.getByTestId("result").first()).toContainText("Checked from QR signature");
});

test("empty input shows an inline error and the roster lists the class", async ({ page }) => {
  await signIn(page, "lecturer");
  await page.getByTestId("scan-input").fill("ab");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("scan-error")).toContainText("registration number");
  await page.getByRole("link", { name: /CSC 311/ }).first().click();
  await expect(page.getByTestId("enrolled-count")).toHaveText("21");
  await expect(page.getByTestId("roster-row").filter({ hasText: "ADEBAYO Tobi" })).toContainText("Suspended");
});

test("students cannot open lecturer pages", async ({ page }) => {
  await signIn(page, "law");
  await page.goto("/scan");
  await expect(page).toHaveURL(/\/card$/);
  await expect(page.getByTestId("card-name")).toHaveText("ETUK Uduak");
});
