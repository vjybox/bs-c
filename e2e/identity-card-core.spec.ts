import { test, expect, type Browser } from "@playwright/test";

async function createOwnerCard(browser: Browser) {
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();

  await ownerPage.goto("/");
  await ownerPage.getByLabel("Name").fill("Grace Hopper");
  await ownerPage.getByLabel("Headline").fill("Rear Admiral, Computer Scientist");

  const fieldRows = ownerPage.locator(".field-row");
  await fieldRows.nth(0).locator('input[placeholder="Value"]').fill("grace@example.com");
  await fieldRows.nth(1).locator('input[placeholder="Value"]').fill("555-9999");

  await ownerPage.getByRole("button", { name: "Create card" }).click();
  await ownerPage.waitForURL("**/editor");

  return { ownerContext, ownerPage };
}

test("create -> share -> request -> approve flow enforces field visibility end-to-end", async ({
  browser,
}) => {
  const { ownerContext, ownerPage } = await createOwnerCard(browser);

  await ownerPage.waitForSelector(".card-view-name");
  await expect(ownerPage.locator(".card-view-name")).toHaveText("Grace Hopper");

  await ownerPage.getByRole("button", { name: "Share" }).click();
  await ownerPage.waitForSelector(".share-link-row input");
  const shareUrl = await ownerPage.locator(".share-link-row input").inputValue();
  await ownerPage.getByRole("button", { name: "Close" }).click();

  const recipientContext = await browser.newContext();
  const recipientPage = await recipientContext.newPage();
  const recipientPath = new URL(shareUrl).pathname;
  await recipientPage.goto(recipientPath);
  await recipientPage.waitForSelector(".card-view");

  const fieldsBefore = await recipientPage.locator(".card-view-field").allTextContents();
  expect(fieldsBefore.some((t) => t.includes("555-9999"))).toBe(false);
  expect(fieldsBefore.some((t) => t.includes("grace@example.com"))).toBe(true);

  await recipientPage.getByRole("button", { name: "Request access" }).click();
  await recipientPage.waitForSelector('button:has-text("Requested")');

  await ownerPage.goto("/editor/requests");
  await ownerPage.waitForSelector(".request-row");
  await ownerPage.getByRole("button", { name: "Approve" }).click();
  await ownerPage.waitForSelector(".status-approved");

  await recipientPage.waitForFunction(
    () => document.body.innerText.includes("555-9999"),
    { timeout: 10_000 },
  );
  const fieldsAfter = await recipientPage.locator(".card-view-field").allTextContents();
  expect(fieldsAfter.some((t) => t.includes("555-9999"))).toBe(true);

  await ownerContext.close();
  await recipientContext.close();
});
