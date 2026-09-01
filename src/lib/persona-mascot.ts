// 자동 생성됨 — db/process-mascot-images.mjs 로 ggoomdoriimg/ 폴더에서 만들었다. 수동으로 고치지 말 것.
import type { PersonalityType } from "./personality-test";

/** 성향 결과 화면의 마스코트 — 캐릭터명(한글)과 사진 경로. 사진이 없는 성향은 키가 없다 */
export const PERSONA_MASCOT: Partial<Record<PersonalityType, { name: string; image: string }>> = {
  "explorer": {
    "name": "꿈빛이",
    "image": "/mascots/explorer.png"
  },
  "player": {
    "name": "도르",
    "image": "/mascots/player.png"
  },
  "socializer": {
    "name": "꿈달이",
    "image": "/mascots/socializer.png"
  },
  "viewLover": {
    "name": "몽몽",
    "image": "/mascots/viewLover.png"
  },
  "culturist": {
    "name": "꿈동이",
    "image": "/mascots/culturist.png"
  },
  "foodie": {
    "name": "온솔",
    "image": "/mascots/foodie.png"
  },
  "trendsetter": {
    "name": "꿈누리",
    "image": "/mascots/trendsetter.png"
  }
};
