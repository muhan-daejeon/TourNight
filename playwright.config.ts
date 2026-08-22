import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * .env.local을 읽어 둔다.
 *
 * 이 테스트는 실제로 가입까지 하므로 끝나고 그 계정을 지워야 하고, 그러려면
 * DATABASE_URL이 필요하다. Next는 개발·빌드에서 이 파일을 알아서 읽지만
 * 테스트 러너는 읽지 않아 여기서 직접 넣는다 (dotenv를 더 달지 않으려고).
 */
for (const line of fs.existsSync(".env.local")
  ? fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
  : []) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

/**
 * 브라우저로 도는 종단 테스트.
 *
 * 서버를 여기서 띄우지 않는다 — 이 앱은 DB와 외부 API가 붙어야 화면이 나오고,
 * 그 값들은 .env.local에만 있다. `npm run dev`(3100)나 `npm start`를 먼저 켜 두고
 * `npm run test:e2e`로 돌린다. 다른 포트면 E2E_BASE_URL로 알려 준다.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // 크로미움 하나만 돈다. 셋을 돌리면 가입 계정이 셋 생기고, 확인하려는 것은
  // 브라우저 차이가 아니라 우리 화면의 동작이다.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
