// Teaching diagrams are semantic data. Labels and descriptions are plain text.
// Their edges describe the relation stated by each caption, not an implicit universal execution order.
export const lessonVisuals = {
  "java-basics": {
    "id": "viz-java-basics-reference-copy",
    "title": "복사되는 참조값과 바뀌는 객체",
    "kind": "comparison",
    "afterSection": 0,
    "caption": "update(box) 안의 두 시점을 비교합니다. 변수 카드와 객체 카드는 서로 다른 대상을 나타냅니다.",
    "altText": "호출 직후에는 호출자의 box와 매개변수 box가 같은 Box A를 가리킵니다. 필드 변경 뒤 A의 value는 15가 됩니다. 매개변수를 새 Box B로 재할당해도 호출자의 box는 A를 가리킵니다.",
    "readingOrder": "첫 패널에서 두 변수의 참조 대상을 확인한 다음, 두 번째 패널에서 필드 변경과 매개변수 재할당의 결과를 따로 읽으세요.",
    "panels": [
      {
        "id": "copy",
        "title": "1. 메서드 진입 직후",
        "nodes": [
          {
            "id": "caller",
            "label": "호출자 변수 box",
            "detail": "기존 참조값을 유지합니다.",
            "tone": "neutral"
          },
          {
            "id": "parameter",
            "label": "매개변수 box",
            "detail": "호출자의 참조값을 복사받습니다.",
            "tone": "neutral"
          },
          {
            "id": "original",
            "label": "기존 객체 A · value = 5",
            "detail": "두 변수로 같은 객체에 접근합니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "caller",
            "to": "original",
            "label": "참조값이 A를 가리킴"
          },
          {
            "from": "parameter",
            "to": "original",
            "label": "복사된 참조값도 A를 가리킴"
          }
        ]
      },
      {
        "id": "reassigned",
        "title": "2. update의 마지막 대입 직후",
        "nodes": [
          {
            "id": "caller",
            "label": "호출자 변수 box",
            "detail": "재할당되지 않았습니다.",
            "tone": "neutral"
          },
          {
            "id": "original",
            "label": "기존 객체 A · value = 15",
            "detail": "box.value += 10이 이 객체를 바꿨습니다.",
            "tone": "accent"
          },
          {
            "id": "parameter",
            "label": "매개변수 box",
            "detail": "box = new Box(99)로 이 변수만 바뀝니다.",
            "tone": "neutral"
          },
          {
            "id": "replacement",
            "label": "새 객체 B · value = 99",
            "detail": "호출자의 box가 가리키는 대상은 아닙니다.",
            "tone": "neutral"
          }
        ],
        "edges": [
          {
            "from": "caller",
            "to": "original",
            "label": "여전히 A를 가리킴"
          },
          {
            "from": "parameter",
            "to": "replacement",
            "label": "새 참조값은 B를 가리킴"
          }
        ]
      }
    ],
    "takeaway": "객체를 변경하는 일과 참조 변수에 다른 값을 대입하는 일을 분리해서 추적하세요.",
    "limits": [
      "객체 A·B는 설명용 이름이며 실제 메모리 주소나 JVM의 물리적 배치를 나타내지 않습니다.",
      "두 번째 패널은 메서드가 반환되기 직전입니다. 자원 수명·GC·동시성은 이 그림의 범위가 아닙니다."
    ],
    "sources": [
      {
        "title": "Oracle Tutorial — Passing Reference Data Type Arguments",
        "url": "https://docs.oracle.com/javase/tutorial/java/javaOO/arguments.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "oop": {
    "id": "viz-oop-invariant",
    "title": "실패 뒤에도 지켜야 하는 잔액",
    "kind": "state",
    "afterSection": 1,
    "caption": "Credit 예제의 spend(40), spend(70)을 순서대로 적용합니다. 잔액 0 이상이라는 업무 규칙을 상태 변화로 확인합니다.",
    "altText": "잔액 100에서 40 차감은 검증을 통과해 60이 됩니다. 이어 70 차감은 잔액을 초과하므로 false를 반환하고 60을 유지합니다.",
    "readingOrder": "첫 패널의 성공 후 잔액 60을 두 번째 패널의 시작 상태로 이어 읽으세요.",
    "panels": [
      {
        "id": "accepted",
        "title": "1. spend(40) 성공",
        "nodes": [
          {
            "id": "before",
            "label": "잔액 100",
            "detail": "생성자가 유효한 초기 상태를 만들었습니다.",
            "tone": "neutral"
          },
          {
            "id": "check",
            "label": "0 < 40 ≤ 100",
            "detail": "변경하기 전에 요청을 검사합니다.",
            "tone": "neutral"
          },
          {
            "id": "after",
            "label": "잔액 60 · true",
            "detail": "검증을 통과한 뒤에만 차감합니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "before",
            "to": "check",
            "label": "40 차감 요청"
          },
          {
            "from": "check",
            "to": "after",
            "label": "조건 충족 → 차감"
          }
        ]
      },
      {
        "id": "rejected",
        "title": "2. spend(70) 거절",
        "nodes": [
          {
            "id": "before",
            "label": "잔액 60",
            "detail": "앞선 성공 결과가 다음 호출의 시작입니다.",
            "tone": "neutral"
          },
          {
            "id": "check",
            "label": "70 > 60",
            "detail": "요청이 잔액보다 큽니다.",
            "tone": "warning"
          },
          {
            "id": "after",
            "label": "잔액 60 · false",
            "detail": "실패를 알리고 기존 상태를 보존합니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "before",
            "to": "check",
            "label": "70 차감 요청"
          },
          {
            "from": "check",
            "to": "after",
            "label": "조건 불충족 → 변경 없음"
          }
        ]
      }
    ],
    "takeaway": "반환값뿐 아니라 실패 후 객체가 어떤 상태인지도 메서드 계약에 포함하세요.",
    "limits": [
      "검증 순서와 잔액 불변식은 이 예제의 설계입니다. Java나 private 키워드가 업무 규칙을 자동으로 보장하지 않습니다.",
      "단일 스레드의 객체 상태를 설명하며 동시 호출·여러 객체·DB 트랜잭션의 원자성을 뜻하지 않습니다."
    ],
    "sources": [
      {
        "title": "Oracle Tutorial — Classes",
        "url": "https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "JLS — Access Control",
        "url": "https://docs.oracle.com/javase/specs/jls/se8/html/jls-6.html#jls-6.6",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "polymorphism": {
    "id": "viz-polymorphism-composition",
    "title": "Report는 그대로, 협력 구현은 교체",
    "kind": "relationship",
    "afterSection": 2,
    "caption": "main에서 서로 다른 Formatter를 주입합니다. Report는 선택된 구현에 같은 format 요청을 보냅니다.",
    "altText": "대괄호 Formatter를 가진 Report는 stock을 [stock]으로, 접두사 Formatter를 가진 Report는 report:stock으로 만듭니다. 두 Report의 render 코드는 같고 협력 구현이 다릅니다.",
    "readingOrder": "각 패널에서 Report의 요청, 주입한 Formatter, 반환 결과를 읽은 뒤 두 패널의 바뀐 부분만 비교하세요.",
    "panels": [
      {
        "id": "bracketed",
        "title": "같은 Formatter 계약 · 대괄호 구현",
        "nodes": [
          {
            "id": "report",
            "label": "Report.render(\"stock\")",
            "detail": "Report는 Formatter 타입의 필드에 요청합니다.",
            "tone": "neutral"
          },
          {
            "id": "formatter",
            "label": "주입한 Formatter",
            "detail": "value를 대괄호로 감싸는 람다입니다.",
            "tone": "accent"
          },
          {
            "id": "result",
            "label": "반환값: [stock]",
            "detail": "선택한 협력 객체의 결과를 반환합니다.",
            "tone": "neutral"
          }
        ],
        "edges": [
          {
            "from": "report",
            "to": "formatter",
            "label": "formatter.format(value)로 위임"
          },
          {
            "from": "formatter",
            "to": "result",
            "label": "대괄호 구현의 결과"
          }
        ]
      },
      {
        "id": "prefixed",
        "title": "같은 Formatter 계약 · 접두사 구현",
        "nodes": [
          {
            "id": "report",
            "label": "Report.render(\"stock\")",
            "detail": "Report의 render 구현은 같습니다.",
            "tone": "neutral"
          },
          {
            "id": "formatter",
            "label": "주입한 Formatter",
            "detail": "value 앞에 report:를 붙이는 람다입니다.",
            "tone": "accent"
          },
          {
            "id": "result",
            "label": "반환값: report:stock",
            "detail": "다른 협력 구현이 다른 결과를 만듭니다.",
            "tone": "neutral"
          }
        ],
        "edges": [
          {
            "from": "report",
            "to": "formatter",
            "label": "같은 메서드 계약으로 위임"
          },
          {
            "from": "formatter",
            "to": "result",
            "label": "접두사 구현의 결과"
          }
        ]
      }
    ],
    "takeaway": "구현을 선택하는 곳과 사용하는 곳을 분리하되, 교체할 구현의 입력·결과·실패 계약도 확인하세요.",
    "limits": [
      "객체 간 위임 관계이며 클래스 상속도나 Spring 컨테이너 구조가 아닙니다.",
      "인터페이스 문법만으로 LSP나 업무상 교체 가능성이 검증되는 것은 아닙니다."
    ],
    "sources": [
      {
        "title": "Oracle Tutorial — Interfaces",
        "url": "https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Oracle Tutorial — Lambda Expressions",
        "url": "https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "collections": {
    "id": "viz-collections-equality-hash",
    "title": "같으면 같은 해시, 같은 해시여도 다를 수 있음",
    "kind": "comparison",
    "afterSection": 1,
    "caption": "equals와 hashCode의 관계는 한 방향의 요구입니다. 반대 방향을 가정하면 해시 충돌을 동등성으로 오해합니다.",
    "altText": "equals가 true인 두 객체는 같은 hashCode를 반환해야 합니다. 반대로 문자열 Aa와 BB는 hashCode가 모두 2112여도 equals는 false입니다.",
    "readingOrder": "첫 패널의 반드시 따라야 하는 계약을 읽고, 두 번째 패널의 반례로 역방향 추론을 확인하세요.",
    "panels": [
      {
        "id": "required",
        "title": "equals로 같은 객체 → 같은 해시값 필요",
        "nodes": [
          {
            "id": "equal",
            "label": "a.equals(b) == true",
            "detail": "예: 별도로 만든 두 String(\"java\") 객체",
            "tone": "neutral"
          },
          {
            "id": "hash",
            "label": "a.hashCode() == b.hashCode()",
            "detail": "equals로 같다면 만족해야 하는 계약입니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "equal",
            "to": "hash",
            "label": "equals가 같으면 반드시 같은 해시"
          }
        ]
      },
      {
        "id": "collision",
        "title": "같은 해시값 → equals 결과는 미정",
        "nodes": [
          {
            "id": "hash",
            "label": "\"Aa\"와 \"BB\"의 해시 = 2112",
            "detail": "String의 명세상 해시 계산에서 같은 값이 나옵니다.",
            "tone": "neutral"
          },
          {
            "id": "different",
            "label": "\"Aa\".equals(\"BB\") == false",
            "detail": "내용이 다른데 해시는 같은 충돌 사례입니다.",
            "tone": "warning"
          }
        ],
        "edges": [
          {
            "from": "hash",
            "to": "different",
            "label": "같은 해시가 같은 내용을 보장하지 않음"
          }
        ]
      }
    ],
    "takeaway": "해시값만으로 동등성을 결정하지 말고, equals와 hashCode를 함께 같은 업무 의미로 설계하세요.",
    "limits": [
      "화살표는 논리 관계를 나타내며 HashMap 내부의 조회 단계나 버킷 구조를 보여 주지 않습니다.",
      "키 필드의 변경·순회 순서·성능은 별도 계약입니다. 예시의 숫자는 String API의 해시 계산에만 해당합니다."
    ],
    "sources": [
      {
        "title": "Java API — Object.hashCode and equals",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/lang/Object.html#hashCode--",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java API — String.hashCode",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/lang/String.html#hashCode--",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "generics": {
    "id": "viz-generics-pecs",
    "title": "타입을 모를 때 무엇을 보장할 수 있는가",
    "kind": "comparison",
    "afterSection": 1,
    "caption": "extends와 super는 실제 요소 타입을 모두 안다는 뜻이 아닙니다. 읽기와 쓰기에서 안전하게 약속할 수 있는 범위를 비교합니다.",
    "altText": "List<? extends Number>는 요소를 Number로 읽을 수 있지만 특정 non-null Integer를 추가할 수는 없습니다. List<? super Integer>는 Integer를 추가할 수 있으나 읽은 값의 일반적인 정적 타입은 Object입니다.",
    "readingOrder": "첫 패널에서 읽기의 보장을, 두 번째 패널에서 쓰기의 보장을 확인하세요. 각 패널의 마지막 카드에는 반대 방향의 제한이 있습니다.",
    "panels": [
      {
        "id": "producer",
        "title": "extends Number · 읽기의 보장",
        "nodes": [
          {
            "id": "view",
            "label": "List<? extends Number>",
            "detail": "실제 요소 타입은 Number 또는 그 하위 타입입니다.",
            "tone": "neutral"
          },
          {
            "id": "read",
            "label": "get 결과를 Number로 읽음",
            "detail": "Integer 목록과 Double 목록을 같은 읽기 API에 전달할 수 있습니다.",
            "tone": "accent"
          },
          {
            "id": "write",
            "label": "non-null Integer 추가는 불가",
            "detail": "실제 목록이 Double 전용일 수 있으므로 컴파일러가 허용하지 않습니다.",
            "tone": "warning"
          }
        ],
        "edges": [
          {
            "from": "view",
            "to": "read",
            "label": "읽기 타입의 상한 보장"
          },
          {
            "from": "view",
            "to": "write",
            "label": "구체 요소 타입을 모르므로 쓰기 제한"
          }
        ]
      },
      {
        "id": "consumer",
        "title": "super Integer · 쓰기의 보장",
        "nodes": [
          {
            "id": "view",
            "label": "List<? super Integer>",
            "detail": "Integer·Number·Object 등 Integer의 상위 타입을 요소 타입으로 가질 수 있습니다.",
            "tone": "neutral"
          },
          {
            "id": "write",
            "label": "Integer 값을 add할 수 있음",
            "detail": "해당 정적 타입 관계에서 안전한 값입니다.",
            "tone": "accent"
          },
          {
            "id": "read",
            "label": "get의 일반적 정적 타입은 Object",
            "detail": "Integer가 아닌 다른 상위 타입의 값도 들어 있을 수 있습니다.",
            "tone": "warning"
          }
        ],
        "edges": [
          {
            "from": "view",
            "to": "write",
            "label": "Integer를 받는 타입 관계"
          },
          {
            "from": "view",
            "to": "read",
            "label": "구체 읽기 타입은 더 좁힐 수 없음"
          }
        ]
      }
    ],
    "takeaway": "읽을 값의 타입과 넣을 값의 타입을 따로 판단한 뒤 wildcard를 선택하세요.",
    "limits": [
      "컴파일 시점의 타입 안전성을 비교합니다. 실제 컬렉션이 변경 불가이면 add는 런타임에 실패할 수 있습니다.",
      "extends 자체는 null 추가나 제거 연산을 타입 수준에서 금지하지 않습니다. 실제 컬렉션이 해당 연산을 허용하는지는 별도 계약입니다.",
      "컬렉션의 불변성·capture helper·타입 소거의 세부는 생략합니다."
    ],
    "sources": [
      {
        "title": "Oracle Tutorial — Upper Bounded Wildcards",
        "url": "https://docs.oracle.com/javase/tutorial/java/generics/upperBounded.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Oracle Tutorial — Lower Bounded Wildcards",
        "url": "https://docs.oracle.com/javase/tutorial/java/generics/lowerBounded.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Oracle Tutorial — Guidelines for Wildcard Use",
        "url": "https://docs.oracle.com/javase/tutorial/java/generics/wildcardGuidelines.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "streams": {
    "id": "viz-streams-lazy",
    "title": "파이프라인 구성과 실제 소비를 나누기",
    "kind": "flow",
    "afterSection": 0,
    "caption": "기준 예제의 filter·distinct·map을 연결하는 단계와 collect가 결과를 구하는 단계를 나눠 봅니다.",
    "altText": "중간 연산을 연결할 때는 처리 계획을 만듭니다. collect 최종 연산이 호출되면 소스를 소비해 JAVA와 JVM을 수집합니다. 이 예제의 원본 names는 네 요소를 유지합니다.",
    "readingOrder": "먼저 구성만 하는 패널을 읽고, 다음 패널에서 최종 연산 이후의 평가와 결과를 확인하세요.",
    "panels": [
      {
        "id": "build",
        "title": "1. 중간 연산을 연결",
        "nodes": [
          {
            "id": "source",
            "label": "names: java, sql, jvm, java",
            "detail": "Stream의 입력 소스입니다.",
            "tone": "neutral"
          },
          {
            "id": "pipeline",
            "label": "filter → distinct → map",
            "detail": "j로 시작하는 값 선택·중복 제거·대문자 변환을 연결합니다.",
            "tone": "neutral"
          }
        ],
        "edges": [
          {
            "from": "source",
            "to": "pipeline",
            "label": "처리 흐름 구성 · 아직 최종 연산 없음"
          }
        ]
      },
      {
        "id": "evaluate",
        "title": "2. collect로 최종 결과 요청",
        "nodes": [
          {
            "id": "terminal",
            "label": "collect(Collectors.toList())",
            "detail": "최종 연산이 파이프라인 평가를 시작합니다.",
            "tone": "accent"
          },
          {
            "id": "evaluate",
            "label": "소스를 소비하며 연산 평가",
            "detail": "이 예제는 소스나 외부 상태를 변경하지 않는 콜백을 사용합니다.",
            "tone": "neutral"
          },
          {
            "id": "result",
            "label": "결과: [JAVA, JVM]",
            "detail": "원본 names.size()는 4입니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "terminal",
            "to": "evaluate",
            "label": "최종 연산이 소비 시작"
          },
          {
            "from": "evaluate",
            "to": "result",
            "label": "결과를 리스트로 수집"
          }
        ]
      }
    ],
    "takeaway": "중간 연산을 적은 시점과 결과가 필요한 시점을 구분하고, 외부 상태 변경을 집계에 섞지 마세요.",
    "limits": [
      "각 중간 연산이 별도의 임시 List를 만든다는 뜻이 아닙니다.",
      "단락 평가·최적화·병렬 실행의 콜백 횟수와 순서는 그리지 않았습니다. 모든 Stream이 소스를 불변으로 만드는 것도 아닙니다."
    ],
    "sources": [
      {
        "title": "Java API — Stream package, pipelines and laziness",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java API — Stream",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/stream/Stream.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "concurrency": {
    "id": "viz-concurrency-atomicity",
    "title": "보이는 값과 원자적인 증가는 다른 보장",
    "kind": "comparison",
    "afterSection": 0,
    "caption": "두 스레드가 한 번씩 증가시키는 비교용 사례입니다. 왼쪽은 volatile int에서도 가능한 끼어들기 한 가지이며 기준 예제의 실행 기록은 아닙니다.",
    "altText": "count++를 나누어 실행하면 두 스레드가 모두 0을 읽고 각각 1을 써 최종값이 1일 수 있습니다. AtomicInteger의 두 증가가 완료되면 최종값은 2입니다.",
    "readingOrder": "첫 패널의 가능한 읽기·쓰기 순서를 따라가고, 두 번째 패널의 원자 연산 결과와 비교하세요.",
    "panels": [
      {
        "id": "compound",
        "title": "volatile count++ · 가능한 실행 사례",
        "nodes": [
          {
            "id": "initial",
            "label": "count = 0",
            "detail": "volatile이어도 ++ 전체가 하나의 연산은 아닙니다.",
            "tone": "neutral"
          },
          {
            "id": "read-a",
            "label": "스레드 A: 0 읽기",
            "detail": "아직 계산 결과를 쓰지 않았습니다.",
            "tone": "neutral"
          },
          {
            "id": "read-b",
            "label": "스레드 B: 0 읽기",
            "detail": "A의 쓰기 전이므로 같은 값을 읽을 수 있습니다.",
            "tone": "neutral"
          },
          {
            "id": "write-a",
            "label": "스레드 A: 1 쓰기",
            "detail": "자신이 읽은 0에 1을 더한 값입니다.",
            "tone": "neutral"
          },
          {
            "id": "write-b",
            "label": "스레드 B: 1 쓰기",
            "detail": "두 증가가 끝났어도 최종값은 1입니다.",
            "tone": "warning"
          }
        ],
        "edges": [
          {
            "from": "initial",
            "to": "read-a",
            "label": "설명용 실행 순서"
          },
          {
            "from": "read-a",
            "to": "read-b",
            "label": "A 쓰기 전에 B 읽기가 끼어듦"
          },
          {
            "from": "read-b",
            "to": "write-a",
            "label": "A가 계산한 결과 기록"
          },
          {
            "from": "write-a",
            "to": "write-b",
            "label": "B도 이전에 읽은 값으로 기록"
          }
        ]
      },
      {
        "id": "atomic",
        "title": "AtomicInteger.incrementAndGet()",
        "nodes": [
          {
            "id": "initial",
            "label": "초기값 0",
            "detail": "각 증가를 원자 연산으로 요청합니다.",
            "tone": "neutral"
          },
          {
            "id": "first",
            "label": "한 증가 완료 → 1",
            "detail": "어느 스레드가 먼저인지는 고정하지 않습니다.",
            "tone": "accent"
          },
          {
            "id": "second",
            "label": "다른 증가 완료 → 2",
            "detail": "두 작업의 완료를 확인한 뒤 결과를 관찰합니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "initial",
            "to": "first",
            "label": "원자적으로 1 증가"
          },
          {
            "from": "first",
            "to": "second",
            "label": "다음 원자적 증가"
          }
        ]
      }
    ],
    "takeaway": "volatile의 가시성·순서 보장과 복합 연산의 원자성을 혼동하지 마세요.",
    "limits": [
      "화살표는 가능한 실행 사례를 설명하며 JMM의 happens-before 관계도나 실제 시간 측정 결과가 아닙니다.",
      "AtomicInteger 하나의 연산이 여러 필드나 DB의 업무 불변식까지 원자적으로 만들지는 않습니다. 기준 예제는 Future.get으로 작업 완료를 기다립니다."
    ],
    "sources": [
      {
        "title": "JLS — Memory Model and happens-before",
        "url": "https://docs.oracle.com/javase/specs/jls/se8/html/jls-17.html#jls-17.4.5",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java API — AtomicInteger.incrementAndGet",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/atomic/AtomicInteger.html#incrementAndGet--",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java API — ExecutorService memory consistency",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ExecutorService.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "jpa-state": {
    "id": "viz-jpa-managed-detached",
    "title": "같은 필드 변경, 다른 영속 상태",
    "kind": "comparison",
    "afterSection": 0,
    "caption": "각 패널은 DB 수량 2에서 별도로 시작하는 테스트 사례입니다. 관리 여부와 DB 동기화를 구분합니다.",
    "altText": "관리 상태의 주문 수량을 4로 바꾼 뒤 트랜잭션을 커밋하면 새 EntityManager 조회에서 4가 보입니다. EntityManager를 닫고 분리된 주문을 7로 바꾸면 DB에는 자동 반영되지 않아 2가 남습니다.",
    "readingOrder": "두 패널을 독립된 실행으로 비교하세요. 첫 패널의 최종 DB 값이 두 번째 패널의 시작 값은 아닙니다.",
    "panels": [
      {
        "id": "managed",
        "title": "A. 관리 상태에서 변경 후 커밋",
        "nodes": [
          {
            "id": "managed",
            "label": "관리 객체 · quantity = 2",
            "detail": "활성 트랜잭션의 EntityManager가 관리합니다.",
            "tone": "neutral"
          },
          {
            "id": "changed",
            "label": "changeQuantity(4)",
            "detail": "객체의 상태가 바뀝니다.",
            "tone": "neutral"
          },
          {
            "id": "commit",
            "label": "트랜잭션 commit 호출",
            "detail": "필요한 flush와 커밋이 성공합니다.",
            "tone": "neutral"
          },
          {
            "id": "stored",
            "label": "새 조회에서 DB 수량 4",
            "detail": "다른 EntityManager에서도 확정된 변경을 읽습니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "managed",
            "to": "changed",
            "label": "업무 메서드 호출"
          },
          {
            "from": "changed",
            "to": "commit",
            "label": "이 예제에서 커밋 시 동기화"
          },
          {
            "from": "commit",
            "to": "stored",
            "label": "커밋 성공 후 새로 조회"
          }
        ]
      },
      {
        "id": "detached",
        "title": "B. 컨텍스트 종료 후 객체만 변경",
        "nodes": [
          {
            "id": "managed",
            "label": "조회한 객체 · quantity = 2",
            "detail": "별도 실행의 초기 DB 값은 2입니다.",
            "tone": "neutral"
          },
          {
            "id": "close",
            "label": "EntityManager.close()",
            "detail": "객체가 이 컨텍스트의 관리 범위를 벗어납니다.",
            "tone": "neutral"
          },
          {
            "id": "changed",
            "label": "분리 객체를 quantity = 7로",
            "detail": "일반 Java 객체의 값은 바뀝니다.",
            "tone": "neutral"
          },
          {
            "id": "stored",
            "label": "새 조회에서 DB 수량 2",
            "detail": "분리 객체 변경은 자동 저장되지 않습니다.",
            "tone": "warning"
          }
        ],
        "edges": [
          {
            "from": "managed",
            "to": "close",
            "label": "컨텍스트 종료"
          },
          {
            "from": "close",
            "to": "changed",
            "label": "detached 객체 메서드 호출"
          },
          {
            "from": "changed",
            "to": "stored",
            "label": "자동 UPDATE 없음 · DB 값 유지"
          }
        ]
      }
    ],
    "takeaway": "setter나 업무 메서드의 호출만 보고 DB 저장 여부를 판단하지 말고 영속 상태와 트랜잭션 경계를 확인하세요.",
    "limits": [
      "flush는 SQL 동기화이고 commit은 트랜잭션 확정입니다. SQL은 commit보다 먼저 실행될 수도 있습니다.",
      "persist·remove·merge 전체 상태도를 생략했습니다. 특히 merge를 원래 객체가 자동 재부착되는 과정으로 표현하지 않습니다."
    ],
    "sources": [
      {
        "title": "Hibernate User Guide — Persistence Context",
        "url": "https://docs.hibernate.org/orm/6.6/userguide/html_single/#pc",
        "edition": "Hibernate ORM 6.6",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Jakarta Persistence specification",
        "url": "https://jakarta.ee/specifications/persistence/3.1/",
        "edition": "Jakarta Persistence 3.1",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "tx-proxy": {
    "id": "viz-tx-proxy-boundary",
    "title": "같은 메서드 이름, 다른 트랜잭션 진입",
    "kind": "comparison",
    "afterSection": 1,
    "caption": "호출 전에 열린 트랜잭션이 없는 이 수업의 두 테스트를 비교합니다. INSERT 뒤에는 모두 IllegalStateException이 발생합니다.",
    "altText": "외부에서 reserveThenFail을 프록시로 호출하면 트랜잭션이 열리고 예외 전파 후 롤백되어 행이 0개입니다. 트랜잭션이 없는 bypassProxy가 this.reserveThenFail을 부르면 새 조언이 적용되지 않아 자동 커밋된 행 1개가 남습니다.",
    "readingOrder": "두 패널에서 프록시의 트랜잭션 진입 여부를 먼저 확인하고, 같은 예외가 난 뒤 DB 상태를 비교하세요.",
    "panels": [
      {
        "id": "external",
        "title": "A. 외부에서 @Transactional 메서드 호출",
        "nodes": [
          {
            "id": "caller",
            "label": "외부 호출자",
            "detail": "Spring이 제공한 프록시 빈을 호출합니다.",
            "tone": "neutral"
          },
          {
            "id": "proxy",
            "label": "프록시가 트랜잭션을 엶",
            "detail": "reserveThenFail의 트랜잭션 조언에 진입합니다.",
            "tone": "accent"
          },
          {
            "id": "target",
            "label": "INSERT 후 RuntimeException",
            "detail": "예외를 잡아 숨기지 않고 호출 밖으로 보냅니다.",
            "tone": "neutral"
          },
          {
            "id": "database",
            "label": "DB 행 수: 0",
            "detail": "프록시가 실패를 받아 트랜잭션을 롤백합니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "caller",
            "to": "proxy",
            "label": "외부에서 reserveThenFail 호출"
          },
          {
            "from": "proxy",
            "to": "target",
            "label": "트랜잭션 안에서 대상 실행"
          },
          {
            "from": "target",
            "to": "database",
            "label": "예외가 프록시까지 전파 → 롤백"
          }
        ]
      },
      {
        "id": "self",
        "title": "B. 트랜잭션 없는 메서드의 자기 호출",
        "nodes": [
          {
            "id": "caller",
            "label": "bypassProxy로 외부 진입",
            "detail": "이 메서드에는 @Transactional이 없습니다.",
            "tone": "neutral"
          },
          {
            "id": "self",
            "label": "this.reserveThenFail()",
            "detail": "같은 대상 객체 안에서 호출합니다.",
            "tone": "neutral"
          },
          {
            "id": "target",
            "label": "INSERT 후 RuntimeException",
            "detail": "내부 메서드의 트랜잭션 조언을 새로 통과하지 않습니다.",
            "tone": "warning"
          },
          {
            "id": "database",
            "label": "DB 행 수: 1",
            "detail": "이 예제에서는 INSERT가 자동 커밋되어 남습니다.",
            "tone": "warning"
          }
        ],
        "edges": [
          {
            "from": "caller",
            "to": "self",
            "label": "현재 트랜잭션 없이 내부 호출"
          },
          {
            "from": "self",
            "to": "target",
            "label": "프록시 재진입 없음"
          },
          {
            "from": "target",
            "to": "database",
            "label": "이미 커밋된 INSERT는 예외만으로 되돌아가지 않음"
          }
        ]
      }
    ],
    "takeaway": "어노테이션의 존재와 호출이 실제로 조언을 통과하는지를 따로 확인하세요.",
    "limits": [
      "자기 호출이 기존 트랜잭션을 없애는 것은 아닙니다. 바깥에서 이미 열린 트랜잭션이 있으면 그 안에서 실행될 수 있습니다.",
      "기본 프록시 모드·이 수업의 DataSource와 기본 RuntimeException 롤백 정책에 한정합니다. 전파 옵션·AspectJ weaving·checked 예외 정책은 생략합니다."
    ],
    "sources": [
      {
        "title": "Spring — Using @Transactional, proxy mode",
        "url": "https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html",
        "edition": "Spring Framework 6.2",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Spring — Rolling Back a Declarative Transaction",
        "url": "https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/rolling-back.html",
        "edition": "Spring Framework 6.2",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "security-csrf": {
    "id": "viz-security-independent-conditions",
    "title": "한 조건씩 바꾸어 실패 이유 구별",
    "kind": "comparison",
    "afterSection": 2,
    "caption": "POST /orders에 보내는 네 개의 독립 요청입니다. 필터의 고정 실행 순서를 나타내는 그림이 아닙니다.",
    "altText": "유효한 CSRF 토큰을 가진 미인증 요청은 401입니다. 인증된 VIEWER는 토큰이 있어도 403입니다. BUYER도 CSRF 토큰이 없으면 403이고, BUYER와 유효한 토큰을 함께 가진 요청은 200입니다.",
    "readingOrder": "각 패널의 요청 전제와 응답을 한 쌍으로 읽으세요. 패널 사이에 실행 순서나 상태 전달은 없습니다.",
    "panels": [
      {
        "id": "anonymous",
        "title": "미인증 · CSRF 조건은 충족",
        "nodes": [
          {
            "id": "request",
            "label": "인증 없음 + 유효 CSRF",
            "detail": "인증 실패만 관찰할 수 있도록 토큰은 제공합니다.",
            "tone": "neutral"
          },
          {
            "id": "result",
            "label": "응답 401",
            "detail": "이 수업의 HTTP Basic 설정에서 인증이 필요합니다.",
            "tone": "warning"
          }
        ],
        "edges": [
          {
            "from": "request",
            "to": "result",
            "label": "인증 조건 미충족"
          }
        ]
      },
      {
        "id": "role",
        "title": "VIEWER · CSRF 조건은 충족",
        "nodes": [
          {
            "id": "request",
            "label": "VIEWER 인증 + 유효 CSRF",
            "detail": "인증은 되었지만 BUYER 역할이 없습니다.",
            "tone": "neutral"
          },
          {
            "id": "result",
            "label": "응답 403",
            "detail": "역할 권한이 부족합니다.",
            "tone": "warning"
          }
        ],
        "edges": [
          {
            "from": "request",
            "to": "result",
            "label": "BUYER 권한 미충족"
          }
        ]
      },
      {
        "id": "csrf",
        "title": "BUYER · CSRF 토큰 누락",
        "nodes": [
          {
            "id": "request",
            "label": "BUYER 인증 + CSRF 없음",
            "detail": "인증과 역할을 갖춰 CSRF 실패를 분리합니다.",
            "tone": "neutral"
          },
          {
            "id": "result",
            "label": "응답 403",
            "detail": "상태 변경 요청의 CSRF 보호에 의해 거절됩니다.",
            "tone": "warning"
          }
        ],
        "edges": [
          {
            "from": "request",
            "to": "result",
            "label": "CSRF 조건 미충족"
          }
        ]
      },
      {
        "id": "accepted",
        "title": "BUYER · CSRF 조건도 충족",
        "nodes": [
          {
            "id": "request",
            "label": "BUYER 인증 + 유효 CSRF",
            "detail": "이 엔드포인트의 세 조건을 충족합니다.",
            "tone": "neutral"
          },
          {
            "id": "result",
            "label": "응답 200",
            "detail": "컨트롤러가 이 예제의 정상 요청을 처리합니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "request",
            "to": "result",
            "label": "이 예제의 요청 허용"
          }
        ]
      }
    ],
    "takeaway": "401이나 403 하나만 보고 원인을 단정하지 말고 다른 전제를 고정해 실패 조건을 검사하세요.",
    "limits": [
      "응답 코드는 이 수업의 Spring Security 설정과 테스트 계약입니다. 모든 인증 방식이나 설정에서 같은 응답을 보장하지 않습니다.",
      "자원 소유권·브라우저 쿠키 정책·TLS·전체 필터 순서는 생략했습니다. BUYER 역할이 다른 사용자의 주문 소유권을 대신하지 않습니다."
    ],
    "sources": [
      {
        "title": "Spring Security — CSRF",
        "url": "https://docs.spring.io/spring-security/reference/6.5/servlet/exploits/csrf.html",
        "edition": "Spring Security 6.5",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Spring Security — Authorize HttpServletRequests",
        "url": "https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/authorize-http-requests.html",
        "edition": "Spring Security 6.5",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "jwt-validation": {
    "id": "viz-jwt-acceptance",
    "title": "서명 성공만으로 토큰을 수용하지 않기",
    "kind": "relationship",
    "afterSection": 1,
    "caption": "디코더의 형식·헤더 검사를 통과한 토큰을 전제로, 이 실습의 주요 수용 조건을 비교합니다. 모두 충족해야 하며 나열은 실제 검사 실행 순서가 아닙니다.",
    "altText": "디코더의 형식·헤더 검사를 통과한 토큰이 전제입니다. 허용된 RS256 서명과 주어진 RSA 공개키, 신뢰한 issuer, orders-api audience, 비어 있지 않은 subject, 유효한 시간 조건이 모두 필요합니다. 한 조건만 통과한 것은 충분하지 않습니다.",
    "readingOrder": "각 조건 카드에서 수용 카드로 이어지는 AND 관계를 읽으세요. 어느 한 조건이라도 실패하면 수용할 수 없습니다.",
    "panels": [
      {
        "id": "conditions",
        "title": "이 과제의 수용 정책 · 모든 조건 AND",
        "nodes": [
          {
            "id": "signature",
            "label": "허용 알고리즘·키로 서명 검증",
            "detail": "RS256과 실행 시 전달한 RSA 공개키를 사용합니다.",
            "tone": "neutral"
          },
          {
            "id": "issuer",
            "label": "신뢰한 issuer",
            "detail": "https://training-issuer.invalid와 일치해야 합니다.",
            "tone": "neutral"
          },
          {
            "id": "audience",
            "label": "우리 API가 audience에 포함",
            "detail": "orders-api가 aud에 있어야 합니다.",
            "tone": "neutral"
          },
          {
            "id": "subject",
            "label": "필수 subject",
            "detail": "sub가 존재하고 공백이 아니어야 합니다.",
            "tone": "neutral"
          },
          {
            "id": "time",
            "label": "필수 exp + 시간 조건",
            "detail": "exp는 현재보다 뒤여야 합니다. nbf가 있으면 현재 이하여야 합니다.",
            "tone": "neutral"
          },
          {
            "id": "accepted",
            "label": "전제 아래 모든 조건 충족 → 수용",
            "detail": "그림의 조건 중 하나라도 실패하면 거절합니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "signature",
            "to": "accepted",
            "label": "AND: 서명 조건 필수"
          },
          {
            "from": "issuer",
            "to": "accepted",
            "label": "AND: 발급자 조건 필수"
          },
          {
            "from": "audience",
            "to": "accepted",
            "label": "AND: 대상 조건 필수"
          },
          {
            "from": "subject",
            "to": "accepted",
            "label": "AND: 주체 조건 필수"
          },
          {
            "from": "time",
            "to": "accepted",
            "label": "AND: 시간 조건 필수"
          }
        ]
      }
    ],
    "takeaway": "토큰을 읽을 수 있다는 사실, 서명이 유효하다는 사실, 우리 API가 받아들인다는 판단을 구분하세요.",
    "limits": [
      "typ 헤더 등 NimbusJwtDecoder의 기본 형식·헤더 검사는 도식에서 생략했습니다. Spring Security 6.5의 공개키 디코더는 기본 typ 검증을 적용합니다.",
      "필수 claim과 clock skew 0은 이 실습의 정책입니다. 모든 JWT에 동일한 필수 claim을 요구하는 일반 규칙으로 확대하지 않습니다.",
      "암호화·권한 scope 매핑·키 회전·폐기·원격 JWKS·실제 OIDC 로그인 전체 흐름은 포함하지 않습니다."
    ],
    "sources": [
      {
        "title": "Spring Security — JWT Resource Server validation",
        "url": "https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html",
        "edition": "Spring Security 6.5",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "RFC 7519 — JSON Web Token claims",
        "url": "https://www.rfc-editor.org/rfc/rfc7519",
        "edition": "RFC 7519",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Spring Security API — NimbusJwtDecoder default typ validation",
        "url": "https://docs.spring.io/spring-security/reference/6.5/api/java/org/springframework/security/oauth2/jwt/NimbusJwtDecoder.PublicKeyJwtDecoderBuilder.html#validateType(boolean)",
        "edition": "Spring Security 6.5",
        "checkedAt": "2026-10-12"
      }
    ]
  },
  "kafka-idempotency": {
    "id": "viz-kafka-db-offset",
    "title": "DB 커밋과 오프셋 커밋 사이의 빈틈",
    "kind": "flow",
    "afterSection": 2,
    "caption": "이 과제의 DB 우선 처리 순서와 중간 장애 가능성을 설명합니다. 재전달 장애 시나리오를 실제 실행한 결과 그림은 아닙니다.",
    "altText": "메시지를 받은 뒤 eventId 기록과 주문 변경을 같은 DB 트랜잭션에 커밋하고 그다음 오프셋을 커밋합니다. 두 커밋 사이에 중단되면 메시지를 다시 받을 수 있어 같은 eventId와 payload의 DB 효과를 반복하지 않아야 합니다.",
    "readingOrder": "첫 패널에서 두 커밋의 순서를 확인한 뒤, 두 번째 패널에서 그 사이에 중단되었을 때의 가능성을 읽으세요.",
    "panels": [
      {
        "id": "normal",
        "title": "1. 정상 처리의 두 커밋",
        "nodes": [
          {
            "id": "received",
            "label": "Kafka 메시지 수신",
            "detail": "자동 오프셋 커밋을 끈 소비자가 읽습니다.",
            "tone": "neutral"
          },
          {
            "id": "db-work",
            "label": "같은 DB 트랜잭션",
            "detail": "processed_events의 eventId 기록과 orders 변경을 함께 수행합니다.",
            "tone": "neutral"
          },
          {
            "id": "db-commit",
            "label": "DB commit 성공",
            "detail": "업무 효과는 DB에 반영됐습니다.",
            "tone": "accent"
          },
          {
            "id": "offset",
            "label": "그다음 offset commit",
            "detail": "소비자의 처리 위치를 Kafka에 기록합니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "received",
            "to": "db-work",
            "label": "이벤트를 처리"
          },
          {
            "from": "db-work",
            "to": "db-commit",
            "label": "두 DB 변경을 함께 확정"
          },
          {
            "from": "db-commit",
            "to": "offset",
            "label": "DB 성공 후 소비 위치 커밋"
          }
        ]
      },
      {
        "id": "gap",
        "title": "2. DB 성공 뒤 offset 커밋 전에 중단",
        "nodes": [
          {
            "id": "gap",
            "label": "DB에는 효과가 남음",
            "detail": "오프셋은 아직 커밋되지 않았을 수 있습니다.",
            "tone": "warning"
          },
          {
            "id": "redelivery",
            "label": "같은 이벤트를 다시 받을 수 있음",
            "detail": "복구 후 소비 위치에 따라 재처리 가능성이 생깁니다.",
            "tone": "neutral"
          },
          {
            "id": "dedupe",
            "label": "eventId와 payload 확인",
            "detail": "같은 eventId·같은 orderId이면 이미 반영된 요청으로 판단합니다.",
            "tone": "neutral"
          },
          {
            "id": "no-repeat",
            "label": "DB 효과를 반복하지 않음",
            "detail": "동일 payload 중복은 false를 반환합니다. 다른 payload이면 거절합니다.",
            "tone": "accent"
          }
        ],
        "edges": [
          {
            "from": "gap",
            "to": "redelivery",
            "label": "두 커밋은 별도의 성공 지점"
          },
          {
            "from": "redelivery",
            "to": "dedupe",
            "label": "처리 이력과 입력을 대조"
          },
          {
            "from": "dedupe",
            "to": "no-repeat",
            "label": "동일한 업무 요청의 멱등 처리"
          }
        ]
      }
    ],
    "takeaway": "전달 횟수와 DB 반영 횟수를 분리하고, 서로 다른 커밋 사이의 실패를 설계에 포함하세요.",
    "limits": [
      "제공 테스트는 같은 payload를 두 메시지로 보내는 모델입니다. 실제 브로커 장애·프로세스 재시작 복구를 재현한 검사는 아닙니다.",
      "이 과제의 단일 DB·eventId 유일성 계약에 한정합니다. Kafka와 임의의 외부 DB가 자동으로 exactly-once가 된다는 뜻이 아닙니다."
    ],
    "sources": [
      {
        "title": "KafkaConsumer — Manual Offset Control and delivery semantics",
        "url": "https://kafka.apache.org/39/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html",
        "edition": "Kafka 3.9",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java API — JDBC Connection transactions",
        "url": "https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/Connection.html",
        "edition": "Java SE 17",
        "checkedAt": "2026-10-12"
      }
    ]
  }
};
