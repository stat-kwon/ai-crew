import { test, expect } from "@playwright/test";

test.describe("빈 상태 처리", () => {
  // 이 테스트들은 빈 프로젝트 디렉토리에서 실행해야 함
  // 실제 테스트 데이터가 있으므로 빈 상태를 직접 테스트할 수 없음
  // API 응답을 모킹하거나 별도 환경이 필요

  test.skip("빈 런 레지스트리 처리", async ({ page }) => {
    // 빈 프로젝트에서 테스트
    await page.goto("/");
    await expect(page.getByText("진행 중인 작업이 없습니다")).toBeVisible();
  });

  test.skip("빈 히스토리 처리", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByText("히스토리 없음")).toBeVisible();
  });

  test.skip("빈 설계 문서 처리", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByText("문서 없음")).toBeVisible();
  });

  test.skip("빈 설정 처리", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("설정 없음")).toBeVisible();
  });
});

test.describe("로딩 상태 (간접 확인)", () => {
  test("홈 페이지 로드 완료 대기", async ({ page }) => {
    await page.goto("/");
    // 로딩이 완료되면 데이터가 표시됨
    await expect(page.getByText("대시보드")).toBeVisible();
    await expect(page.getByText("현재 진행 중")).toBeVisible();
  });
});
