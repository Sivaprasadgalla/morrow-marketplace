import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", output)((name) => name in mocks ? mocks[name] : require(name), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const cartHelpers = load("src/lib/cart.ts");
const { mergeCartLines, resolveCart, parseGuestCart } = cartHelpers;
const redirectHelpers = load("src/lib/auth-redirect.ts");
const id = (number) => number.toString(16).padStart(24, "0");
const mergeId = "12345678-1234-4234-8234-123456789abc";
const product = (number, stock = 20) => ({ _id: id(number), status: "active", name: `Product ${number}`, slug: `product-${number}`, maker: "Studio", images: ["/test.jpg"], variants: [{ _id: id(number + 100), stock, reserved: 0, pricePaise: 12345 }] });
const line = (number, quantity = 1) => ({ productId: id(number), variantId: id(number + 100), quantity });
const displayItem = { id: id(1), variantId: id(101), name: "Product", slug: "product", maker: "Studio", image: "/test.jpg", price: 50, quantity: 2 };

test("merging preserves both bags and combines only matching variants", () => {
  const otherVariant = { ...line(1), variantId: id(999) };
  assert.deepEqual(mergeCartLines([line(1, 2), line(2)], [line(1, 3), otherVariant]), [line(1, 5), line(2), otherVariant]);
});
test("merge resolves current prices, available stock, purchase limits and unavailable products", () => {
  const limited = product(1, 5); limited.variants[0].reserved = 2;
  const capped = product(2, 100);
  const inactive = { ...product(3), status: "draft" };
  const result = resolveCart([line(1, 8), line(2, 40), line(3), line(4)], [limited, capped, inactive]);
  assert.deepEqual(result.items.map((item) => [item.id, item.quantity, item.price]), [[id(1), 3, 123.45], [id(2), 25, 123.45]]);
  assert.equal(result.notices.length, 4);
});
test("a combined cart respects the 50-line limit", () => {
  const result = resolveCart(Array.from({length: 60}, (_, n) => line(n + 1)), Array.from({length: 60}, (_, n) => product(n + 1)));
  assert.equal(result.items.length, 50);
  assert.match(result.notices[0], /50/);
});
test("legacy device carts migrate without losing products; malformed storage is ignored", () => {
  const migrated = parseGuestCart(JSON.stringify([displayItem]), () => mergeId);
  assert.deepEqual(migrated.items, [displayItem]);
  assert.equal(migrated.mergeId, mergeId);
  assert.deepEqual(parseGuestCart(JSON.stringify(migrated), () => "wrong"), migrated);
  assert.deepEqual(parseGuestCart("{broken", () => mergeId).items, []);
  assert.deepEqual(parseGuestCart(JSON.stringify({ items: [null, { quantity: -1 }] }), () => mergeId).items, []);
});
test("callback validation retains checkout and rejects external or malformed destinations", () => {
  for (const url of ["https://evil.example", "//evil.example", "/\\evil.example", "/\nevil.example"]) assert.equal(redirectHelpers.safeCallbackPath(url), undefined);
  assert.equal(redirectHelpers.safeCallbackPath("/checkout"), "/checkout");
});

