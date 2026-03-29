import { test, expect } from "@playwright/test";

test.describe("현재 상태 페이지", () => {
  test("페이지 로드 및 탭 표시", async ({ page }) => {
    await page.goto("/current");

    // 페이지 타이틀 확인
    await expect(page.getByRole("heading", { name: "현재 상태" })).toBeVisible();

    // 탭 확인
    await expect(page.getByRole("tab", { name: "개발 진행" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "설계 단계" })).toBeVisible();
  });

  test("개발 진행 탭 - 노드 타임라인 표시", async ({ page }) => {
    await page.goto("/current");

    // Level 표시 확인
    await expect(page.getByText("Level 0")).toBeVisible();
    await expect(page.getByText("Level 1")).toBeVisible();
  });

  test("개발 진행 탭 - 노드 클릭으로 스크래치패드 펼치기", async ({ page }) => {
    await page.goto("/current");

    // plan 노드 카드 헤더 클릭 (첫 번째 CardTitle)
    await page.locator('[data-slot="card-title"]').filter({ hasText: 'plan' }).first().click();

    // 스크래치패드 내용 확인
    await expect(page.getByText("프로젝트 구조 분석")).toBeVisible();
  });

  test("설계 단계 탭 - AI-DLC 체크박스 표시", async ({ page }) => {
    await page.goto("/current");

    // 설계 단계 탭 클릭
    await page.getByRole("tab", { name: "설계 단계" }).click();

    // 단계 표시 확인
    await expect(page.getByText("Requirements Analysis")).toBeVisible();
    await expect(page.getByText("User Stories")).toBeVisible();
  });

  test("설계 단계 탭 - 현재 진행 중인 단계 표시", async ({ page }) => {
    await page.goto("/current");
    await page.getByRole("tab", { name: "설계 단계" }).click();

    // Build and Test가 현재 진행 중
    await expect(page.getByText("Build and Test")).toBeVisible();
  });
});
