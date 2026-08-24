import { test, expect, type Page } from "@playwright/test";
import postgres from "postgres";

/**
 * 가입 후 둘러보기 종단 테스트.
 *
 * 이 화면은 HTTP 응답만 봐서는 확인이 안 된다. 단계마다 대상의 위치를 재서
 * 흐림막에 구멍을 뚫고, 라우터로 페이지를 옮겨 다니기 때문이다. 실제로 가입한
 * 계정이 있어야 뜨는 화면이라 테스트도 진짜로 가입한다.
 *
 * 사전 조건: 서버가 떠 있고(.env.local의 DB·API 키가 붙은 상태), DATABASE_URL이
 * 있을 것. 없으면 이 파일은 건너뛴다.
 */
const DB_URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

test.skip(!DB_URL, "DATABASE_URL이 없어 건너뜁니다 (.env.local 확인)");

/** 단계 순서 — 경로와 진행 표시가 이대로 나와야 한다 */
const STEPS = [
  { path: "/spots", nav: "야간 명소" },
  { path: "/courses", nav: "추천 코스" },
  { path: "/etiquette", nav: "나이트 에티켓" },
  { path: "/phrases", nav: "서바이벌 한국어" },
  { path: "/community", nav: "커뮤니티" },
] as const;

/** 실제로 그려진 하이라이트 테두리 수 (본문 + 헤더 탭) */
function holeCount(page: Page) {
  return page.evaluate(
    () =>
      [...document.querySelectorAll("[aria-hidden]")].filter(
        (el) => el.className && String(el.className).includes("ring-amber-400"),
      ).length,
  );
}

test("가입하면 둘러보기가 뜨고 5단계를 돌 수 있다", async ({ page }) => {
  test.slow(); // 단계마다 페이지를 옮기고 위치를 다시 잰다
  const sql = postgres(DB_URL!, { ssl: "require" });
  const email = `e2e-tour-${Date.now()}@example.com`;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  try {
    await page.goto("/ko/signup");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "SmokeTest!2026");
    const nickname = page.locator('input[type="text"]').first();
    if (await nickname.count()) await nickname.fill("종단 테스트");
    await page.click('button[type="submit"]');

    // 가입 직후 홈으로 "전체 이동"해야 한다. router.push로 하면 헤더가 미리
    // 받아 둔 비로그인 응답(로그인 리다이렉트)이 그대로 쓰여 로그인 화면이 뜬다.
    await page.waitForURL(/\/ko(\?|$)/);

    const box = page.getByRole("dialog");
    await expect(box).toBeVisible();
    await box.getByRole("button", { name: "시작하기" }).click();

    for (const [i, step] of STEPS.entries()) {
      if (i > 0) await box.getByRole("button", { name: "다음" }).click();
      await page.waitForURL(new RegExp(`/ko${step.path}\?tour=${i + 1}`));
      await expect(box).toBeVisible();
      await expect(box).toContainText(`${i + 1} / ${STEPS.length}`);

      // 구멍은 본문 하나 + 그 단계의 헤더 탭 하나가 최소값이다.
      // 스크롤·측정이 멎을 때까지 잠깐 기다린다 (늦게 붙는 대상이 있다).
      await expect
        .poll(() => holeCount(page), { timeout: 15_000 })
        .toBeGreaterThanOrEqual(2);

      // 헤더에서 이 단계에 해당하는 탭이 밝혀져 있어야 한다
      await expect(
        page.locator(`[data-tour-nav]`).filter({ hasText: step.nav }),
      ).toHaveCount(1);
    }

    await box.getByRole("button", { name: "다음" }).click();
    await page.waitForURL(/\/ko\?tour=done/);
    await expect(box).toBeVisible();

    await box.getByRole("button", { name: "닫기" }).click();
    await expect(box).toBeHidden();

    // 본 것으로 남아야 다음 방문에서 다시 뜨지 않는다
    const rows = await sql<{ tour_completed_at: Date | null }[]>`
      select tour_completed_at from users where email = ${email}
    `;
    expect(rows[0]?.tour_completed_at).not.toBeNull();

    expect(errors, "브라우저 오류가 없어야 한다").toEqual([]);
  } finally {
    await sql`delete from users where email = ${email}`;
    await sql.end();
  }
});
