import type { KQuiz, LText } from "./klife-restaurant";

/**
 * K-Life 가이드 · 상황별 3단계 시나리오 (교통·편의점·식당·온천/족욕).
 *
 * 상황 박스를 누르면 전체 화면으로 다섯 장면이 이어진다 — ① 이렇게 하세요/
 * 피하세요 ② STEP 1 ③ STEP 2 ④ STEP 3 ⑤ 퀴즈. 이 파일은 그중 STEP·퀴즈의
 * 콘텐츠를 담고, ①의 사진·문구는 에티켓 자산(ETIQUETTE_ITEMS · messages
 * etiquette.items)을 topic 키로 그대로 끌어다 쓴다.
 *
 * klife-restaurant.ts와 같은 원칙 — UI 라벨은 messages에, 시나리오 콘텐츠는
 * 여기 한 파일에 4개 언어로. 교통처럼 한 상황 아래 시나리오가 여럿이면
 * (지하철·버스·택시) 박스를 누른 뒤 고르는 팝업이 먼저 뜬다.
 */

/** 첫 화면 Do/Don't를 끌어올 에티켓 주제 키 */
export type KLifeTopic = "transport" | "convenience" | "dining" | "oncheon";

export interface KScenarioStep {
  title: LText;
  body: LText;
  /** 단계 사진 (public 경로). 아직 없으면 화면에 자리만 비워 둔다 */
  image?: string;
}

export interface KScenario {
  id: string;
  title: LText;
  /** 정확히 셋 — 화면 ②③④ */
  steps: [KScenarioStep, KScenarioStep, KScenarioStep];
  quiz: KQuiz[];
}

export interface KSituation {
  /** 에티켓 주제 키 겸 상황 id — 대표 사진(topicImages)·Do/Don't가 이 키로 잡힌다 */
  topic: KLifeTopic;
  title: LText;
  /** 둘 이상이면 고르는 팝업이 먼저 뜬다 */
  scenarios: KScenario[];
}

const SUBWAY: KScenario = {
  id: "subway",
  title: { ko: "지하철", en: "Subway", ja: "地下鉄", zh: "地铁" },
  steps: [
    {
      title: {
        ko: "개찰구 통과 및 승차권 태그",
        en: "Tap in at the gate",
        ja: "改札を通る・乗車券をタッチ",
        zh: "通过闸机并刷卡",
      },
      body: {
        ko: "개찰구에 다가갈 때 교통카드(T-money 등)나 모바일 승차권을 단말기에 정확히 태그(찍고)하여 문이 열리면 통과합니다.",
        en: "As you reach the gate, tap your transit card (T-money etc.) or mobile ticket firmly on the reader. Walk through once the gate opens.",
        ja: "改札に近づいたら、交通カード（T-moneyなど）やモバイル乗車券を端末にしっかりタッチし、ゲートが開いたら通過します。",
        zh: "走到闸机前，把交通卡（T-money 等）或手机车票在感应器上刷一下，闸门打开后通过。",
      },
    },
    {
      title: {
        ko: "에스컬레이터와 이동 방향 확인",
        en: "Check the direction before going down",
        ja: "エスカレーターと進行方向の確認",
        zh: "确认扶梯与行进方向",
      },
      body: {
        ko: "플랫폼으로 내려가거나 올라갈 때, 에스컬레이터나 계단이 내가 가려는 방향(상행/하행)이 맞는지 바닥이나 전광판의 화살표 표지판을 반드시 확인해야 역주행 사고를 예방할 수 있습니다.",
        en: "Before taking the escalator or stairs to the platform, check the arrows on the floor or signboards to make sure it's the direction you need (up/down line). This prevents ending up on the wrong side.",
        ja: "ホームへ降りる・上るときは、エスカレーターや階段が自分の行きたい方向（上り/下り）かどうか、床や電光掲示板の矢印表示を必ず確認しましょう。逆方向のホームに行くミスを防げます。",
        zh: "上下站台时，务必看清地面或显示屏上的箭头，确认扶梯或楼梯通向自己要去的方向（上行/下行），避免走错站台。",
      },
    },
    {
      title: {
        ko: "교통약자 배려석 구분 (핑크/보라 의자)",
        en: "Priority seats: pink and purple",
        ja: "優先席の見分け方（ピンク/紫の座席）",
        zh: "认识爱心专座（粉色/紫色座椅）",
      },
      body: {
        ko: "객실 양 끝이나 중간에 있는 교통약자 배려석은 색상으로 구분되어 있습니다. 분홍색 의자는 임산부 배려석, 보라색(또는 자주색 계열) 의자는 노약자(어르신, 장애인 등) 배려석입니다. 자리가 비어 있어도 일반 승객은 가급적 비워두어야 합니다.",
        en: "Priority seats at the ends and middle of each car are color-coded. Pink seats are for pregnant women; purple (or plum) seats are for the elderly and people with disabilities. Even when they're empty, regular passengers should leave them open.",
        ja: "車両の両端や中央にある優先席は色で区別されています。ピンクの座席は妊婦さん用、紫（または赤紫系）の座席は高齢者・障がい者などのための席です。空いていても、一般の乗客はなるべく座らないようにしましょう。",
        zh: "车厢两端和中间的爱心专座用颜色区分：粉色座椅是孕妇专座，紫色（或紫红色）座椅是老弱病残专座。即使座位空着，普通乘客也应尽量不坐。",
      },
    },
  ],
  quiz: [
    {
      prompt: {
        ko: "지하철을 타기 위해 개찰구를 통과할 때 우리가 해야 하는 행동은 무엇인가요?",
        en: "What should you do when passing through the subway gate?",
        ja: "地下鉄に乗るために改札を通るとき、何をすればよいでしょうか？",
        zh: "乘坐地铁通过闸机时，应该怎么做？",
      },
      options: [
        {
          text: { ko: "그냥 밀고 들어간다.", en: "Just push through.", ja: "そのまま押して入る。", zh: "直接推门进去。" },
        },
        {
          text: {
            ko: "교통카드를 단말기에 태그(찍고)한다.",
            en: "Tap your transit card on the reader.",
            ja: "交通カードを端末にタッチする。",
            zh: "把交通卡在感应器上刷一下。",
          },
          correct: true,
        },
        {
          text: { ko: "지폐를 투입구에 넣는다.", en: "Insert a banknote into the slot.", ja: "紙幣を投入口に入れる。", zh: "把纸币塞进投币口。" },
        },
      ],
      feedback: {
        ko: "개찰구에서는 교통카드나 모바일 승차권을 단말기에 태그해야 문이 열려요.",
        en: "The gate only opens when you tap a transit card or mobile ticket on the reader.",
        ja: "改札は交通カードやモバイル乗車券を端末にタッチしないと開きません。",
        zh: "只有把交通卡或手机车票刷在感应器上，闸门才会打开。",
      },
    },
    {
      prompt: {
        ko: "지하철에서 분홍색으로 표시된 좌석은 주로 누구를 위한 배려석인가요?",
        en: "Who are the pink seats on the subway reserved for?",
        ja: "地下鉄でピンク色に表示された座席は、主に誰のための席でしょうか？",
        zh: "地铁上粉色标示的座位主要是为谁准备的？",
      },
      options: [
        { text: { ko: "노약자", en: "The elderly", ja: "高齢者", zh: "老年人" } },
        { text: { ko: "임산부", en: "Pregnant women", ja: "妊婦", zh: "孕妇" }, correct: true },
        { text: { ko: "어린이", en: "Children", ja: "子ども", zh: "儿童" } },
      ],
      feedback: {
        ko: "분홍색은 임산부 배려석, 보라색은 노약자 배려석이에요. 비어 있어도 가급적 비워 두세요.",
        en: "Pink is for pregnant women, purple for the elderly. Leave them open even when empty.",
        ja: "ピンクは妊婦さん用、紫は高齢者用の優先席です。空いていてもなるべく空けておきましょう。",
        zh: "粉色是孕妇专座，紫色是老弱专座。即使空着也请尽量留出来。",
      },
    },
  ],
};

