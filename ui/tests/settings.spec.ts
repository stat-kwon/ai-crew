import { test, expect } from "@playwright/test";

test.describe("설정 페이지", () => {
  test("페이지 로드 및 config 표시", async ({ page }) => {
    await page.goto("/settings");

    // 페이지 타이틀 확인
    await expect(page.getByRole("heading", { name: "설정" }).first()).toBeVisible();

    // config.yaml 카드 확인
    await expect(page.getByText("config.yaml")).toBeVisible();
  });

  test("config 요약 카드 표시", async ({ page }) => {
    await page.goto("/settings");

    // 번들 카드
    await expect(page.getByRole("heading", { name: "번들" })).toBeVisible();

    // 기본 모델 카드
    await expect(page.getByRole("heading", { name: "기본 모델" })).toBeVisible();

    // 언어 카드
    await expect(page.getByRole("heading", { name: "언어" })).toBeVisible();
  });

  test("YAML 내용 표시", async ({ page }) => {
    await page.goto("/settings");

    // YAML 코드 블록에서 내용 확인
    await expect(page.locator("pre")).toContainText("bundle: fullstack");
    await expect(page.locator("pre")).toContainText("retention: 5");
  });
});
