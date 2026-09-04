/**
 * K-Life 가이드 · 식당편 데이터 (개발정의서 5~6항 콘텐츠 그대로).
 *
 * 번역기(문장 변환)도 어학 앱(언어 학습)도 아닌, "지금 이 상황에서 한국인처럼
 * 행동하고 말하기"를 돕는 상황 기반 가이드다. 실제 동선(입장→주문→식사→요청→
 * 계산→퇴장) 순서로 단계를 쪼개고, 단계마다 문화 팁과 실전 표현을 한 흐름으로 둔다.
 *
 * UI 라벨은 messages(klife)에, 시나리오 콘텐츠는 여기 한 파일에 4개 언어로 담는다
 * — 같은 구조로 scenario만 갈아끼우면 술집/택시/쇼핑 등으로 확장할 수 있다.
 * 학습 대상인 한국어 원문(ko·roman)은 언어를 바꿔도 유지하고 뜻풀이만 바뀐다.
 */

export type KLocale = "ko" | "en" | "ja" | "zh";
export type LText = Record<KLocale, string>;

export interface KPhrase {
  /** 어떤 상황에서 쓰는 표현인지 한 줄 */
  situation: LText;
  ko: string;
  roman: string;
  meaning: LText;
  /** 그 단계의 대표 표현 — 가장 크게 노출 */
  main?: boolean;
}

export interface KStep {
  id: string;
  /** "ENTER" 같은 영문 코드 — 단계 식별 겸 디자인 라벨 */
  code: string;
  title: LText;
  subtitle: LText;
  /** 직원이 먼저 건네는 말 (말풍선 + 듣기) — 없으면 생략 */
  staffLine?: { ko: string; roman: string; meaning: LText };
  tips: LText[];
  phrases: KPhrase[];
  /** true면 이 단계는 Quick Use 모드 — 문장을 크게, 즉시 보여주기 우선 */
  quickUse?: boolean;
}

export interface KQuiz {
  prompt: LText;
  options: { text: LText; correct?: boolean }[];
  feedback: LText;
}