const BUS: KScenario = {
  id: "bus",
  title: { ko: "버스", en: "Bus", ja: "バス", zh: "公交车" },
  steps: [
    {
      title: {
        ko: "탑승 시 요금 지불 및 승차 호선 확인",
        en: "Check the route and tap in",
        ja: "乗車時の運賃支払いと路線確認",
        zh: "确认线路并上车刷卡",
      },
      body: {
        ko: "버스가 정류장에 도착하면 번호와 목적지를 확인하고 탑승합니다. 탈 때 반드시 단말기에 교통카드를 태그하여 요금을 지불합니다.",
        en: "When the bus pulls in, check its number and destination before boarding. Tap your transit card on the reader as you get on to pay the fare.",
        ja: "バスが停留所に着いたら、番号と行き先を確認してから乗ります。乗るときは必ず端末に交通カードをタッチして運賃を払います。",
        zh: "公交车到站后，先确认车号和目的地再上车。上车时务必把交通卡刷在感应器上付费。",
      },
    },
    {
      title: {
        ko: "교통약자 배려석 구분과 자리 양보",
        en: "Priority seats and giving up your seat",
        ja: "優先席の見分け方と席の譲り合い",
        zh: "认识爱心专座并主动让座",
      },
      body: {
        ko: "버스 앞쪽이나 지정된 좌석 중 노란색 계열은 노약자용, 분홍색은 임산부 배려석으로 지정되어 있습니다. 일반 승객은 자리가 비어 있어도 이 자리를 비워두거나 양보해야 합니다.",
        en: "Near the front of the bus, yellow seats are for the elderly and pink seats are for pregnant women. Regular passengers should leave these open or give them up, even when they're empty.",
        ja: "バスの前方や指定席のうち、黄色系は高齢者用、ピンクは妊婦さん用の優先席です。一般の乗客は空いていてもこの席を空けておくか、譲りましょう。",
        zh: "公交车前部或指定座位中，黄色系是老弱专座，粉色是孕妇专座。普通乘客即使座位空着也应留出或让座。",
      },
    },
    {
      title: {
        ko: "하차 준비 및 벨 누르기",
        en: "Press the bell before your stop",
        ja: "降車の準備と降車ボタン",
        zh: "准备下车并按下车铃",
      },
      body: {
        ko: "목적지 정류장에 내리기 전, 미리 좌석 주변에 있는 하차 벨을 눌러 기사님께 내려야 한다는 신호를 보내야 합니다. 내릴 때도 카드를 단말기에 다시 태그해야 환승 할인 혜택을 받을 수 있습니다.",
        en: "Before your stop, press the stop bell near your seat to let the driver know. Tap your card on the reader again as you get off — that's what gives you the transfer discount.",
        ja: "目的の停留所に着く前に、座席近くの降車ボタンを押して運転手さんに知らせます。降りるときもカードを端末にもう一度タッチすると乗り換え割引が受けられます。",
        zh: "到站前，先按座位附近的下车铃告诉司机要下车。下车时再刷一次卡，才能享受换乘优惠。",
      },
    },
  ],
  quiz: [
    {
      prompt: {
        ko: "버스에서 내리기 전, 기사님에게 멈춰 달라고 신호를 보내기 위해 해야 하는 행동은 무엇인가요?",
        en: "How do you signal the driver that you want to get off at the next stop?",
        ja: "バスを降りる前、運転手さんに止まってほしいと伝えるにはどうすればよいでしょうか？",
        zh: "下公交车前，怎样告诉司机你要下车？",
      },
      options: [
        { text: { ko: "소리를 크게 지른다.", en: "Shout loudly.", ja: "大きな声で叫ぶ。", zh: "大声喊。" } },
        {
          text: { ko: "하차 벨을 미리 누른다.", en: "Press the stop bell in advance.", ja: "降車ボタンを先に押す。", zh: "提前按下车铃。" },
          correct: true,
        },
        {
          text: { ko: "운전석으로 직접 가서 말한다.", en: "Walk up to the driver and tell them.", ja: "運転席まで行って直接言う。", zh: "直接走到驾驶座去说。" },
        },
      ],
      feedback: {
        ko: "내리기 전에 하차 벨을 미리 눌러 신호를 보내요. 내릴 때도 카드를 태그해야 환승 할인을 받아요.",
        en: "Press the stop bell before your stop. Tap your card again when getting off to get the transfer discount.",
        ja: "降りる前に降車ボタンを押して知らせます。降りるときもカードをタッチすると乗り換え割引が受けられます。",
        zh: "到站前先按下车铃。下车时再刷一次卡才能享受换乘优惠。",
      },
    },
    {
      prompt: {
        ko: "버스 내 좌석 색상 중 분홍색으로 표시된 좌석은 주로 누구를 위한 배려석인가요?",
        en: "Who are the pink seats on the bus reserved for?",
        ja: "バスの座席のうちピンク色の席は、主に誰のための席でしょうか？",
        zh: "公交车上粉色标示的座位主要是为谁准备的？",
      },
      options: [
        { text: { ko: "어린이", en: "Children", ja: "子ども", zh: "儿童" } },
        { text: { ko: "임산부", en: "Pregnant women", ja: "妊婦", zh: "孕妇" }, correct: true },
        { text: { ko: "외국인 관광객", en: "Foreign tourists", ja: "外国人観光客", zh: "外国游客" } },
      ],
      feedback: {
        ko: "버스에서 분홍색 좌석은 임산부 배려석이에요. 노란색은 노약자용이에요.",
        en: "Pink seats on the bus are for pregnant women; yellow ones are for the elderly.",
        ja: "バスのピンクの席は妊婦さん用です。黄色は高齢者用です。",
        zh: "公交车上粉色座位是孕妇专座，黄色是老弱专座。",
      },
    },
  ],
};

