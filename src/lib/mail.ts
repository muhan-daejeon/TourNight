import nodemailer, { type Transporter } from "nodemailer";

/**
 * 메일 발송 — SMTP (Gmail 등)
 *
 * 보내는 도메인을 우리가 갖고 있지 않아 SPF·DKIM을 직접 걸 수 없다. 그래서
 * 평판이 확보된 메일 제공자의 SMTP를 그대로 빌려 쓴다.
 *
 * 도달률 주의 — 중국(QQ·163)과 일본 캐리어 메일(docomo·ezweb·softbank)은 모르는
 * 발신자를 조용히 버리거나 스팸으로 넣는 일이 잦다. 반송도 안 오므로 서버에서는
 * 성공으로 보인다. 그래서 화면에 발신 주소를 함께 보여주고(수신 허용 등록용)
 * 스팸함 확인을 안내한다. 나중에 도메인이 생기면 SPF·DKIM·DMARC를 걸고
 * 이 파일의 transport만 바꾸면 된다.
 *
 * 필요한 환경변수
 *   SMTP_HOST  — 예: smtp.gmail.com
 *   SMTP_PORT  — 465(SSL) 또는 587(STARTTLS). 기본 587
 *   SMTP_USER  — 계정 (Gmail이면 주소 전체)
 *   SMTP_PASS  — 비밀번호. Gmail은 반드시 '앱 비밀번호'
 *   MAIL_FROM  — 보내는 주소. 없으면 SMTP_USER를 쓴다
 *   APP_URL    — 메일 안 링크의 기준 주소 (없으면 Vercel 주소 → localhost)
 */

/** SMTP는 연결·핸드셰이크가 있어 HTTP보다 넉넉히 잡는다 */
const MAIL_TIMEOUT_MS = 15_000;

export function appUrl(): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  // Vercel은 배포마다 URL을 주입한다 (프리뷰 배포에서도 링크가 맞게 유지된다)
  const vercel = process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

/** 화면에 안내할 발신 주소 — 수신 허용 목록에 넣으라고 보여준다 */
export function mailFrom(): string | null {
  return process.env.MAIL_FROM || process.env.SMTP_USER || null;
}

/** 발송 설정이 갖춰졌는지 — 안 갖춰졌으면 인증 메일 기능이 조용히 꺼진다 */
export function mailConfigured(): boolean {
  return (
    !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS
  );
}

/**
 * transport는 연결 풀을 들고 있어 요청마다 새로 만들면 낭비다.
 * 서버리스에서도 같은 인스턴스가 재사용되는 동안은 살아 있다.
 */
let cached: Transporter | null = null;

function transport(): Transporter | null {
  if (cached) return cached;
  if (!mailConfigured()) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465는 처음부터 TLS, 587은 STARTTLS로 승격한다
    secure: port === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    connectionTimeout: MAIL_TIMEOUT_MS,
    greetingTimeout: MAIL_TIMEOUT_MS,
    socketTimeout: MAIL_TIMEOUT_MS,
  });
  return cached;
}

export interface MailResult {
  ok: boolean;
  /** 실패 사유 (사용자에게 그대로 보여주지 않는다 — 로그·디버깅용) */
  error?: string;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  const tx = transport();
  const from = mailFrom();
  if (!tx || !from) return { ok: false, error: "mail_not_configured" };

  try {
    await tx.sendMail({
      from: `TourNight <${from}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/** 메일 본문에 사용자 입력(닉네임 등)을 넣으므로 HTML 이스케이프한다 */
function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}

/**
 * 인증 메일 문구.
 *
 * 수신자가 어느 언어를 쓰는지는 가입 시점 화면 언어로만 알 수 있어, 한국어와
 * 영어를 함께 적는다. 메일 클라이언트는 CSS를 잘 지원하지 않으므로 인라인 스타일만 쓴다.
 */
export function verificationMail(input: { nickname: string; link: string }) {
  const name = esc(input.nickname);
  const link = input.link;

  const text = [
    `${input.nickname}님, TourNight 이메일 인증을 완료해 주세요.`,
    ``,
    link,
    ``,
    `이 링크는 24시간 동안만 유효합니다.`,
    `본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다.`,
    ``,
    `— — —`,
    ``,
    `Hi ${input.nickname}, please verify your email for TourNight.`,
    `The link above is valid for 24 hours.`,
    `If you didn't sign up, you can ignore this message.`,
  ].join("\n");

  const html = `
<div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <p style="font-size:18px;font-weight:700;margin:0 0 4px">Tour<span style="color:#6366f1">Night</span></p>
  <p style="font-size:13px;color:#64748b;margin:0 0 28px">대전의 밤을 여행하다</p>

  <p style="font-size:15px;line-height:1.6;margin:0 0 8px">
    ${name}님, 이메일 인증을 완료해 주세요.
  </p>
  <p style="font-size:13px;line-height:1.6;color:#475569;margin:0 0 24px">
    아래 버튼을 누르면 커뮤니티에 글과 댓글을 남길 수 있습니다.
  </p>

  <a href="${link}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#6366f1;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">
    이메일 인증하기 / Verify email
  </a>

  <p style="font-size:12px;line-height:1.6;color:#64748b;margin:24px 0 0">
    버튼이 눌리지 않으면 아래 주소를 복사해 열어 주세요.<br>
    <span style="word-break:break-all;color:#475569">${esc(link)}</span>
  </p>

  <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:24px 0 0">
    이 링크는 24시간 동안만 유효합니다. 본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다.
  </p>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px">

  <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:0">
    Hi ${name}, please verify your email to post in the TourNight community.
    The link is valid for 24 hours — if you didn't sign up, you can ignore this message.
  </p>
</div>`.trim();

  return {
    subject: "TourNight 이메일 인증 / Verify your email",
    html,
    text,
  };
}
