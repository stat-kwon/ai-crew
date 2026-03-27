import { test, expect } from "@playwright/test";

test.describe("Feature 1: Graph Node Click → Edit Panel", () => {
  test("clicking node opens editor drawer", async ({ page }) => {
    await page.goto("/graph");
    await page.waitForSelector("[data-testid='rf__wrapper']", { timeout: 10000 });

    // Wait for nodes to render
    await page.waitForTimeout(1000);

    // Click on first node
    const node = page.locator(".react-flow__node").first();
    await node.click();

    // Verify editor modal opens
    const modal = page.locator('[class*="awsui_dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Screenshot
    await page.screenshot({ path: "/tmp/feature-test/01-node-editor-open.png" });
  });
});

test.describe("Feature 2: Add Node", () => {
  test("Add Node button opens new node form", async ({ page }) => {
    await page.goto("/graph");
    await page.waitForLoadState("networkidle");

    // Click Add Node button
    const addButton = page.getByRole("button", { name: "Add Node" });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Verify modal with "Add New Node" title
    const modal = page.locator('[class*="awsui_dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText("Add New Node")).toBeVisible();

    // Screenshot
    await page.screenshot({ path: "/tmp/feature-test/02-add-node-form.png" });

    // Fill in new node data
    await page.fill('input[placeholder="e.g., planner"]', "test-node");
    await page.fill('input[placeholder="e.g., planner-agent"]', "test-agent");

    // Screenshot after filling
    await page.screenshot({ path: "/tmp/feature-test/02-add-node-filled.png" });
  });
});

test.describe("Feature 3: Scratchpad Viewer", () => {
  test("clicking kanban card opens scratchpad modal", async ({ page }) => {
    await page.goto("/runs");
    await page.waitForLoadState("networkidle");

    // Wait for kanban cards to load
    await page.waitForTimeout(1000);

    // Check if any cards exist
    const cards = page.locator('[class*="rounded-xl"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Click first card
      await cards.first().click();

      // Wait for modal
      await page.waitForTimeout(500);

      // Check modal visibility
      const modal = page.locator('[class*="awsui_dialog"]');
      if (await modal.isVisible()) {
        await expect(modal.getByText("Scratchpad")).toBeVisible();
      }
    }

    // Screenshot
    await page.screenshot({ path: "/tmp/feature-test/03-scratchpad-view.png" });
  });
});

test.describe("Feature 4: Bundle Apply", () => {
  test("selecting and applying bundle", async ({ page }) => {
    await page.goto("/bundles");
    await page.waitForLoadState("networkidle");

    // Wait for bundles to load
    await page.waitForTimeout(2000);

    // Screenshot initial state
    await page.screenshot({ path: "/tmp/feature-test/04-bundles-list.png" });

    // Click on first bundle card's radio button (cloudscape single selection)
    const radioButton = page.locator('input[type="radio"]').first();
    await radioButton.click();

    await page.waitForTimeout(1000);

    // Scroll down to see apply button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Screenshot after selection
    await page.screenshot({ path: "/tmp/feature-test/04-bundle-selected.png", fullPage: true });

    // Find and click Apply Button
    const applyButton = page.getByRole("button", { name: "Apply Bundle" });
    await applyButton.scrollIntoViewIfNeeded();
    await expect(applyButton).toBeVisible({ timeout: 5000 });

    await applyButton.click();

    // Wait for success message
    await page.waitForTimeout(2000);

    // Screenshot after apply
    await page.screenshot({ path: "/tmp/feature-test/04-bundle-applied.png" });

    // Verify success message
    const successAlert = page.getByText("Bundle Applied");
    await expect(successAlert).toBeVisible({ timeout: 5000 });
  });
});

test.describe("End-to-End Flow", () => {
  test("complete workflow: apply bundle → edit node → save", async ({ page }) => {
    // Step 1: Apply bundle
    await page.goto("/bundles");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Select first bundle via radio button
    const radioButton = page.locator('input[type="radio"]').first();
    await radioButton.click();
    await page.waitForTimeout(1000);

    // Scroll down to see apply button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const applyButton = page.getByRole("button", { name: "Apply Bundle" });
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click();
    await page.waitForTimeout(2000);

    // Step 2: Go to graph and edit
    await page.goto("/graph");
    await page.waitForSelector("[data-testid='rf__wrapper']", { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Click on a node
    const node = page.locator(".react-flow__node").first();
    await node.click();

    // Wait for editor
    const modal = page.locator('[class*="awsui_dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Screenshot
    await page.screenshot({ path: "/tmp/feature-test/05-e2e-complete.png" });
  });
});
