/**
 * 업로드 전 클라이언트 리사이즈 (브라우저 전용).
 *
 * 요즘 폰 사진은 장당 4~8MB라 원본을 그대로 올리면 무료 1GB가 금방 찬다.
 * 장변 1600px + WebP로 줄이면 보통 200~400KB가 되고, 화면에서 보기엔 차이가 없다.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

export class ImageDecodeError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // 아이폰 HEIC 등 브라우저가 디코딩 못 하는 형식
      reject(new ImageDecodeError("이미지를 읽을 수 없습니다"));
    };
    img.src = url;
  });
}

/**
 * 장변 MAX_EDGE 이하로 줄이고 WebP로 변환한다.
 * 변환 결과가 원본보다 크면(작은 이미지·이미 최적화된 파일) 원본을 그대로 쓴다.
 */
export async function prepareImage(file: File): Promise<File> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
    type: "image/webp",
  });
}
