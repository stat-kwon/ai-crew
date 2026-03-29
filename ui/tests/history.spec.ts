import { test, expect } from "@playwright/test";

test.describe("히스토리 페이지", () => {
  test("페이지 로드 및 런 목록 표시", async ({ page }) => {
    await page.goto("/history");

    // 페이지 타이틀 확인
    await expect(page.getByRole("heading", { name: "히스토리" })).toBeVisible();

    // 런 개수 표시
    await expect(page.getByText("3개의 런")).toBeVisible();
  });

  test("런 목록에서 런 선택", async ({ page }) => {
    await page.goto("/history");

    // 첫 번째 런 클릭 (v3 - 가장 최근)
    await page.getByRole("button", { name: /v3/ }).click();

    // 런 상세 정보가 로드될 때까지 대기
    await page.waitForTimeout(1000);

    // 탭이 표시되는지 확인 (런 상세가 로드됨)
    await expect(page.getByRole("tab", { name: "개발 진행" })).toBeVisible();
  });

  test("런 상세 - 탭 전환", async ({ page }) => {
    await page.goto("/history");

    // v1 런 선택 (archived 상태이고 aidlcSnapshot이 있음)
    await page.getByRole("button", { name: /v1/ }).click();

    // 런 상세 로드 대기
    await page.waitForTimeout(1000);

    // 설계 스냅샷 탭 클릭
    await page.getByRole("tab", { name: "설계 스냅샷" }).click();

    // 스냅샷 문서 목록 확인
    await expect(page.getByText("requirements.md")).toBeVisible();
  });

  test("실패한 런 표시", async ({ page }) => {
    await page.goto("/history");

    // v2 런 선택 (실패한 런)
    await page.getByRole("button", { name: /v2/ }).click();

    // 런 상세 로드 대기
    await page.waitForTimeout(1000);

    // 실패 상태 확인
    await expect(
      page.getByRole("heading", { name: "인증 버그 수정 및 세션 관리 개선" })
    ).toBeVisible();
  });
});