const TAXI: KScenario = {
  id: "taxi",
  title: { ko: "택시", en: "Taxi", ja: "タクシー", zh: "出租车" },
  steps: [
    {
      title: {
        ko: "합법적인 영업용 택시 확인하기 (번호판 체크)",
        en: "Spot a licensed taxi by its plate",
        ja: "正規の営業用タクシーか確認（ナンバープレート）",
        zh: "通过车牌确认正规营运出租车",
      },
      body: {
        ko: "길거리에서 일반 택시를 잡을 때, 차량 번호판 중간의 글자가 '아, 바, 사, 자' 중 하나로 되어 있는지 확인해야 합니다. 이 글자가 포함된 차량이 정식 영업용 허가를 받은 안전한 택시입니다.",
        en: "When hailing a taxi on the street, check the Korean letter in the middle of the license plate. If it's 아, 바, 사 or 자, the car is a licensed commercial taxi and safe to take.",
        ja: "街でタクシーを拾うときは、ナンバープレート中央の文字が「아・바・사・자」のいずれかか確認しましょう。この文字がある車が正式に営業許可を受けた安全なタクシーです。",
        zh: "在路边打车时，看车牌中间的韩文字是否是\"아、바、사、자\"之一。带有这些字的车才是正规营运许可的安全出租车。",
      },
    },
    {
      title: {
        ko: "탑승 및 목적지 전달 (결제 방식)",
        en: "Tell the driver where to go — and how you'll pay",
        ja: "乗車と目的地の伝え方（支払い方法）",
        zh: "上车告知目的地（付款方式）",
      },
      body: {
        ko: "택시에 타면 기사님께 목적지 주소를 보여주거나 말합니다. 요금은 목적지에 도착한 후 신용카드, 교통카드, 현금, 혹은 모바일 간편결제(카카오T 등)로 편리하게 계산할 수 있습니다.",
        en: "Once inside, show or tell the driver your destination address. You pay when you arrive — by credit card, transit card, cash, or mobile payment apps like Kakao T.",
        ja: "乗ったら運転手さんに目的地の住所を見せるか伝えます。料金は目的地に着いてから、クレジットカード・交通カード・現金・モバイル決済（カカオTなど）で支払えます。",
        zh: "上车后把目的地地址给司机看或直接说出来。到达目的地后再用信用卡、交通卡、现金或手机支付（Kakao T 等）付款即可。",
      },
    },
    {
      title: {
        ko: "하차 시 소지품 확인",
        en: "Check your belongings before getting out",
        ja: "降車時の持ち物確認",
        zh: "下车前检查随身物品",
      },
      body: {
        ko: "내리기 전에 지갑, 스마트폰, 가방 등 개인 소지품을 좌석에 두고 내리지 않았는지 마지막으로 꼼꼼히 확인하고 문을 닫습니다.",
        en: "Before you step out, double-check the seat for your wallet, phone, and bag, then close the door.",
        ja: "降りる前に、財布・スマートフォン・バッグなどを座席に置き忘れていないか最後にしっかり確認してからドアを閉めます。",
        zh: "下车前最后仔细检查一下钱包、手机、包等有没有落在座位上，然后关好车门。",
      },
    },
  ],
  quiz: [
    {
      prompt: {
        ko: "한국에서 길거리에 있는 일반 택시를 탈 때, 안전을 위해 번호판 중간에 반드시 들어가야 하는 글자 조합은 무엇인가요?",
        en: "Which set of letters in the middle of the plate marks a licensed street taxi in Korea?",
        ja: "韓国で街のタクシーに乗るとき、安全のためナンバープレート中央に入っているべき文字の組み合わせはどれでしょうか？",
        zh: "在韩国路边打车时，为了安全，车牌中间必须是哪组字？",
      },
      options: [
        { text: { ko: "'가, 나, 다, 라'", en: "가, 나, 다, 라", ja: "「가・나・다・라」", zh: "\"가、나、다、라\"" } },
        { text: { ko: "'아, 바, 사, 자'", en: "아, 바, 사, 자", ja: "「아・바・사・자」", zh: "\"아、바、사、자\"" }, correct: true },
        { text: { ko: "'마, 바, 사, 아'", en: "마, 바, 사, 아", ja: "「마・바・사・아」", zh: "\"마、바、사、아\"" } },
      ],
      feedback: {
        ko: "번호판 가운데 글자가 '아·바·사·자'면 정식 영업용 택시예요.",
        en: "If the middle letter is 아, 바, 사 or 자, it's a licensed commercial taxi.",
        ja: "ナンバープレート中央の文字が「아・바・사・자」なら正規の営業用タクシーです。",
        zh: "车牌中间的字是\"아、바、사、자\"就是正规营运出租车。",
      },
    },
    {
      prompt: {
        ko: "택시 요금은 언제 계산하는 것이 원칙인가요?",
        en: "When do you normally pay the taxi fare?",
        ja: "タクシー料金はいつ支払うのが基本でしょうか？",
        zh: "出租车费通常什么时候付？",
      },
      options: [
        { text: { ko: "탈 때 미리 선결제한다.", en: "Prepay when you get in.", ja: "乗るときに先払いする。", zh: "上车时先付。" } },
        {
          text: {
            ko: "목적지에 도착한 후 하차하면서 계산한다.",
            en: "Pay when you arrive, as you get out.",
            ja: "目的地に着いて降りるときに払う。",
            zh: "到达目的地下车时付。",
          },
          correct: true,
        },
        {
          text: {
            ko: "타기 전 기사님 계좌로 송금한다.",
            en: "Transfer money to the driver's account beforehand.",
            ja: "乗る前に運転手の口座に送金する。",
            zh: "上车前转账到司机账户。",
          },
        },
      ],
      feedback: {
        ko: "요금은 목적지에 도착한 뒤 카드·현금·간편결제로 계산해요.",
        en: "You pay on arrival — card, cash, or mobile payment all work.",
        ja: "料金は目的地に着いてからカード・現金・モバイル決済で支払います。",
        zh: "车费在到达目的地后用卡、现金或手机支付。",
      },
    },
  ],
};

