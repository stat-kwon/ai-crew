import { test, expect } from "@playwright/test";

test.describe("네비게이션", () => {
  test("사이드바 네비게이션 표시", async ({ page }) => {
    await page.goto("/");

    // 앱 타이틀
    await expect(page.getByText("AI-Crew Studio")).toBeVisible();

    // 네비게이션 링크들
    await expect(page.getByRole("link", { name: "홈" })).toBeVisible();
    await expect(page.getByRole("link", { name: "현재 상태" })).toBeVisible();
    await expect(page.getByRole("link", { name: "히스토리" })).toBeVisible();
    await expect(page.getByRole("link", { name: "설계 문서" })).toBeVisible();
    await expect(page.getByRole("link", { name: "설정", exact: true })).toBeVisible();
  });

  test("모든 페이지 네비게이션 테스트", async ({ page }) => {
    // 홈 -> 현재 상태
    await page.goto("/");
    await page.getByRole("link", { name: "현재 상태" }).click();
    await expect(page).toHaveURL("/current");

    // 현재 상태 -> 히스토리
    await page.getByRole("link", { name: "히스토리" }).click();
    await expect(page).toHaveURL("/history");

    // 히스토리 -> 설계 문서
    await page.getByRole("link", { name: "설계 문서" }).click();
    await expect(page).toHaveURL("/docs");

    // 설계 문서 -> 설정
    await page.getByRole("link", { name: "설정", exact: true }).click();
    await expect(page).toHaveURL("/settings");

    // 설정 -> 홈
    await page.getByRole("link", { name: "홈" }).click();
    await expect(page).toHaveURL("/");
  });

  test("현재 페이지 하이라이트", async ({ page }) => {
    await page.goto("/current");

    // 현재 상태 링크가 active 상태
    const currentLink = page.getByRole("link", { name: "현재 상태" });
    await expect(currentLink).toHaveClass(/bg-primary/);
  });
});