export const RESTAURANT_STEPS: KStep[] = [
  {
    id: "enter",
    code: "ENTER",
    title: {
      ko: "식당에 들어왔어요",
      en: "You've entered the restaurant",
      ja: "食堂に入りました",
      zh: "走进餐厅了",
    },
    subtitle: {
      ko: "입장 후 무엇을 해야 하는지 알아봐요",
      en: "What to do right after walking in",
      ja: "入店直後に何をすればいいかを知る",
      zh: "了解进门后该做什么",
    },
    staffLine: {
      ko: "몇 분이세요?",
      roman: "myeot bun-iseyo?",
      meaning: {
        ko: "(직원) 몇 명이신가요?",
        en: "(Staff) How many people?",
        ja: "（店員）何名様ですか？",
        zh: "（店员）几位？",
      },
    },
    tips: [
      {
        ko: "직원이 \"몇 분이세요?\"라고 물으면 인원수를 말하고 안내를 받으면 돼요.",
        en: "If the staff asks \"How many people?\", just say your number and follow them.",
        ja: "店員に「何名様ですか？」と聞かれたら、人数を伝えて案内を受ければOK。",
        zh: "如果店员问\"几位？\"，说出人数并跟随引导即可。",
      },
      {
        ko: "빈자리에 직접 앉는 식당도 있어요 — 입구 안내문이나 직원 안내를 먼저 확인해요.",
        en: "Some places let you seat yourself — check the entrance sign or ask the staff first.",
        ja: "空席に自分で座るお店もあります — 入口の案内や店員の指示を先に確認して。",
        zh: "有些餐厅可以自行入座——先看门口提示或询问店员。",
      },
    ],
    phrases: [
      {
        main: true,
        situation: {
          ko: "직원이 인원수를 물을 때",
          en: "When asked how many people",
          ja: "人数を聞かれたら",
          zh: "被问到几位时",
        },
        ko: "두 명이에요.",
        roman: "du myeong-ieyo",
        meaning: { ko: "두 명입니다", en: "We're two.", ja: "二人です。", zh: "我们两位。" },
      },
      {
        situation: {
          ko: "예약했다고 말할 때",
          en: "Telling them you have a reservation",
          ja: "予約済みだと伝える",
          zh: "告知已预约",
        },
        ko: "예약했어요.",
        roman: "yeyakhaesseoyo",
        meaning: { ko: "예약을 했습니다", en: "I have a reservation.", ja: "予約しています。", zh: "我预约过了。" },
      },
      {
        situation: {
          ko: "자리가 있는지 물을 때",
          en: "Asking if there's a table",
          ja: "席があるか尋ねる",
          zh: "询问是否有位子",
        },
        ko: "자리 있어요?",
        roman: "jari isseoyo?",
        meaning: { ko: "빈 자리가 있나요?", en: "Do you have a table?", ja: "席はありますか？", zh: "有位子吗？" },
      },
    ],
  },
  {
    id: "order",
    code: "ORDER",
    title: {
      ko: "주문하려고 해요",
      en: "Time to order",
      ja: "注文しようとしています",
      zh: "准备点餐",
    },
    subtitle: {
      ko: "호출벨·태블릿·키오스크 — 한국 식당의 주문 방식",
      en: "Call bells, tablets, kiosks — how ordering works in Korea",
      ja: "呼び出しベル・タブレット・キオスク — 韓国式の注文",
      zh: "呼叫铃、平板、自助机——韩国餐厅的点餐方式",
    },
    tips: [
      {
        ko: "테이블에 호출벨이 있으면 직원을 부를 때 눌러도 돼요 — 한국 식당의 대표적인 K-Life 요소!",
        en: "If there's a call bell on the table, press it to call the staff — a classic K-Life thing!",
        ja: "テーブルに呼び出しベルがあれば、押して店員を呼んでOK — 韓国食堂の名物です！",
        zh: "桌上有呼叫铃的话，按铃叫店员就行——这是很有代表性的韩式体验！",
      },
      {
        ko: "테이블 태블릿이나 키오스크로 직접 주문하는 식당도 있어요.",
        en: "Some restaurants take orders via table tablets or kiosks.",
        ja: "テーブルのタブレットやキオスクで注文するお店もあります。",
        zh: "也有用桌面平板或自助机点餐的餐厅。",
      },
      {
        ko: "메뉴를 모르면 사진이나 메뉴판을 가리키며 주문해도 자연스러워요.",
        en: "Don't know the menu? Pointing at photos or the menu is perfectly natural.",
        ja: "メニューが分からなければ、写真やメニューを指差して注文しても自然です。",
        zh: "不认识菜名？指着图片或菜单点餐也很自然。",
      },
    ],
    phrases: [
      {
        main: true,
        situation: {
          ko: "메뉴를 가리키며 주문할 때",
          en: "Pointing at the menu to order",
          ja: "メニューを指差して注文",
          zh: "指着菜单点餐时",
        },
        ko: "이거 하나 주세요.",
        roman: "igeo hana juseyo",
        meaning: { ko: "이것 하나 주세요", en: "One of this, please.", ja: "これを一つください。", zh: "请给我一份这个。" },
      },
      {
        situation: {
          ko: "매운지 확인할 때",
          en: "Checking if it's spicy",
          ja: "辛いか確認する",
          zh: "确认辣不辣时",
        },
        ko: "이거 매워요?",
        roman: "igeo maewoyo?",
        meaning: { ko: "이 음식이 맵나요?", en: "Is this spicy?", ja: "これは辛いですか？", zh: "这个辣吗？" },
      },
      {
        situation: {
          ko: "추천을 부탁할 때",
          en: "Asking for a recommendation",
          ja: "おすすめを聞く",
          zh: "请求推荐时",
        },
        ko: "메뉴 추천해주세요.",
        roman: "menyu chucheonhaejuseyo",
        meaning: {
          ko: "메뉴를 추천해 주세요",
          en: "Please recommend something.",
          ja: "おすすめを教えてください。",
          zh: "请推荐一下菜品。",
        },
      },
      {
        situation: {
          ko: "못 먹는 음식을 알릴 때",
          en: "Telling them what you can't eat",
          ja: "食べられないものを伝える",
          zh: "告知不能吃的食物时",
        },
        ko: "저는 ○○ 못 먹어요.",
        roman: "jeoneun ○○ mot meogeoyo",
        meaning: { ko: "저는 ○○을 못 먹습니다", en: "I can't eat ○○.", ja: "私は○○が食べられません。", zh: "我不能吃○○。" },
      },
    ],
  },
  {
    id: "eat",
    code: "EAT",
    title: {
      ko: "음식이 나왔어요",
      en: "The food has arrived",
      ja: "料理が来ました",
      zh: "菜上来了",
    },
    subtitle: {
      ko: "반찬과 한국의 식사 문화",
      en: "Banchan and Korean dining culture",
      ja: "おかず（バンチャン）と韓国の食文化",
      zh: "小菜(Banchan)与韩国饮食文化",
    },
    tips: [
      {
        ko: "메인 음식과 함께 여러 반찬(Banchan)이 나오는 식당이 많아요 — 대부분 기본 제공이에요.",
        en: "Many restaurants serve various side dishes (banchan) with your main — usually included for free.",
        ja: "メインと一緒にいろんなおかず（バンチャン）が出るお店が多く、たいてい無料です。",
        zh: "很多餐厅会随主菜提供多种小菜(Banchan)——通常是免费的。",
      },
      {
        ko: "반찬 리필이 되는 곳이 많지만, 식당마다 다를 수 있어요.",
        en: "Refills are common, but it can vary by restaurant.",
        ja: "おかわり自由の店が多いですが、お店によって異なります。",
        zh: "小菜通常可续，但各店情况可能不同。",
      },
      {
        ko: "밥·국에는 숟가락, 반찬에는 젓가락을 쓰는 경우가 많아요.",
        en: "Koreans often use a spoon for rice and soup, chopsticks for side dishes.",
        ja: "ご飯・スープにはスプーン、おかずには箸を使うことが多いです。",
        zh: "米饭和汤多用勺子，小菜多用筷子。",
      },
    ],
    phrases: [
      {
        main: true,
        situation: {
          ko: "반찬을 더 받고 싶을 때",
          en: "Asking for more side dishes",
          ja: "おかずのおかわりを頼む",
          zh: "想要更多小菜时",
        },
        ko: "반찬 더 주세요.",
        roman: "banchan deo juseyo",
        meaning: {
          ko: "반찬을 더 주세요",
          en: "More side dishes, please.",
          ja: "おかずをもっとください。",
          zh: "请再来点小菜。",
        },
      },
      {
        situation: {
          ko: "맛있다고 말할 때",
          en: "Saying it's delicious",
          ja: "美味しいと伝える",
          zh: "夸好吃时",
        },
        ko: "맛있어요.",
        roman: "masisseoyo",
        meaning: { ko: "맛있습니다", en: "It's delicious.", ja: "美味しいです。", zh: "很好吃。" },
      },
      {
        situation: {
          ko: "너무 매울 때",
          en: "When it's too spicy",
          ja: "辛すぎるとき",
          zh: "太辣的时候",
        },
        ko: "너무 매워요.",
        roman: "neomu maewoyo",
        meaning: { ko: "너무 맵습니다", en: "It's too spicy.", ja: "辛すぎます。", zh: "太辣了。" },
      },
    ],
  },
  {
    id: "need",
    code: "NEED SOMETHING",
    quickUse: true,
    title: {
      ko: "필요한 게 있어요",
      en: "Need something?",
      ja: "必要なものがあります",
      zh: "需要点什么",
    },
    subtitle: {
      ko: "카드를 누르면 크게 보여요 — 직원에게 화면을 그대로 보여주세요",
      en: "Tap a card to enlarge it — just show your screen to the staff",
      ja: "カードを押すと大きく表示 — そのまま店員に見せてOK",
      zh: "点卡片可放大——直接把屏幕给店员看",
    },
    tips: [
      {
        ko: "이 단계는 설명보다 속도! 필요한 문장을 눌러서 바로 쓰세요.",
        en: "This step is about speed — tap the phrase you need and use it right away.",
        ja: "ここはスピード勝負！必要な文をタップしてすぐ使いましょう。",
        zh: "这一步讲究速度！点你需要的句子立刻使用。",
      },
    ],
    phrases: [
      {
        situation: { ko: "물", en: "Water", ja: "水", zh: "水" },
        ko: "물 좀 주세요.",
        roman: "mul jom juseyo",
        meaning: { ko: "물을 주세요", en: "Water, please.", ja: "お水をください。", zh: "请给我水。" },
      },
      {
        situation: { ko: "수저", en: "Spoon", ja: "スプーン", zh: "勺子" },
        ko: "숟가락 하나 주세요.",
        roman: "sutgarak hana juseyo",
        meaning: { ko: "숟가락 하나 주세요", en: "A spoon, please.", ja: "スプーンを一つください。", zh: "请给我一个勺子。" },
      },
      {
        situation: { ko: "휴지", en: "Tissues", ja: "ティッシュ", zh: "纸巾" },
        ko: "휴지 좀 주세요.",
        roman: "hyuji jom juseyo",
        meaning: { ko: "휴지를 주세요", en: "Tissues, please.", ja: "ティッシュをください。", zh: "请给我纸巾。" },
      },
      {
        situation: { ko: "추가 반찬", en: "More banchan", ja: "おかず追加", zh: "加小菜" },
        ko: "반찬 더 주세요.",
        roman: "banchan deo juseyo",
        meaning: {
          ko: "반찬을 더 주세요",
          en: "More side dishes, please.",
          ja: "おかずをもっとください。",
          zh: "请再来点小菜。",
        },
      },
    ],
  },
  {
    id: "pay",
    code: "PAY",
    title: {
      ko: "계산하려고 해요",
      en: "Ready to pay",
      ja: "会計しようとしています",
      zh: "准备结账",
    },
    subtitle: {
      ko: "한국 식당의 결제 방식 이해하기",
      en: "How paying works at Korean restaurants",
      ja: "韓国式の会計方法を知る",
      zh: "了解韩国餐厅的结账方式",
    },
    tips: [
      {
        ko: "많은 식당에서 테이블이 아니라 입구 계산대로 가서 결제해요.",
        en: "At many restaurants you pay at the front counter, not at the table.",
        ja: "多くのお店ではテーブルではなく入口のレジで会計します。",
        zh: "很多餐厅是到门口收银台结账，而不是在餐桌上。",
      },
      {
        ko: "결제 방식과 분할 결제 가능 여부는 식당마다 다를 수 있어요.",
        en: "Payment methods and split-bill options can vary by restaurant.",
        ja: "支払い方法や割り勘の可否はお店によって異なります。",
        zh: "支付方式和是否可分开结账因店而异。",
      },
    ],
    phrases: [
      {
        main: true,
        situation: {
          ko: "계산하겠다고 말할 때",
          en: "Saying you'd like to pay",
          ja: "会計をお願いする",
          zh: "表示要结账时",
        },
        ko: "계산할게요.",
        roman: "gyesanhalkkeyo",
        meaning: { ko: "계산하겠습니다", en: "I'd like to pay.", ja: "お会計お願いします。", zh: "我要买单。" },
      },
      {
        situation: {
          ko: "카드가 되는지 물을 때",
          en: "Asking if cards are accepted",
          ja: "カードが使えるか聞く",
          zh: "询问能否刷卡时",
        },
        ko: "카드 돼요?",
        roman: "kadeu dwaeyo?",
        meaning: { ko: "카드로 결제할 수 있나요?", en: "Can I pay by card?", ja: "カードは使えますか？", zh: "可以刷卡吗？" },
      },
      {
        situation: {
          ko: "따로 계산하고 싶을 때",
          en: "Asking to pay separately",
          ja: "別々に会計したい",
          zh: "想分开结账时",
        },
        ko: "따로 계산할게요.",
        roman: "ttaro gyesanhalkkeyo",
        meaning: {
          ko: "각자 따로 계산하겠습니다",
          en: "We'd like to pay separately.",
          ja: "別々に会計します。",
          zh: "我们要分开结账。",
        },
      },
    ],
  },
  {
    id: "leave",
    code: "LEAVE",
    title: {
      ko: "다 먹었어요",
      en: "All done!",
      ja: "ごちそうさま",
      zh: "吃完了",
    },
    subtitle: {
      ko: "자연스럽게 마무리하고 나가기",
      en: "Wrapping up and heading out, the local way",
      ja: "自然に締めて店を出る",
      zh: "自然收尾，潇洒离店",
    },
    tips: [
      {
        ko: "나가면서 직원에게 감사 인사를 건네는 모습을 흔히 볼 수 있어요 — 필수는 아니지만, 한마디면 서로 기분 좋은 마무리!",
        en: "You'll often see people thanking the staff on the way out — not required, but one phrase makes everyone's day!",
        ja: "帰り際に店員へ感謝を伝える姿をよく見ます — 必須ではないけど、一言で気持ちよく締められます！",
        zh: "常能看到客人离店时向店员道谢——不是必须的，但一句话让彼此都开心！",
      },
    ],
    phrases: [
      {
        main: true,
        situation: {
          ko: "식사를 마치고 나갈 때",
          en: "Leaving after the meal",
          ja: "食事を終えて帰るとき",
          zh: "吃完离开时",
        },
        ko: "잘 먹었습니다!",
        roman: "jal meogeotseumnida",
        meaning: {
          ko: "잘 먹었습니다 (식사 감사 인사)",
          en: "Thanks for the meal!",
          ja: "ごちそうさまでした！",
          zh: "我吃好了，谢谢款待！",
        },
      },
      {
        situation: { ko: "일반적인 감사 인사", en: "A general thank-you", ja: "一般的なお礼", zh: "一般道谢" },
        ko: "감사합니다.",
        roman: "gamsahamnida",
        meaning: { ko: "감사합니다", en: "Thank you.", ja: "ありがとうございます。", zh: "谢谢。" },
      },
    ],
  },
];