const CONVENIENCE: KScenario = {
  id: "convenience",
  title: { ko: "편의점", en: "Convenience store", ja: "コンビニ", zh: "便利店" },
  steps: [
    {
      title: {
        ko: "24시간 연중무휴 이용",
        en: "Open 24/7, all year",
        ja: "24時間・年中無休で利用",
        zh: "全年无休 24 小时营业",
      },
      body: {
        ko: "GS25, CU, 세븐일레븐 등 대부분의 한국 편의점은 365일 24시간 운영됩니다. 신용카드, 모바일 페이, 교통카드 등으로 누구나 쉽게 물건을 살 수 있습니다.",
        en: "Most Korean convenience stores — GS25, CU, 7-Eleven — are open 24 hours, 365 days a year. Anyone can pay easily with a credit card, mobile pay, or transit card.",
        ja: "GS25・CU・セブンイレブンなど韓国のほとんどのコンビニは365日24時間営業です。クレジットカード・モバイル決済・交通カードなどで誰でも簡単に買い物できます。",
        zh: "GS25、CU、7-Eleven 等韩国大多数便利店全年 365 天 24 小时营业。用信用卡、手机支付、交通卡都能轻松购物。",
      },
    },
    {
      title: {
        ko: "무인 계산대(키오스크) 이용 방법",
        en: "Using the self-checkout kiosk",
        ja: "無人レジ（キオスク）の使い方",
        zh: "自助收银机（Kiosk）的使用方法",
      },
      body: {
        ko: "직원이 없거나 무인으로 운영되는 시간대에는 셀프 계산대(키오스크)를 이용합니다. ① 구매할 상품의 바코드를 스캐너에 삑 소리가 나도록 갖다 대어 화면에 상품 목록이 뜨는지 확인합니다. ② '결제하기' 버튼을 누릅니다.",
        en: "When there's no staff or the store is unmanned, use the self-checkout kiosk. ① Hold each item's barcode to the scanner until it beeps and check that it appears on screen. ② Press the 'Pay' button.",
        ja: "店員がいない時間帯や無人営業のときはセルフレジ（キオスク）を使います。① 商品のバーコードをスキャナーに「ピッ」と音が鳴るようにかざし、画面に商品が表示されたか確認します。②「決済する」ボタンを押します。",
        zh: "没有店员或无人营业时段使用自助收银机。① 把商品条形码对准扫描器，听到\"嘀\"声后确认屏幕上出现了商品。② 按\"结算\"按钮。",
      },
    },
    {
      title: {
        ko: "간편결제(네이버페이·카카오페이) 및 카드로 결제하기",
        en: "Pay by card or Naver Pay / Kakao Pay",
        ja: "モバイル決済（NAVERペイ・カカオペイ）やカードで支払う",
        zh: "用手机支付（Naver Pay·Kakao Pay）或银行卡付款",
      },
      body: {
        ko: "결제 수단 화면에서 '신용카드' 또는 '간편결제(카카오페이, 네이버페이 등)'를 선택합니다. 카드를 카드 삽입구에 꽂거나, 스마트폰 화면에 뜬 QR코드/바코드를 리더기에 스캔하면 결제가 완료됩니다. (영수증 출력 여부를 선택하고 영수증을 챙깁니다.)",
        en: "On the payment screen, choose 'Credit card' or 'Mobile pay (Kakao Pay, Naver Pay, etc.)'. Insert your card in the slot, or scan the QR code / barcode on your phone with the reader, and you're done. Choose whether to print a receipt and take it.",
        ja: "支払い方法の画面で「クレジットカード」または「モバイル決済（カカオペイ・NAVERペイなど）」を選びます。カードを挿入口に差し込むか、スマートフォンに表示されたQRコード/バーコードをリーダーにかざせば決済完了です（レシートを出すか選び、受け取ります）。",
        zh: "在付款方式界面选择\"信用卡\"或\"手机支付（Kakao Pay、Naver Pay 等）\"。把卡插进插卡口，或把手机上显示的二维码/条形码对准读取器扫描，即可完成付款。（选择是否打印小票并收好。）",
      },
    },
  ],
  quiz: [
    {
      prompt: {
        ko: "편의점 무인 계산대(키오스크)에서 상품을 등록할 때 가장 먼저 해야 하는 행동은 무엇인가요?",
        en: "What's the first thing to do at a self-checkout kiosk?",
        ja: "コンビニの無人レジ（キオスク）で商品を登録するとき、最初にすることは何でしょうか？",
        zh: "在便利店自助收银机上登记商品时，第一步应该做什么？",
      },
      options: [
        {
          text: {
            ko: "상품 바코드를 스캐너에 갖다 댄다.",
            en: "Hold the item's barcode to the scanner.",
            ja: "商品のバーコードをスキャナーにかざす。",
            zh: "把商品条形码对准扫描器。",
          },
          correct: true,
        },
        { text: { ko: "현금을 서랍에 넣는다.", en: "Put cash in the drawer.", ja: "現金を引き出しに入れる。", zh: "把现金放进抽屉。" } },
        { text: { ko: "사장님을 크게 부른다.", en: "Shout for the owner.", ja: "店長を大声で呼ぶ。", zh: "大声喊老板。" } },
      ],
      feedback: {
        ko: "먼저 상품 바코드를 스캐너에 찍어 화면에 상품이 뜨는지 확인한 뒤 결제하기를 눌러요.",
        en: "Scan each barcode first, check it shows on screen, then press Pay.",
        ja: "まず商品のバーコードをスキャンして画面に表示されたか確認し、それから決済ボタンを押します。",
        zh: "先扫描商品条形码，确认屏幕上出现商品后再按结算。",
      },
    },
    {
      prompt: {
        ko: "무인 계산대에서 스마트폰에 있는 네이버페이나 카카오페이로 결제할 때 보통 어떻게 하나요?",
        en: "How do you usually pay with Naver Pay or Kakao Pay at a self-checkout?",
        ja: "無人レジでスマートフォンのNAVERペイやカカオペイで支払うとき、普通はどうしますか？",
        zh: "在自助收银机上用手机的 Naver Pay 或 Kakao Pay 付款时，通常怎么做？",
      },
      options: [
        {
          text: {
            ko: "스마트폰을 화면에 세게 부딪힌다.",
            en: "Bump your phone hard against the screen.",
            ja: "スマートフォンを画面に強くぶつける。",
            zh: "用手机使劲碰屏幕。",
          },
        },
        {
          text: {
            ko: "앱에 뜬 QR코드나 바코드를 스캐너에 읽힌다.",
            en: "Scan the QR code or barcode from the app.",
            ja: "アプリに表示されたQRコードやバーコードをスキャナーに読ませる。",
            zh: "让扫描器读取应用里显示的二维码或条形码。",
          },
          correct: true,
        },
        {
          text: {
            ko: "화면에 내 전화번호를 직접 입력한다.",
            en: "Type your phone number on the screen.",
            ja: "画面に自分の電話番号を直接入力する。",
            zh: "在屏幕上直接输入自己的电话号码。",
          },
        },
      ],
      feedback: {
        ko: "앱에 뜬 QR코드나 바코드를 리더기에 스캔하면 결제가 끝나요.",
        en: "Just scan the QR code or barcode shown in the app and the payment goes through.",
        ja: "アプリに表示されたQRコードやバーコードをリーダーでスキャンすれば決済完了です。",
        zh: "把应用里显示的二维码或条形码扫一下就完成付款了。",
      },
    },
  ],
};