function apiFixture(initial = [], options = {}) {
  let saved = initial.length ? { _id: id(900), __v: 0, items: initial.map((item) => ({product: item.productId, variantId: item.variantId, quantity: item.quantity})), mergedGuestCartIds: [] } : null;
  let failNext = false;
  const clone = () => structuredClone(saved);
  const Cart = {
    async updateOne(filter, update) { if (!saved) saved = { _id: id(900), ...structuredClone(update.$setOnInsert) }; },
    findOne() { return { async lean() { return clone(); } }; },
    async findOneAndUpdate(filter, update) {
      await Promise.resolve();
      if (filter._id && (!saved || (typeof filter.__v === "number" && filter.__v !== saved.__v))) return null;
      if (!saved) saved = { _id: id(900), __v: 0, mergedGuestCartIds: [] };
      Object.assign(saved, structuredClone(update.$set));
      saved.__v += update.$inc?.__v ?? 0;
      if (update.$push) saved.mergedGuestCartIds.push(...update.$push.mergedGuestCartIds.$each);
      return clone();
    },
    async deleteOne() { saved = null; },
  };
  class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const api = load("src/app/api/cart/route.ts", {
    "@/lib/cart": cartHelpers,
    "@/lib/db": { async connectDB() { if (failNext) { failNext = false; throw new Error("Database unavailable"); } } },
    "@/models/Cart": { Cart },
    "@/models/Product": { ProductModel: { find(query) { return { async lean() { return [product(1), product(2), product(3, 2)].filter((p) => query._id.$in.includes(p._id)); } }; } } },
    "@/lib/api": { ApiError, async requireRole() { if (options.unauthorized) throw new ApiError(401, "Unauthorized"); return {user: {id: id(800)}}; }, handleApiError(error) { return Response.json({ error: error.message }, { status: error.status ?? (error.name === "ZodError" ? 422 : 500) }); } },
  });
  const call = (method, body) => api[method](new Request("http://localhost/api/cart", {method, body: body ? JSON.stringify(body) : undefined, headers: {"content-type":"application/json"}}));
  return { api, call, saved: clone, fail() { failNext = true; } };
}
test("sign-in merges the guest bag with an existing saved account bag", async () => {
  const fixture = apiFixture([line(1, 2), line(2)]);
  const response = await fixture.call("POST", {mergeId, items: [line(1, 3), line(3, 5)]});
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.items.map((item) => [item.id, item.quantity]), [[id(1), 5], [id(2), 1], [id(3), 2]]);
  assert.equal(fixture.saved().items.length, 3);
});
test("refreshing or retrying a merge never adds the guest quantities twice", async () => {
  const fixture = apiFixture([line(1, 2)]);
  const payload = {mergeId, items:[line(1, 3)]};
  await fixture.call("POST", payload); // Simulate a successful write whose response was lost.
  const retried = await fixture.call("POST", payload);
  assert.equal((await retried.json()).items[0].quantity, 5);
  const saved = await fixture.call("PUT", {items: [line(1, 1)]});
  assert.equal(saved.status, 200);
  const repeated = await fixture.call("POST", payload);
  assert.equal((await repeated.json()).items[0].quantity, 1);
});
test("simultaneous merge requests add the guest cart once", async () => {
  const fixture = apiFixture([line(1, 2)]);
  const payload = {mergeId, items:[line(1, 3)]};
  const responses = await Promise.all([fixture.call("POST", payload), fixture.call("POST", payload)]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.equal(fixture.saved().items[0].quantity, 5);
});
test("failed sync preserves the saved bag and succeeds when retried", async () => {
  const fixture = apiFixture([line(1, 2)]);
  fixture.fail();
  assert.equal((await fixture.call("POST", {mergeId, items:[line(1, 3)]})).status, 500);
  assert.equal(fixture.saved().items[0].quantity, 2);
  assert.equal((await fixture.call("POST", {mergeId, items:[line(1, 3)]})).status, 200);
  assert.equal(fixture.saved().items[0].quantity, 5);
});
test("signed-in cart edits, removal and clearing persist for subsequent visits", async () => {
  const fixture = apiFixture();
  await fixture.call("PUT", {items:[line(1, 2), line(2)]});
  assert.equal((await (await fixture.api.GET()).json()).items.length, 2);
  await fixture.call("PUT", {items:[line(1, 4)]});
  assert.equal((await (await fixture.api.GET()).json()).items[0].quantity, 4);
  await fixture.call("PUT", {items:[]});
  assert.deepEqual((await (await fixture.api.GET()).json()).items, []);
});
test("account cart endpoints reject guests and invalid quantities", async () => {
  assert.equal((await apiFixture([], {unauthorized:true}).call("POST", {mergeId,items:[]})).status, 401);
  assert.equal((await apiFixture().call("POST", {mergeId,items:[line(1, 26)]})).status, 422);
});
test("already signed-in users return to checkout instead of being sent to a role dashboard", async () => {
  for (const role of ["customer", "vendor", "admin"]) {
    const { default: LoginPage } = load("src/app/login/page.tsx", {
      "@/auth": { async auth() { return {user:{role}}; } },
      "@/lib/auth-redirect": redirectHelpers,
      "@/components/auth/login-form": {LoginForm() {}},
      "next/navigation": { redirect(destination) { throw new Error(`REDIRECT:${destination}`); } },
    });
    await assert.rejects(() => LoginPage({searchParams:Promise.resolve({callbackUrl:"/checkout"})}), /REDIRECT:\/checkout/);
  }
});
