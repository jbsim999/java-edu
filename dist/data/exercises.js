// Public learning contracts. Trusted checks and reference answers are kept outside dist.
export const exercises = [
  {
    "id": "java-basics-lab",
    "lessonId": "java-basics",
    "title": "참조가 달라도 같은 코드인가?",
    "mode": "method",
    "minVersion": 8,
    "instructions": [
      "class Solution의 public boolean sameCode(String left, String right)를 완성하세요.",
      "두 문자열의 내용이 같으면 true입니다. 두 값이 모두 null이면 true, 하나만 null이면 false입니다.",
      "참조 동일성을 내용 동등성과 구분하세요. 입력값을 변경하지 않습니다."
    ],
    "template": "class Solution {\n    public boolean sameCode(String left, String right) {\n        // null과 내용 동등성을 함께 처리하세요.\n        return false;\n    }\n}",
    "sampleDescription": "서로 다른 new String(\"JAVA\") 객체 두 개는 같은 코드로 판단합니다.",
    "sampleOutput": "내용이 같은 별도 객체: 통과",
    "goals": [
      "참조 동일성과 내용 동등성을 구분한다.",
      "null을 포함한 호출 계약을 구현한다."
    ],
    "rubric": [
      "== 비교에 의존하지 않고 내용 비교를 사용하는지 설명한다.",
      "null 계약을 호출자가 예측할 수 있도록 설명한다."
    ]
  },
  {
    "id": "oop-lab",
    "lessonId": "oop",
    "title": "재고의 불변식을 객체 안에 두기",
    "mode": "class",
    "minVersion": 8,
    "instructions": [
      "class Solution을 재고 객체로 설계하세요. public Solution(int initialStock), public boolean reserve(int quantity), public int remaining()을 제공해야 합니다.",
      "초기 재고는 0 이상입니다. 음수이면 생성자에서 IllegalArgumentException을 던지세요.",
      "reserve는 양수이며 현재 재고 이하인 수량만 예약하고 true를 반환합니다. 나머지는 false이며 재고를 변경하지 않습니다.",
      "재고를 외부에서 직접 변경할 수 없게 하세요. 실패한 예약 뒤에도 남은 재고는 그대로여야 합니다."
    ],
    "template": "class Solution {\n    // 필드, 생성자, reserve, remaining을 설계하세요.\n}",
    "sampleDescription": "재고 5개에서 3개 예약 후 잔여 2개, 추가 3개 예약은 실패하고 2개를 유지합니다.",
    "sampleOutput": "예약 성공과 초과 예약 실패: 통과",
    "goals": [
      "생성자와 메서드에서 객체의 불변식을 지킨다.",
      "실패한 명령의 상태 변경 여부를 명확히 한다."
    ],
    "rubric": [
      "재고 필드를 캡슐화하고 잘못된 상태를 만드는 경로를 차단한다.",
      "예약 검증과 변경의 책임을 객체에 두며 실패 계약을 설명한다.",
      "이 과제는 단일 스레드 객체이며 분산 락이나 동시 예약 안전성을 구현한 것이 아님을 구분한다."
    ]
  },
  {
    "id": "polymorphism-lab",
    "lessonId": "polymorphism",
    "title": "상속 없이 할인 정책 교체하기",
    "mode": "class",
    "minVersion": 8,
    "instructions": [
      "class Solution 안에 public interface DiscountPolicy { int discount(int subtotal); }를 선언하세요.",
      "public int payable(int subtotal, DiscountPolicy policy)를 구현하세요. 소계에서 정책이 반환한 할인액을 뺀 값을 반환합니다.",
      "subtotal은 0 이상, 할인액은 0 이상 subtotal 이하입니다. 위반하면 IllegalArgumentException을 던지세요.",
      "policy가 null이면 NullPointerException을 던지세요. policy.discount는 유효한 subtotal에 대해 정확히 한 번 호출합니다.",
      "정책의 구체 클래스나 종류를 검사하지 않고 인터페이스로 협력하세요."
    ],
    "template": "class Solution {\n    // DiscountPolicy와 payable 메서드를 설계하세요.\n}",
    "sampleDescription": "소계 10000에 할인액 1000을 반환하는 정책을 주입하면 결제액은 9000입니다.",
    "sampleOutput": "정액 정책 주입: 통과",
    "goals": [
      "협력 인터페이스로 구현 교체 지점을 만든다.",
      "다형성과 호출 계약을 함께 검증한다."
    ],
    "rubric": [
      "구체 타입 분기 없이 정책에 계산을 위임한다.",
      "정책을 상속할 이유와 조합할 이유를 비교한다.",
      "새 정책이 기존 호출 계약을 깨지 않도록 검증하는 위치를 설명한다."
    ]
  },
  {
    "id": "collections-lab",
    "lessonId": "collections",
    "title": "순서를 보존하는 중복 제거",
    "mode": "method",
    "minVersion": 8,
    "instructions": [
      "public java.util.List<String> uniqueCodes(java.util.List<String> codes)를 완성하세요.",
      "내용이 같은 문자열은 첫 항목만 남기고 최초 등장 순서를 유지합니다. null 항목도 한 번만 남깁니다.",
      "입력 리스트 자체는 null이 아니라고 가정합니다. 입력 리스트를 변경하지 마세요.",
      "결과는 입력과 다른 새로운 리스트여야 합니다. 결과를 수정해도 입력 리스트는 바뀌지 않아야 합니다."
    ],
    "template": "class Solution {\n    public java.util.List<String> uniqueCodes(java.util.List<String> codes) {\n        return new java.util.ArrayList<String>();\n    }\n}",
    "sampleDescription": "[\"B\", \"A\", \"B\"]를 입력하면 [\"B\", \"A\"]를 반환합니다.",
    "sampleOutput": "최초 등장 순서: 통과",
    "goals": [
      "컬렉션의 순서·중복·변경 계약을 선택한다.",
      "참조 공유와 복사본을 구분한다."
    ],
    "rubric": [
      "선택한 Set/List 구현이 요구 순서와 동등성 계약에 맞는지 설명한다.",
      "복사본이 깊은 복사를 뜻하지 않음을 설명한다."
    ]
  },
  {
    "id": "generics-lab",
    "lessonId": "generics",
    "title": "생산자와 소비자를 받는 복사 API",
    "mode": "method",
    "minVersion": 8,
    "instructions": [
      "public <T> void copy(java.util.List<? extends T> source, java.util.List<? super T> target)를 완성하세요.",
      "source의 모든 항목을 순서대로 target의 끝에 추가하세요. target의 기존 항목은 유지합니다.",
      "두 리스트는 null이 아니며 서로 다른 객체이고, 저장소를 공유하는 뷰·래퍼 관계가 없습니다. target은 source의 모든 요소를 수용하고 추가할 수 있는 리스트입니다.",
      "raw type이나 강제 캐스팅을 사용하지 마세요. source를 변경하지 않습니다."
    ],
    "template": "class Solution {\n    public <T> void copy(java.util.List<? extends T> source,\n                         java.util.List<? super T> target) {\n        // 생산자에서 읽고 소비자에 추가하세요.\n    }\n}",
    "sampleDescription": "List<Integer>의 1, 2를 List<Number>의 0.5 뒤에 추가합니다.",
    "sampleOutput": "Integer에서 Number로 복사: 통과",
    "goals": [
      "불공변 제네릭과 wildcard 경계를 구분한다.",
      "읽기·쓰기 역할로 API 타입을 정한다."
    ],
    "rubric": [
      "extends에서 T로 읽을 수 있고 super에 T를 쓸 수 있는 이유를 설명한다.",
      "컴파일 오류를 raw type이나 unchecked cast로 우회하지 않는다."
    ]
  },
  {
    "id": "exceptions-lab",
    "lessonId": "exceptions",
    "title": "원인을 보존하는 설정값 파서",
    "mode": "method",
    "minVersion": 8,
    "instructions": [
      "public int parsePort(String text)를 완성하세요.",
      "앞뒤 공백은 String.trim()으로 제거하고 1~65535 범위의 정수를 반환하세요.",
      "null, 빈 문자열, 숫자 형식 오류, 범위 밖 값은 IllegalArgumentException으로 거절합니다.",
      "Integer.parseInt에서 NumberFormatException이 발생했다면 새 IllegalArgumentException의 cause로 원본 예외를 보존하세요. 오류를 0 같은 정상값으로 바꾸지 않습니다."
    ],
    "template": "class Solution {\n    public int parsePort(String text) {\n        return 0;\n    }\n}",
    "sampleDescription": "\" 8080 \"은 8080입니다. \"eighty\"는 원인 예외를 보존하여 거절합니다.",
    "sampleOutput": "공백을 포함한 유효 설정: 통과",
    "goals": [
      "실패를 정상값과 구분한다.",
      "예외 변환 시 진단 가능한 원인을 보존한다."
    ],
    "rubric": [
      "입력 검증과 파싱 실패의 책임을 설명한다.",
      "광범위한 예외 삼키기나 임의의 기본값 반환을 사용하지 않는다."
    ]
  },
  {
    "id": "streams-lab",
    "lessonId": "streams",
    "title": "공유 상태 없이 조건 합계 구하기",
    "mode": "method",
    "minVersion": 8,
    "instructions": [
      "public int totalPositiveEven(java.util.List<Integer> values)를 완성하세요.",
      "null 항목, 0, 음수와 홀수는 제외하고 양수인 짝수만 합산하세요.",
      "리스트 자체는 null이 아니며 유효 항목의 총합은 int 범위를 넘지 않습니다. 입력을 변경하지 마세요.",
      "Stream과 원시형 집계 연산으로 외부 가변 누산기 없이 작성하세요. 이 설계 조건은 별도 루브릭으로 확인합니다."
    ],
    "template": "class Solution {\n    public int totalPositiveEven(java.util.List<Integer> values) {\n        return 0;\n    }\n}",
    "sampleDescription": "[2, -4, 3, null, 6, 0]의 결과는 8입니다.",
    "sampleOutput": "조건 필터와 합계: 통과",
    "goals": [
      "중간 연산과 최종 연산을 구분한다.",
      "공유 상태 대신 데이터 흐름으로 집계한다."
    ],
    "rubric": [
      "Stream 파이프라인과 최종 연산을 식별한다.",
      "외부 컬렉션·누산기 변경 없이 결과를 구한다.",
      "parallelStream으로 바꾸면 무조건 빨라진다는 주장을 하지 않는다."
    ]
  },
  {
    "id": "concurrency-lab",
    "lessonId": "concurrency",
    "title": "작업 완료를 기다리는 안전한 카운터",
    "mode": "class",
    "minVersion": 8,
    "instructions": [
      "class Solution에 public int count(int workers, int iterations)를 구현하세요.",
      "workers개의 실제 작업을 ExecutorService에 제출하고, 각 작업이 공유 AtomicInteger를 iterations번 증가시키게 하세요.",
      "모든 작업이 끝난 뒤 합계를 반환하고 ExecutorService를 종료하세요. workers는 1~8, iterations는 0~10000이며 범위 밖 입력은 IllegalArgumentException입니다.",
      "대기 중 인터럽트가 발생하면 인터럽트 상태를 복원하고 IllegalStateException으로 전파하세요. 작업 실패도 원인을 보존해 IllegalStateException으로 전파합니다.",
      "자동 테스트는 반환값과 입력 계약을 확인합니다. 실제 작업 제출·원자 연산·종료 책임은 별도 설계 검토 대상입니다."
    ],
    "template": "class Solution {\n    // count 메서드와 필요한 협력 객체를 작성하세요.\n}",
    "sampleDescription": "작업 2개가 각각 500번 증가시키면 반환값은 1000입니다.",
    "sampleOutput": "두 작업의 완료 합계: 통과",
    "goals": [
      "공유 상태의 원자성과 완료 대기를 분리한다.",
      "Executor의 생명주기와 실패 전파를 책임진다."
    ],
    "rubric": [
      "workers × iterations 계산만 반환하지 않고 실제 작업을 제출한다.",
      "AtomicInteger 등 원자 연산의 적용 범위와 복합 업무 트랜잭션의 차이를 설명한다.",
      "작업 완료 확인, Executor 종료, 인터럽트 복원을 검토한다."
    ]
  },
  {
    "id": "modern-apis-lab",
    "lessonId": "modern-apis",
    "title": "Java 11 API로 여러 줄 입력 정규화하기",
    "mode": "method",
    "minVersion": 11,
    "instructions": [
      "public java.util.List<String> normalizedLines(String text)를 완성하세요.",
      "String.lines() 기준으로 줄을 나눈 뒤 각 줄에 strip()을 적용하고 isBlank()인 줄을 제외하세요.",
      "최초 줄 순서와 중복 줄은 보존합니다. null 입력은 IllegalArgumentException으로 거절하세요.",
      "이 과제는 Java 11 이상의 API를 사용합니다. trim()과 strip()의 공백 판정 차이를 확인하세요."
    ],
    "template": "class Solution {\n    public java.util.List<String> normalizedLines(String text) {\n        return new java.util.ArrayList<String>();\n    }\n}",
    "sampleDescription": "\"  Java\\n\\n SQL  \"은 [\"Java\", \"SQL\"]이 됩니다.",
    "sampleOutput": "빈 줄 제거와 순서: 통과",
    "goals": [
      "API Since와 대상 런타임을 연결한다.",
      "공백 정의가 입력 계약에 미치는 영향을 이해한다."
    ],
    "rubric": [
      "String.lines·strip·isBlank의 역할을 설명한다.",
      "Java 8에서 동일 코드를 실행할 수 있다고 표시하지 않는다."
    ]
  },
  {
    "id": "records-sealed-lab",
    "lessonId": "records-sealed",
    "title": "성공과 실패를 닫힌 결과 타입으로 표현하기",
    "mode": "class",
    "minVersion": 17,
    "instructions": [
      "class Solution 안에 public sealed interface Result permits Accepted, Rejected를 선언하세요.",
      "public record Accepted(int remaining) implements Result와 public record Rejected(String reason) implements Result를 선언하세요.",
      "public Result reserve(int stock, int requested)를 구현하세요. stock < 0이면 Rejected(\"invalid-stock\"), requested <= 0이면 Rejected(\"invalid-quantity\"), requested > stock이면 Rejected(\"insufficient-stock\")를 반환합니다. 이 순서로 검증하세요.",
      "그 외에는 Accepted(stock - requested)를 반환합니다. 입력값 외 공유 상태는 필요 없습니다.",
      "Java 17에서 정식인 record·sealed 타입을 사용하세요. Java 17의 preview pattern switch는 사용하지 않습니다."
    ],
    "template": "class Solution {\n    // Result, Accepted, Rejected와 reserve를 선언하세요.\n}",
    "sampleDescription": "재고 5개에서 2개 예약은 Accepted(3)과 값이 같은 결과입니다.",
    "sampleOutput": "성공 결과의 값 동등성: 통과",
    "goals": [
      "닫힌 타입 계층으로 결과의 종류를 드러낸다.",
      "record의 생성 코드와 불변성의 범위를 구분한다."
    ],
    "rubric": [
      "sealed 계층과 record로 상태의 의미를 명확히 한다.",
      "record가 가변 구성 요소까지 깊게 불변으로 만들지는 않음을 설명한다.",
      "Java 17에서 preview 문법을 섞지 않는다."
    ]
  },
  {
    "id": "java21-lab",
    "lessonId": "java21",
    "title": "패턴과 가드로 입력의 의미 분류하기",
    "mode": "method",
    "minVersion": 21,
    "instructions": [
      "제공된 public record Order(String id, int quantity)는 유지하고 public String describe(Object value)를 완성하세요.",
      "Order이며 quantity > 0이면 id + \":\" + quantity를 반환합니다. 나머지 Order는 \"empty\", null은 \"missing\", 다른 타입은 \"unsupported\"입니다.",
      "과제의 Order.id는 null이 아니라고 가정합니다.",
      "Java 21의 record pattern과 when 가드를 사용하세요. 분기 순서와 null 분기를 설명할 수 있어야 합니다."
    ],
    "template": "class Solution {\n    public record Order(String id, int quantity) {}\n\n    public String describe(Object value) {\n        return \"unsupported\";\n    }\n}",
    "sampleDescription": "new Order(\"A-21\", 3)은 \"A-21:3\"입니다.",
    "sampleOutput": "양수 주문 패턴: 통과",
    "goals": [
      "record pattern과 가드 조건으로 타입·상태를 함께 분기한다.",
      "null과 포괄 분기 범위를 명시한다."
    ],
    "rubric": [
      "record pattern·when 가드의 범위를 설명한다.",
      "구체적인 패턴을 넓은 패턴보다 먼저 배치하는 이유를 설명한다.",
      "Java 21 정식 문법만 사용하고 preview 옵션에 의존하지 않는다."
    ]
  },
  {
    "id": "testing-design-lab",
    "lessonId": "testing-design",
    "title": "정상 구현과 경계 결함을 구별하는 테스트",
    "mode": "method",
    "minVersion": 8,
    "instructions": [
      "public boolean acceptsPolicy(java.util.function.IntUnaryOperator policy)를 완성하세요. 배송비 정책을 검사하는 작은 테스트 함수를 작성하는 과제입니다.",
      "정책의 계약은 주문액 0~29999이면 배송비 3000, 30000 이상이면 0, 음수 주문액은 IllegalArgumentException입니다.",
      "이 과제에서는 0, 29999, 30000, 30001, -1의 다섯 대표값을 검사하세요. 모두 기대 행동이면 true, 하나라도 다르거나 예상 밖 RuntimeException이면 false입니다.",
      "policy는 null이 아니며 호출 결과는 결정적이라고 가정합니다. JUnit 의존성 없이 테스트의 판별력을 연습합니다."
    ],
    "template": "class Solution {\n    public boolean acceptsPolicy(java.util.function.IntUnaryOperator policy) {\n        return false;\n    }\n}",
    "sampleDescription": "올바른 정책은 통과하고, 무료 배송 경계를 > 30000으로 잘못 쓴 정책은 거절합니다.",
    "sampleOutput": "계약을 만족하는 정책 수용: 통과",
    "goals": [
      "정상값과 경계값으로 규칙을 검증한다.",
      "테스트가 잘못된 구현을 실제로 구분하는지 확인한다."
    ],
    "rubric": [
      "정상 구현을 통과시키고 의도적으로 틀린 구현을 실패시킨다.",
      "검사한 대표값과 전체 입력 범위에 대한 증명을 구분한다.",
      "실무에서는 같은 검사를 JUnit 등 테스트 도구에 옮겨 실패 진단을 개선할 수 있음을 설명한다."
    ]
  }
];