const RESTAURANT: KScenario = {
  id: "restaurant",
  title: { ko: "식당", en: "Restaurant", ja: "食堂", zh: "餐厅" },
  steps: [
    {
      title: {
        ko: "착석 및 메뉴 고르기 (테이블 주문 또는 메뉴판)",
        en: "Sit down and pick from the menu",
        ja: "着席してメニューを選ぶ（テーブル注文またはメニュー表）",
        zh: "就座并选择菜单（桌面点餐或菜单）",
      },
      body: {
        ko: "자리에 앉으면 테이블 위에 메뉴판이 있거나, 최근에는 태블릿(터치스크린)이 설치되어 있어 화면을 보며 직접 주문할 수 있습니다. 외국인 친구와 함께라면 메뉴판의 사진을 보거나 추천 메뉴를 고릅니다.",
        en: "Once seated, you'll find a menu on the table — or, increasingly, a tablet you can order from directly. Look at the photos on the menu or go with a recommended dish.",
        ja: "席に着くとテーブルにメニュー表があるか、最近はタブレット（タッチパネル）が置かれていて画面から直接注文できます。メニューの写真を見たり、おすすめメニューを選びましょう。",
        zh: "就座后桌上会有菜单，最近很多店还装了平板（触摸屏），可以直接在屏幕上点餐。可以看菜单上的图片，或者选推荐菜。",
      },
    },
    {
      title: {
        ko: "직원 부르기 (벨 누르기)",
        en: "Call the staff with the bell",
        ja: "店員を呼ぶ（呼び出しベル）",
        zh: "呼叫服务员（按铃）",
      },
      body: {
        ko: "한국 식당 대부분은 테이블 옆이나 벽면에 '호출 벨(Call Bell)'이 붙어 있습니다. 직원을 부르고 싶을 때 이 벨을 가볍게 한 번 누르면 \"네~\" 하고 직원이 바로 다가옵니다. (손을 들고 \"저기요!\" 하고 부르기도 합니다.)",
        en: "Most Korean restaurants have a call bell on the table or wall. Press it once and a staff member will come right over. You can also raise your hand and say \"Jeogiyo!\" (Excuse me!).",
        ja: "韓国の食堂の多くは、テーブル横や壁に「呼び出しベル」があります。店員を呼びたいときは軽く一度押すと「はい〜」とすぐ来てくれます（手を挙げて「チョギヨ！」と呼ぶこともあります）。",
        zh: "韩国大多数餐厅的桌边或墙上都有\"呼叫铃\"。想叫服务员时轻按一下，服务员就会马上过来。（也可以举手喊\"저기요！\"）",
      },
    },
    {
      title: {
        ko: "메뉴 주문 및 손가락으로 가리키기",
        en: "Order by pointing at the menu",
        ja: "メニューを注文する・指さしで伝える",
        zh: "点菜并用手指指着菜单",
      },
      body: {
        ko: "직원이 오면 주문할 메뉴 이름을 말합니다. 언어가 통하지 않아 어색하다면, 메뉴판의 글씨나 사진을 손가락으로 가리키며 \"이거 주세요(이것 주세여)\"라고 말하면 쉽고 정확하게 주문할 수 있습니다.",
        en: "When the staff arrives, say the name of the dish. If language is a barrier, just point at the menu and say \"Igeo juseyo\" (This one, please) — simple and accurate.",
        ja: "店員が来たら注文するメニュー名を言います。言葉が通じなくて気まずければ、メニューの文字や写真を指さして「イゴ ジュセヨ（これください）」と言えば簡単で正確に注文できます。",
        zh: "服务员来了就说要点的菜名。语言不通的话，用手指着菜单上的字或图片说\"이거 주세요（请给我这个）\"，就能又简单又准确地点菜。",
      },
    },
  ],
  quiz: [
    {
      prompt: {
        ko: "한국 식당에서 직원을 부르고 싶을 때 테이블 위나 벽면에서 찾아 눌러야 하는 것은 무엇인가요?",
        en: "What do you press on the table or wall to call the staff in a Korean restaurant?",
        ja: "韓国の食堂で店員を呼びたいとき、テーブルや壁で探して押すものは何でしょうか？",
        zh: "在韩国餐厅想叫服务员时，应该在桌上或墙上找什么来按？",
      },
      options: [
        { text: { ko: "비상 탈출 버튼", en: "Emergency exit button", ja: "非常脱出ボタン", zh: "紧急逃生按钮" } },
        { text: { ko: "호출 벨", en: "Call bell", ja: "呼び出しベル", zh: "呼叫铃" }, correct: true },
        { text: { ko: "조명 스위치", en: "Light switch", ja: "照明スイッチ", zh: "电灯开关" } },
      ],
      feedback: {
        ko: "테이블 옆이나 벽면의 호출 벨을 한 번 누르면 직원이 바로 와요.",
        en: "Press the call bell on the table or wall once and the staff will come right over.",
        ja: "テーブル横や壁の呼び出しベルを一度押せば店員がすぐ来てくれます。",
        zh: "按一下桌边或墙上的呼叫铃，服务员马上就来。",
      },
    },
    {
      prompt: {
        ko: "언어가 잘 통하지 않는 외국인이 한국 식당에서 원하는 메뉴를 가장 쉽고 정확하게 주문하는 방법은 무엇인가요?",
        en: "What's the easiest, most accurate way to order when you don't speak Korean?",
        ja: "言葉があまり通じない外国人が韓国の食堂で、いちばん簡単で正確に注文する方法は何でしょうか？",
        zh: "语言不太通的外国人在韩国餐厅点菜，最简单准确的方法是什么？",
      },
      options: [
        {
          text: {
            ko: "메뉴판의 사진이나 글씨를 손가락으로 가리키며 주문한다.",
            en: "Point at the photo or text on the menu.",
            ja: "メニューの写真や文字を指さして注文する。",
            zh: "用手指着菜单上的图片或文字点菜。",
          },
          correct: true,
        },
        { text: { ko: "눈을 감고 아무거나 외친다.", en: "Close your eyes and shout anything.", ja: "目を閉じて適当に叫ぶ。", zh: "闭上眼睛随便喊。" } },
        {
          text: {
            ko: "주방 안으로 직접 들어가서 재료를 보여준다.",
            en: "Walk into the kitchen and show them the ingredients.",
            ja: "厨房に直接入って材料を見せる。",
            zh: "直接走进厨房指给他们看食材。",
          },
        },
      ],
      feedback: {
        ko: "메뉴판의 사진이나 글씨를 가리키며 \"이거 주세요\"라고 하면 정확하게 주문할 수 있어요.",
        en: "Point at the menu and say \"Igeo juseyo\" — that's all it takes.",
        ja: "メニューの写真や文字を指さして「イゴ ジュセヨ」と言えば正確に注文できます。",
        zh: "指着菜单上的图片或文字说\"이거 주세요\"就能准确点菜。",
      },
    },
  ],
};

