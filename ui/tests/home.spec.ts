import { test, expect } from "@playwright/test";

test.describe("홈 페이지", () => {
  test("페이지 로드 및 대시보드 표시", async ({ page }) => {
    await page.goto("/");

    // 페이지 타이틀 확인
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();

    // 현재 진행 중 카드 확인
    await expect(page.getByText("현재 진행 중")).toBeVisible();

    // 이전 작업 카드 확인
    await expect(page.getByText("이전 작업")).toBeVisible();
  });

  test("현재 진행 상태 표시", async ({ page }) => {
    await page.goto("/");

    // 진행률 표시 확인
    await expect(page.getByText("진행률")).toBeVisible();
  });

  test("이전 작업 목록 표시", async ({ page }) => {
    await page.goto("/");

    // 런 목록에서 intent 텍스트 확인
    await expect(page.getByText("초기 프로젝트 구조 설정")).toBeVisible();
  });

  test("네비게이션 링크 작동", async ({ page }) => {
    await page.goto("/");

    // 현재 상태 링크 클릭
    await page.getByRole("link", { name: "현재 상태" }).click();
    await expect(page).toHaveURL("/current");
  });
});
