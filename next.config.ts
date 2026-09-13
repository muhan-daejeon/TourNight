import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    // DNS64/NAT64 네트워크(핫스팟·IPv6 전용망)에서는 KTO 이미지 서버가
    // 64:ff9b:: 합성 주소로 풀려 Next의 사설 IP 차단에 걸린다("resolved to
    // private ip"). 개발에서만 허용한다 — 프로덕션(Vercel)은 정상 DNS라
    // 필요 없고, SSRF 보호도 그대로 유지한다.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      // 한국관광공사 이미지 서버
      { protocol: "http", hostname: "tong.visitkorea.or.kr" },
      { protocol: "https", hostname: "tong.visitkorea.or.kr" },
      // 커뮤니티 첨부 사진 (Supabase Storage, public 버킷)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default withNextIntl(nextConfig);