const ONCHEON: KScenario = {
  id: "oncheon",
  title: { ko: "온천·족욕", en: "Hot springs & foot baths", ja: "温泉・足湯", zh: "温泉·足浴" },
  steps: [
    {
      title: {
        ko: "입장 전 탈의 및 철저한 샤워",
        en: "Undress and shower thoroughly first",
        ja: "入浴前の脱衣と念入りなシャワー",
        zh: "入场前脱衣并彻底淋浴",
      },
      body: {
        ko: "온천이나 대중목욕탕에 들어가기 전, 탈의실에서 옷을 완전히 탈의한 후 샤워실에서 머리와 몸을 깨끗이 씻고 탕 안으로 들어가야 합니다. (일반 대중목욕탕에서는 수영복 착용이 금지됩니다.)",
        en: "Before entering a hot spring or public bath, undress completely in the locker room, then wash your hair and body in the shower area before getting into the tub. Swimsuits are not allowed in regular public baths.",
        ja: "温泉や大衆浴場に入る前に、脱衣所で服を完全に脱ぎ、シャワー室で髪と体をきれいに洗ってから湯船に入ります（一般の大衆浴場では水着の着用は禁止です）。",
        zh: "进入温泉或大众浴场前，先在更衣室把衣服全部脱掉，在淋浴间把头发和身体洗干净后再进入浴池。（普通大众浴场禁止穿泳衣。）",
      },
    },
    {
      title: {
        ko: "탕 이용 예절 지키기",
        en: "Bath etiquette in the tub",
        ja: "湯船でのマナー",
        zh: "遵守浴池礼仪",
      },
      body: {
        ko: "탕 안에서 수건을 물에 담그거나 때를 미는 등 물을 더럽히는 행동은 절대 금물입니다. 긴 머리는 물에 닿지 않도록 위로 묶거나 깔끔하게 올려야 합니다.",
        en: "Never dip your towel in the water or scrub yourself in the tub — anything that dirties the water is off-limits. Tie long hair up so it stays out of the water.",
        ja: "湯船の中でタオルをお湯につけたり、垢すりをしたりなど、お湯を汚す行為は絶対にしないでください。長い髪はお湯に触れないように上で結ぶか、きれいにまとめましょう。",
        zh: "在浴池里绝对不能把毛巾泡进水里或搓澡等弄脏池水的行为。长发要扎起来或盘好，避免接触池水。",
      },
    },
    {
      title: {
        ko: "족욕탕 이용 시 사전 세정 필수",
        en: "Wash your feet before the foot bath",
        ja: "足湯の前には必ず足を洗う",
        zh: "使用足浴池前必须先洗脚",
      },
      body: {
        ko: "실내외에 마련된 무료 족욕탕을 이용할 때는, 바로 발을 담그지 말고 족욕탕 주변에 있는 전용 발 씻는 곳에서 먼저 발을 깨끗이 씻은 후 이용해야 타인을 배려하는 예의가 됩니다.",
        en: "At the free indoor and outdoor foot baths, don't dip straight in. Wash your feet first at the dedicated foot-washing station nearby — it's basic courtesy to everyone else.",
        ja: "屋内外にある無料の足湯を利用するときは、いきなり足を入れず、足湯のそばにある専用の足洗い場でまず足をきれいに洗ってから入るのが、周りの人への礼儀です。",
        zh: "使用室内外的免费足浴池时，不要直接把脚泡进去，先在足浴池旁的专用洗脚处把脚洗干净再用，这是对他人的礼貌。",
      },
    },
  ],
  quiz: [
    {
      prompt: {
        ko: "온천이나 대중목욕탕의 탕에 들어가기 전, 반드시 해야 하는 행동은 무엇인가요?",
        en: "What must you do before getting into the tub at a hot spring or public bath?",
        ja: "温泉や大衆浴場の湯船に入る前に、必ずすることは何でしょうか？",
        zh: "进入温泉或大众浴场的浴池前，必须做什么？",
      },
      options: [
        { text: { ko: "수영복으로 갈아입는다.", en: "Change into a swimsuit.", ja: "水着に着替える。", zh: "换上泳衣。" } },
        {
          text: {
            ko: "샤워실에서 몸과 머리를 깨끗이 씻는다.",
            en: "Wash your body and hair in the shower area.",
            ja: "シャワー室で体と髪をきれいに洗う。",
            zh: "在淋浴间把身体和头发洗干净。",
          },
          correct: true,
        },
        { text: { ko: "차가운 물을 미리 마신다.", en: "Drink cold water first.", ja: "冷たい水を先に飲む。", zh: "先喝点凉水。" } },
      ],
      feedback: {
        ko: "탈의 후 샤워실에서 머리와 몸을 깨끗이 씻고 탕에 들어가요. 수영복은 입지 않아요.",
        en: "Undress, wash your hair and body in the shower, then get in. No swimsuits.",
        ja: "脱衣後、シャワー室で髪と体をきれいに洗ってから湯船に入ります。水着は着ません。",
        zh: "脱衣后在淋浴间把头发和身体洗干净再进浴池。不穿泳衣。",
      },
    },
    {
      prompt: {
        ko: "야외 무료 족욕탕을 이용할 때 가장 올바른 순서는 무엇인가요?",
        en: "What's the right order at a free outdoor foot bath?",
        ja: "屋外の無料足湯を利用するとき、いちばん正しい順序はどれでしょうか？",
        zh: "使用户外免费足浴池时，最正确的顺序是什么？",
      },
      options: [
        { text: { ko: "바로 발을 족욕탕에 넣는다.", en: "Put your feet straight in.", ja: "そのまま足を足湯に入れる。", zh: "直接把脚放进足浴池。" } },
        {
          text: {
            ko: "발을 씻지 않고 로션을 바른다.",
            en: "Skip washing and apply lotion.",
            ja: "足を洗わずにローションを塗る。",
            zh: "不洗脚，先涂乳液。",
          },
        },
        {
          text: {
            ko: "전용 공간에서 발을 먼저 씻고 족욕탕에 들어간다.",
            en: "Wash your feet at the station first, then get in.",
            ja: "専用スペースで足を先に洗ってから足湯に入る。",
            zh: "先在专用洗脚处洗脚，再进入足浴池。",
          },
          correct: true,
        },
      ],
      feedback: {
        ko: "족욕탕 옆 전용 발 씻는 곳에서 발을 먼저 씻고 들어가는 게 예의예요.",
        en: "Wash your feet at the station next to the foot bath before getting in — it's courtesy to others.",
        ja: "足湯のそばの専用足洗い場で先に足を洗ってから入るのがマナーです。",
        zh: "先在足浴池旁的专用洗脚处洗脚再进去，这是礼貌。",
      },
    },
  ],
};

/** 상황 박스 순서 그대로 — 교통, 편의점, 식당, 온천·족욕 */
export const KLIFE_SITUATIONS: KSituation[] = [
  {
    topic: "transport",
    title: { ko: "교통", en: "Transport", ja: "交通", zh: "交通" },
    scenarios: [SUBWAY, BUS, TAXI],
  },
  {
    topic: "convenience",
    title: { ko: "편의점", en: "Convenience store", ja: "コンビニ", zh: "便利店" },
    scenarios: [CONVENIENCE],
  },
  {
    topic: "dining",
    title: { ko: "식당", en: "Restaurant", ja: "食堂", zh: "餐厅" },
    scenarios: [RESTAURANT],
  },
  {
    topic: "oncheon",
    title: { ko: "온천·족욕", en: "Hot springs & foot baths", ja: "温泉・足湯", zh: "温泉·足浴" },
    scenarios: [ONCHEON],
  },
];