/** K-LIFE CHECK — 문법 시험이 아니라 상황 이해 확인용 짧은 시뮬레이션 */
export const RESTAURANT_QUIZ: KQuiz[] = [
  {
    prompt: {
      ko: "직원이 \"몇 분이세요?\"라고 물었다. 뭐라고 답할까?",
      en: "The staff asks \"몇 분이세요?\" (How many people?). What do you say?",
      ja: "店員に「몇 분이세요?」（何名様？）と聞かれた。何と答える？",
      zh: "店员问\"몇 분이세요?\"（几位？），你该怎么回答？",
    },
    options: [
      { text: { ko: "두 개 주세요.", en: "두 개 주세요. (Two of these, please.)", ja: "두 개 주세요.（これを二つください）", zh: "두 개 주세요.（请给我两个）" } },
      { text: { ko: "두 명이에요.", en: "두 명이에요. (We're two.)", ja: "두 명이에요.（二人です）", zh: "두 명이에요.（我们两位）" }, correct: true },
      { text: { ko: "계산할게요.", en: "계산할게요. (I'd like to pay.)", ja: "계산할게요.（お会計お願いします）", zh: "계산할게요.（我要买单）" } },
    ],
    feedback: {
      ko: "'두 명이에요'가 인원수를 자연스럽게 답하는 표현이에요.",
      en: "'두 명이에요' is the natural way to answer with your party size.",
      ja: "「두 명이에요」が人数を自然に伝える表現です。",
      zh: "\"두 명이에요\"是自然告知人数的表达。",
    },
  },
  {
    prompt: {
      ko: "테이블에 호출벨이 있다. 어떻게 할까?",
      en: "There's a call bell on your table. What do you do?",
      ja: "テーブルに呼び出しベルがある。どうする？",
      zh: "桌上有呼叫铃，你会怎么做？",
    },
    options: [
      { text: { ko: "눌러서 직원을 부른다.", en: "Press it to call the staff.", ja: "押して店員を呼ぶ。", zh: "按铃叫店员。" }, correct: true },
      { text: { ko: "사용하면 안 된다.", en: "You're not supposed to use it.", ja: "使ってはいけない。", zh: "不能使用。" } },
      { text: { ko: "계산할 때만 누른다.", en: "Only press it when paying.", ja: "会計のときだけ押す。", zh: "只有结账时才按。" } },
    ],
    feedback: {
      ko: "호출벨이 있는 식당에서는 주문·요청할 때 자유롭게 눌러도 돼요.",
      en: "Where there's a call bell, feel free to press it for orders and requests.",
      ja: "呼び出しベルがあるお店では、注文やお願いのとき自由に押してOK。",
      zh: "有呼叫铃的餐厅，点餐或有需求时都可以随时按。",
    },
  },
  {
    prompt: {
      ko: "식사를 마치고 나간다. 어떤 인사가 자연스러울까?",
      en: "You're leaving after your meal. Which phrase fits?",
      ja: "食事を終えて店を出る。自然なあいさつは？",
      zh: "吃完饭要离开了，哪句更自然？",
    },
    options: [
      { text: { ko: "잘 먹었습니다!", en: "잘 먹었습니다! (Thanks for the meal!)", ja: "잘 먹었습니다!（ごちそうさま！）", zh: "잘 먹었습니다!（谢谢款待！）" }, correct: true },
      { text: { ko: "몇 분이세요?", en: "몇 분이세요? (How many people?)", ja: "몇 분이세요?（何名様？）", zh: "몇 분이세요?（几位？）" } },
      { text: { ko: "이거 매워요?", en: "이거 매워요? (Is this spicy?)", ja: "이거 매워요?（これ辛い？）", zh: "이거 매워요?（这个辣吗？）" } },
    ],
    feedback: {
      ko: "'잘 먹었습니다'는 현지에서 자연스럽게 쓰는 마무리 인사예요.",
      en: "'잘 먹었습니다' is the natural local way to wrap up a meal.",
      ja: "「잘 먹었습니다」が現地で自然な締めのあいさつです。",
      zh: "\"잘 먹었습니다\"是当地人自然的餐后道别语。",
    },
  },
];
