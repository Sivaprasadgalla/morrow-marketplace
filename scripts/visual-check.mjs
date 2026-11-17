import { chromium } from "../../payload-website-starter/node_modules/playwright/index.mjs";
import { join } from "node:path";

const executablePath = join(
  process.env.LOCALAPPDATA,
  "ms-playwright",
  "chromium_headless_shell-1161",
  "chrome-win",
  "headless_shell.exe",
);
const browser = await chromium.launch({ headless: true, executablePath });
const results = [];

async function inspect(name, path, viewport, action) {
  const context = await browser.newContext({ viewport, colorScheme: "light" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
  if (action) await action(page);
  await page.waitForTimeout(1000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: `qa-${name}.png`, fullPage: false });
  results.push({ name, url: page.url(), overflow, errors });
  await context.close();
}

await inspect("home", "/", { width: 1440, height: 1000 });
await inspect("mobile", "/", { width: 390, height: 844 });
await inspect("shop", "/shop", { width: 1440, height: 1000 });
await inspect("product-mobile", "/product/kosi-dinner-set", { width: 390, height: 844 });
await inspect("register", "/register", { width: 1440, height: 1000 });
await inspect("register-mobile", "/register", { width: 390, height: 844 });
await inspect("forgot-password", "/forgot-password", { width: 1440, height: 1000 });
await inspect("reset-password", "/reset-password", { width: 390, height: 844 });
await inspect("verify-email", "/verify-email", { width: 390, height: 844 });
await inspect("vendor", "/login", { width: 1440, height: 1000 }, async (page) => {
  await page.getByRole("button", { name: /vendor/i }).click();
  await page.waitForURL("**/vendor");
  await page.waitForLoadState("networkidle");
});
await inspect("admin", "/login", { width: 1440, height: 1000 }, async (page) => {
  await page.getByRole("button", { name: /super admin/i }).click();
  await page.waitForURL("**/admin");
  await page.waitForLoadState("networkidle");
});
await inspect("admin-users", "/login", { width: 1440, height: 1000 }, async (page) => {
  await page.getByRole("button", { name: /super admin/i }).click();
  await page.waitForURL("**/admin");
  await page.getByRole("link", { name: "Customers" }).click();
  await page.waitForURL("**/admin/customers");
  await page.waitForLoadState("networkidle");
});

{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/shop", { waitUntil: "networkidle" });
  await page.locator("article").first().hover();
  await page.waitForTimeout(400);
  const addButton = page.getByRole("button", { name: /add to bag/i }).first();
  const buttonState = await addButton.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    const target = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    return {
      opacity: getComputedStyle(button).opacity,
      pointerEvents: getComputedStyle(button).pointerEvents,
      target: target?.tagName,
      targetLabel: target?.textContent?.trim(),
    };
  });
  await addButton.click();
  await page.waitForTimeout(500);
  const dialogCount = await page.locator('[role="dialog"]').count();
  const storedCart = await page.evaluate(() => window.localStorage.getItem("morrow-cart"));
  results.push({ name: "cart-interaction", url: page.url(), buttonState, open: dialogCount === 1, storedCart, errors: dialogCount === 1 ? [] : ["Cart drawer did not open"] });
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
