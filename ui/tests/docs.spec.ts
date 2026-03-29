import { test, expect } from "@playwright/test";

test.describe("설계 문서 페이지", () => {
  test("페이지 로드 및 파일 트리 표시", async ({ page }) => {
    await page.goto("/docs");

    // 페이지 타이틀 확인
    await expect(page.getByRole("heading", { name: "설계 문서" })).toBeVisible();

    // 파일 트리 확인
    await expect(page.getByRole("button", { name: "inception" })).toBeVisible();
  });

  test("파일 트리 폴더 펼치기", async ({ page }) => {
    await page.goto("/docs");

    // inception 폴더가 이미 펼쳐져 있어야 함 (depth < 2)
    // requirements 폴더 확인
    await expect(page.getByRole("button", { name: "requirements", exact: true })).toBeVisible();
  });

  test("파일 선택 시 내용 표시", async ({ page }) => {
    await page.goto("/docs");

    // requirements.md 파일 클릭
    await page.getByRole("button", { name: "requirements.md" }).click();

    // 파일 내용 표시 확인
    await expect(page.getByText("요구사항 분석")).toBeVisible();
  });

  test("여러 파일 탐색", async ({ page }) => {
    await page.goto("/docs");

    // user-stories.md 선택
    await page.getByRole("button", { name: "user-stories.md" }).click();
    await expect(page.getByText("사용자 스토리")).toBeVisible();
  });
});
