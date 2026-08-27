// 자동 생성됨 — db/process-etiquette-images.mjs 로 imgs/ 폴더에서 만들었다. 수동으로 고치지 말 것.
export interface EtiquetteItem {
  image: string;
  caption: string;
}

export interface EtiquetteTopicItems {
  dos: EtiquetteItem[];
  donts: EtiquetteItem[];
}

export const ETIQUETTE_ITEMS: Record<string, EtiquetteTopicItems> = {
  "noraebang": {
    "dos": [
      {
        "image": "/etiquette/items/noraebang-p-1.jpg",
        "caption": "마이크 커버를 사용해주세요."
      },
      {
        "image": "/etiquette/items/noraebang-p-2.jpg",
        "caption": "함께 탬버린을 치며 노래방을 즐겨보세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/noraebang-n-1.jpg",
        "caption": "마이크에 입을 너무 가까이 대지 말아주세요."
      }
    ]
  },
  "streets": {
    "dos": [
      {
        "image": "/etiquette/items/streets-p-1.jpg",
        "caption": "우측통행을 지켜주세요."
      },
      {
        "image": "/etiquette/items/streets-p-2.jpg",
        "caption": "포장마차 근처에서 음식을 먹고 쓰레기통에 버려주세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/streets-n-1.jpg",
        "caption": "집 주변에서 시끄럽게 하지 마세요."
      }
    ]
  },
  "dining": {
    "dos": [
      {
        "image": "/etiquette/items/dining-p-1.jpg",
        "caption": "어른께 술을 받을 땐 두 손으로 받으세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/dining-n-1.jpg",
        "caption": "잔이 비어도 직접 따르지 마세요."
      }
    ]
  },
  "transport": {
    "dos": [
      {
        "image": "/etiquette/items/transport-p-1.jpg",
        "caption": "대중교통이 끊겼으면 역 근처 택시 승강장을 이용해보세요."
      },
      {
        "image": "/etiquette/items/transport-p-2.jpg",
        "caption": "버스 운행 시간을 확인하세요."
      },
      {
        "image": "/etiquette/items/transport-p-3.jpg",
        "caption": "음주 시 대리운전 서비스를 이용해주세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/transport-n-1.jpg",
        "caption": "어두운 골목길을 혼자 걷지 마세요."
      }
    ]
  },
  "safety": {
    "dos": [
      {
        "image": "/etiquette/items/safety-p-1.jpg",
        "caption": "위급 상황에는 112 또는 119로 전화주세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/safety-n-1.jpg",
        "caption": "낯선 사람이 건네는 음료를 받지 마세요."
      }
    ]
  },
  "parks": {
    "dos": [
      {
        "image": "/etiquette/items/parks-p-1.jpg",
        "caption": "반려동물과 산책 시 목줄은 짧게 잡고 배변봉투를 사용해주세요."
      },
      {
        "image": "/etiquette/items/parks-p-2.jpg",
        "caption": "자전거나 킥보드는 전용 도로를 사용해주세요."
      },
      {
        "image": "/etiquette/items/parks-p-3.jpg",
        "caption": "피크닉 후 자리를 정돈해 주세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/parks-n-1.jpg",
        "caption": "광장에서 시끄럽게 해서 주변 사람들에게 피해를 주지 마세요."
      },
      {
        "image": "/etiquette/items/parks-n-2.jpg",
        "caption": "이용시간을 어기지 말아주세요."
      }
    ]
  },
  "latefood": {
    "dos": [
      {
        "image": "/etiquette/items/latefood-p-1.jpg",
        "caption": "치킨과 맥주를 함께 즐기는 치맥 문화를 경험해 보세요."
      }
    ],
    "donts": []
  },
  "oncheon": {
    "dos": [
      {
        "image": "/etiquette/items/oncheon-p-1.jpg",
        "caption": "족욕탕 이용 전에 발을 먼저 씻어주세요."
      },
      {
        "image": "/etiquette/items/oncheon-p-2.jpg",
        "caption": "찜질방에서는 찜질복을 입어주세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/oncheon-n-1.jpg",
        "caption": "목욕탕에서 뛰거나 수영하지 마세요."
      },
      {
        "image": "/etiquette/items/oncheon-n-2.jpg",
        "caption": "수건은 몸을 닦는 용도로만 사용해주세요."
      }
    ]
  },
  "nature": {
    "dos": [
      {
        "image": "/etiquette/items/nature-p-1.jpg",
        "caption": "랜턴은 바닥을 향해 비춰주세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/nature-n-1.jpg",
        "caption": "야생동물에게 랜턴을 비추지 마세요."
      },
      {
        "image": "/etiquette/items/nature-n-2.jpg",
        "caption": "통행로가 아닌 곳은 가지 마세요."
      }
    ]
  },
  "views": {
    "dos": [
      {
        "image": "/etiquette/items/views-p-1.jpg",
        "caption": "다른 사람이 사진을 찍을 때 방해하지 마세요."
      },
      {
        "image": "/etiquette/items/views-p-2.jpg",
        "caption": "명소에 가기 전에 이용시간과 휴무일을 확인해주세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/views-n-1.jpg",
        "caption": "야경을 보며 난간에 기대지 마세요."
      },
      {
        "image": "/etiquette/items/views-n-2.jpg",
        "caption": "통행로를 삼각대로 막지 마세요."
      }
    ]
  },
  "festival": {
    "dos": [
      {
        "image": "/etiquette/items/festival-p-1.jpg",
        "caption": "줄 서기 문화를 지켜주세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/festival-n-1.jpg",
        "caption": "길을 막고 사진찍지 마세요."
      }
    ]
  },
  "convenience": {
    "dos": [
      {
        "image": "/etiquette/items/convenience-p-1.jpg",
        "caption": "티머니 교통카드를 충전해 대중교통을 이용하세요."
      },
      {
        "image": "/etiquette/items/convenience-p-2.jpg",
        "caption": "편의점 사용 후 쓰레기를 잘 버려주세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/convenience-n-1.jpg",
        "caption": "편의점을 이용한 후 쓰레기를 놓고 가지 마세요."
      }
    ]
  },
  "pojangmacha": {
    "dos": [
      {
        "image": "/etiquette/items/pojangmacha-p-1.jpg",
        "caption": "포장마차에서 다양한 음식을 시켜 나눠드세요."
      }
    ],
    "donts": [
      {
        "image": "/etiquette/items/pojangmacha-n-1.jpg",
        "caption": "가격을 흥정하지 마세요."
      },
      {
        "image": "/etiquette/items/pojangmacha-n-2.jpg",
        "caption": "포장마차에 외부음식을 반입하지 말아주세요."
      }
    ]
  }
};
