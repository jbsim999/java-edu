// Original Korean learning content. Each example is a standalone Main.java.
export const lessons = [
  {
    "id": "java-basics",
    "title": "Java의 값 전달과 객체 동등성",
    "description": "다른 언어의 직관을 Java의 타입·참조·boxing 계약과 대조합니다.",
    "track": "transition",
    "level": "전환",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 35,
    "category": "Java 사고 모델",
    "goals": [
      "변수의 값과 그 값이 가리키는 객체를 구분한다.",
      "참조 재할당과 객체 변경의 결과를 설명한다.",
      "내용 동등성과 null·boxing의 경계를 다룬다."
    ],
    "theory": [
      {
        "heading": "객체도 값으로 전달된다",
        "text": "Java의 메서드 호출은 값 전달입니다. 기본형은 그 값, 참조형은 참조값을 복사합니다. 두 참조가 같은 객체를 가리키면 한쪽의 객체 변경을 다른 쪽에서도 볼 수 있지만, 매개변수에 새 객체를 대입해도 호출자의 변수는 재할당되지 않습니다. 메모리 주소를 직접 다룬다는 설명 대신 변수·참조·객체를 나눠 호출 전후 상태를 그려 보세요."
      },
      {
        "heading": "같은 객체와 같은 내용",
        "text": "참조형의 ==는 참조 동일성을 검사합니다. String.equals는 문자열 내용을 비교하고, Objects.equals는 null을 포함한 동등성 비교를 제공합니다. 사용자 정의 타입은 업무상 같은 값의 의미를 먼저 정해야 합니다. equals를 재정의한다면 hashCode 계약도 함께 지켜야 하며, 데이터베이스 식별자와 객체의 모든 필드가 항상 같은 동등성 기준인 것은 아닙니다."
      },
      {
        "heading": "boxing은 null과 타입 변환을 숨길 수 있다",
        "text": "Integer와 int 사이에는 boxing·unboxing이 일어납니다. null인 Integer를 산술식에 사용하면 unboxing 중 NullPointerException이 발생할 수 있습니다. Integer 객체의 == 결과를 값 비교 규칙으로 사용하지 마세요. 정수 나눗셈, 좁은 타입으로의 변환, null 허용 여부도 공개 메서드 계약에 포함할 대상입니다."
      }
    ],
    "example": {
      "title": "참조 복사와 객체 변경 · Main.java",
      "code": "class Main {\n    static class Box {\n        int value;\n        Box(int value) { this.value = value; }\n    }\n\n    static void replaceNumber(int value) {\n        value = 99;\n    }\n\n    static void update(Box box) {\n        box.value += 10;\n        box = new Box(99);\n    }\n\n    public static void main(String[] args) {\n        int number = 5;\n        Box box = new Box(5);\n        replaceNumber(number);\n        update(box);\n        String left = new String(\"java\");\n        String right = new String(\"java\");\n        System.out.println(number);\n        System.out.println(box.value);\n        System.out.println(left == right);\n        System.out.println(left.equals(right));\n    }\n}",
      "output": "5\n15\nfalse\ntrue",
      "explanation": "number는 5를 유지합니다. update는 기존 Box의 value를 15로 바꾸지만, 매개변수 box의 재할당은 호출자의 box를 바꾸지 않습니다. 두 String 객체는 별개이므로 ==는 false, 내용 비교는 true입니다."
    },
    "quiz": [
      {
        "id": "java-basics-q1",
        "question": "참조형 매개변수 x에 새 객체를 대입했을 때 호출자의 변수에는 어떤 일이 일어날까요?",
        "options": [
          "호출자의 변수도 새 객체를 가리킨다.",
          "호출자의 변수는 기존 참조값을 유지한다.",
          "기존 객체의 모든 필드가 초기화된다.",
          "항상 컴파일 오류가 발생한다."
        ],
        "correctIndex": 1,
        "explanation": "참조값도 복사되어 전달됩니다. 매개변수 재할당은 호출자의 변수 재할당과 다릅니다. 같은 객체의 필드를 수정한 경우에는 그 객체를 함께 보는 참조에서 변경이 관찰됩니다."
      },
      {
        "id": "java-basics-q2",
        "question": "Integer count = null; int next = count + 1; 의 결과로 맞는 것은?",
        "options": [
          "next는 1이다.",
          "next는 null이다.",
          "unboxing 과정에서 NullPointerException이 발생한다.",
          "모든 Java 버전에서 컴파일이 금지된다."
        ],
        "correctIndex": 2,
        "explanation": "산술 연산에는 int 값이 필요하여 count를 unboxing합니다. null에서 int 값을 얻을 수 없어 실행 시 예외가 발생합니다. null 정책을 먼저 정하고 검사해야 합니다."
      }
    ],
    "practice": {
      "title": "외부 입력의 동등성 계약 정하기",
      "scenario": "외부 시스템에서 읽은 상품 코드가 같은 문자열이지만 서로 다른 객체로 생성됩니다. 일부 입력에는 null이 있습니다.",
      "tasks": [
        "같은 코드의 기준을 대소문자·공백·null 정책으로 명시하세요.",
        "참조 비교로 생기는 결함을 재현하고 내용 비교로 수정하세요.",
        "정규화가 원본 식별자의 의미를 바꿀 수 있는 사례를 하나 설명하세요."
      ],
      "takeaway": "데이터를 비교하기 전에 같음의 업무 의미를 정합니다. null 처리와 정규화는 숨은 구현 편의가 아니라 호출 계약입니다."
    },
    "sources": [
      {
        "title": "JDK 8 Tutorial — Passing Information to a Method",
        "url": "https://docs.oracle.com/javase/tutorial/java/javaOO/arguments.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 8 API — Objects",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/Objects.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 8 API — Integer",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/lang/Integer.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java"
    ],
    "exerciseId": "java-basics-lab"
  },
  {
    "id": "oop",
    "title": "OOP: 책임과 불변식을 객체에 두기",
    "description": "필드를 숨기는 수준을 넘어 잘못된 상태가 만들어지는 경로를 줄입니다.",
    "track": "both",
    "level": "심화",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 50,
    "category": "객체 설계",
    "goals": [
      "객체가 유지해야 할 불변식을 문장으로 정의한다.",
      "생성자·명령 메서드·조회 메서드의 책임을 구분한다.",
      "가변 상태를 외부에 노출하는 비용을 설명한다."
    ],
    "theory": [
      {
        "heading": "캡슐화는 private 필드보다 넓다",
        "text": "캡슐화의 핵심은 객체의 상태 변경 규칙을 한곳에서 지키는 것입니다. private 필드를 두고 모든 setter를 공개해도 호출자가 잘못된 상태를 만들 수 있다면 규칙은 보호되지 않습니다. 생성자는 유효한 초기 상태를 만들고, 명령 메서드는 성공·실패 후 유지해야 할 조건을 명시해야 합니다."
      },
      {
        "heading": "불변식과 실패의 원자성",
        "text": "예를 들어 적립 잔액이 0 이상이어야 한다면 차감 전 검증과 차감 후 조건이 필요합니다. 오류를 발견하기 전에 일부 필드를 바꾸면 호출자는 실패 후 상태를 예측하기 어렵습니다. 여러 상태를 한 번에 바꾸는 메서드는 검증 순서와 실패 시 보존할 상태를 설계하세요. 이 수업의 단일 객체 규칙은 멀티스레드·분산 트랜잭션 보장을 뜻하지 않습니다."
      },
      {
        "heading": "불변 객체와 협력 경계",
        "text": "final 참조는 재할당을 막지만 참조 대상 객체의 내부 변경까지 막지는 않습니다. 컬렉션을 반환할 때는 읽기 전용 뷰, 복사본, 요소의 가변성까지 구분해야 합니다. 모든 객체를 불변으로 만드는 것보다 누가 변경을 소유하는지 설명할 수 있는 설계를 목표로 합니다. 서비스·저장소·도메인 객체의 책임은 실제 변경 요구로 검토합니다."
      }
    ],
    "example": {
      "title": "잔액 규칙을 지키는 객체 · Main.java",
      "code": "class Main {\n    static final class Credit {\n        private int balance;\n\n        Credit(int initialBalance) {\n            if (initialBalance < 0) {\n                throw new IllegalArgumentException(\"negative balance\");\n            }\n            balance = initialBalance;\n        }\n\n        boolean spend(int amount) {\n            if (amount <= 0 || amount > balance) {\n                return false;\n            }\n            balance -= amount;\n            return true;\n        }\n\n        int balance() { return balance; }\n    }\n\n    public static void main(String[] args) {\n        Credit credit = new Credit(100);\n        System.out.println(credit.spend(40));\n        System.out.println(credit.spend(70));\n        System.out.println(credit.balance());\n    }\n}",
      "output": "true\nfalse\n60",
      "explanation": "첫 차감 후 잔액은 60입니다. 두 번째 차감은 잔액을 초과하므로 실패하고 상태를 바꾸지 않습니다. 호출자가 balance를 임의로 설정하는 setter는 제공하지 않습니다."
    },
    "quiz": [
      {
        "id": "oop-q1",
        "question": "재고 객체의 필드는 private이지만 setStock(int)가 모든 값을 허용합니다. 가장 정확한 평가는?",
        "options": [
          "private이므로 불변식이 자동 보장된다.",
          "생성자만 검증하면 이후 상태는 안전하다.",
          "음수를 넣을 수 있어 공개 변경 경로에서 규칙이 깨질 수 있다.",
          "setter 이름을 바꾸면 문제가 해결된다."
        ],
        "correctIndex": 2,
        "explanation": "접근 제한자는 도구입니다. 공개된 변경 메서드가 업무 규칙을 무시하면 잘못된 상태를 만들 수 있습니다. 규칙을 가진 명령 메서드와 유효성 검증을 함께 설계해야 합니다."
      },
      {
        "id": "oop-q2",
        "question": "final List<String> names에 대한 설명으로 맞는 것은?",
        "options": [
          "names의 참조 재할당은 금지되지만 리스트 구현이 허용하면 요소 추가는 가능하다.",
          "리스트와 모든 요소가 깊게 불변이 된다.",
          "어떤 경우에도 names.add를 호출할 수 없다.",
          "다른 스레드와 공유해도 모든 복합 연산이 원자적이다."
        ],
        "correctIndex": 0,
        "explanation": "final은 해당 필드의 참조 재할당을 제한합니다. 리스트의 변경 가능성, 요소의 가변성, 동시성 보장은 별도 계약입니다."
      }
    ],
    "practice": {
      "title": "예약 도메인의 상태 변경 경로 줄이기",
      "scenario": "재고 수량을 여러 서비스가 직접 수정하면서 음수 재고와 실패 후 부분 변경이 발생했습니다.",
      "tasks": [
        "생성·예약·취소 각각의 사전조건과 사후조건을 적으세요.",
        "호출자가 규칙을 우회하는 setter와 가변 컬렉션 노출을 찾으세요.",
        "실패한 예약 뒤 상태가 유지되는 테스트를 먼저 제시하세요."
      ],
      "takeaway": "객체를 나눴다는 사실보다 어떤 규칙을 누가 지키는지와 실패 후 상태가 명확한지가 중요합니다."
    },
    "sources": [
      {
        "title": "JDK 8 Tutorial — Classes",
        "url": "https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "JLS 8 — Types, Values, and Variables",
        "url": "https://docs.oracle.com/javase/specs/jls/se8/html/jls-4.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "JLS 8 — Classes",
        "url": "https://docs.oracle.com/javase/specs/jls/se8/html/jls-8.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java",
      "Spring Boot"
    ],
    "exerciseId": "oop-lab"
  },
  {
    "id": "polymorphism",
    "title": "OOP: 다형성, 계약과 합성",
    "description": "바뀌는 정책을 분리하면서 기존 호출자의 기대를 유지합니다.",
    "track": "both",
    "level": "심화",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 55,
    "category": "객체 설계",
    "goals": [
      "다형성을 타입 분기 제거와 계약 유지의 관점에서 설명한다.",
      "상속과 합성의 비용을 비교한다.",
      "의존 관계와 테스트 대역의 연결을 이해한다."
    ],
    "theory": [
      {
        "heading": "교체 가능성에는 행동 계약이 필요하다",
        "text": "인터페이스를 구현했다는 사실만으로 안전하게 교체할 수 있는 것은 아닙니다. 허용 입력, 반환값, 실패 조건과 부수 효과를 호출자가 기대할 수 있어야 합니다. LSP를 검토할 때는 새 구현이 기존 호출자에게 더 강한 사전조건을 요구하거나 약속한 결과를 약화하는지 살펴보세요. 이는 언어 문법 이상의 설계 판단입니다."
      },
      {
        "heading": "상속과 합성은 변경 이유로 선택한다",
        "text": "상속은 상위 타입의 구현·확장 규칙과 결합됩니다. 정책 교체가 목적이라면 별도 객체를 주입해 협력시키는 합성이 변경 지점을 더 명확하게 만들 수 있습니다. 반대로 모든 메서드에 인터페이스를 추가하면 작은 변경에도 파일과 탐색 비용이 늘어납니다. SOLID는 점수표가 아니라 결합과 변경 비용을 검토하는 관점으로 사용합니다."
      },
      {
        "heading": "수동 의존성 주입에서 실행 원리 이해하기",
        "text": "생성자나 메서드 인자로 협력 객체를 전달하면 선택과 사용을 분리할 수 있습니다. 테스트에서는 같은 계약을 지키는 대역으로 외부 환경을 통제합니다. 이 수업은 순수 Java의 수동 조립입니다. Spring 컨테이너·프록시·AOP를 실행하는 예제가 아니며, 프레임워크 과정에서는 이 구조를 기반으로 객체 생성과 호출 경로가 어떻게 바뀌는지 다룹니다."
      }
    ],
    "example": {
      "title": "출력 정책을 조합하는 객체 · Main.java",
      "code": "class Main {\n    interface Formatter {\n        String format(String value);\n    }\n\n    static final class Report {\n        private final Formatter formatter;\n\n        Report(Formatter formatter) {\n            this.formatter = java.util.Objects.requireNonNull(formatter);\n        }\n\n        String render(String value) {\n            return formatter.format(value);\n        }\n    }\n\n    public static void main(String[] args) {\n        Report bracketed = new Report(value -> \"[\" + value + \"]\");\n        Report prefixed = new Report(value -> \"report:\" + value);\n        System.out.println(bracketed.render(\"stock\"));\n        System.out.println(prefixed.render(\"stock\"));\n    }\n}",
      "output": "[stock]\nreport:stock",
      "explanation": "Report는 포맷터의 구체 타입을 확인하지 않고 계약으로 협력합니다. 생성자의 수동 주입으로 같은 Report를 서로 다른 정책과 조합합니다. 람다는 Java 8에서 사용할 수 있습니다."
    },
    "quiz": [
      {
        "id": "polymorphism-q1",
        "question": "정상 소계 0 이상을 받던 정책의 새 구현이 10000 이상만 허용합니다. 우선 검토할 문제는?",
        "options": [
          "클래스 이름의 길이",
          "기존 호출자가 허용받던 입력을 거절하는 계약 위반",
          "람다를 사용하지 않았다는 점",
          "인터페이스 파일의 개수"
        ],
        "correctIndex": 1,
        "explanation": "교체 전후 호출자가 기대하는 유효 입력이 달라졌습니다. 더 강한 사전조건을 요구하면 타입이 같아도 기존 사용을 깨뜨릴 수 있습니다."
      },
      {
        "id": "polymorphism-q2",
        "question": "정책 합성에 대한 가장 적절한 설명은?",
        "options": [
          "모든 상속은 잘못이므로 반드시 제거한다.",
          "인터페이스가 많을수록 언제나 좋은 설계다.",
          "어떤 작은 메서드도 별도 전략 클래스로 분리해야 한다.",
          "실제 교체·테스트 요구와 추가 추상화 비용을 비교해 선택한다."
        ],
        "correctIndex": 3,
        "explanation": "합성은 유용한 도구지만 무조건적인 규칙은 아닙니다. 변경 이유, 계약, 테스트 경계, 읽기 비용을 근거로 판단합니다."
      }
    ],
    "practice": {
      "title": "할인 정책 변경 요청 대응",
      "scenario": "정액 할인만 있던 결제 모듈에 비율 할인과 기간 한정 정책이 추가됩니다.",
      "tasks": [
        "정책이 반환할 할인액의 허용 범위와 실패 조건을 정하세요.",
        "정책 종류를 검사하는 조건문 없이 교체 가능한 협력을 만드세요.",
        "새 정책의 계약 위반을 잡는 테스트와 추상화 비용을 설명하세요."
      ],
      "takeaway": "다형성은 구현 선택을 숨기는 데 그치지 않고, 교체 후에도 호출자가 믿는 계약을 유지해야 합니다."
    },
    "sources": [
      {
        "title": "JDK 8 Tutorial — Interfaces",
        "url": "https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "JDK 8 Tutorial — Polymorphism",
        "url": "https://docs.oracle.com/javase/tutorial/java/IandI/polymorphism.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "JDK 8 Tutorial — Lambda Expressions",
        "url": "https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java",
      "Spring Boot"
    ],
    "exerciseId": "polymorphism-lab"
  },
  {
    "id": "collections",
    "title": "컬렉션: 순서, 동등성과 변경 계약",
    "description": "List·Set·Map을 자료구조 이름이 아니라 호출 계약으로 선택합니다.",
    "track": "both",
    "level": "기본",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 40,
    "category": "타입과 데이터",
    "goals": [
      "순서·중복·키 조회 요구로 컬렉션을 선택한다.",
      "equals와 hashCode가 조회에 미치는 영향을 설명한다.",
      "뷰와 복사본, 요소의 가변성을 구분한다."
    ],
    "theory": [
      {
        "heading": "인터페이스와 구현이 약속하는 것",
        "text": "List는 위치와 중복을, Set은 중복 없는 요소를, Map은 키와 값의 대응을 다룹니다. Map은 Collection의 하위 인터페이스가 아닙니다. HashMap의 순회 순서를 업무 요구로 가정하지 마세요. 최초 등장 순서가 필요한 중복 제거처럼 순서가 계약이라면 LinkedHashSet 등의 구현을 근거로 선택합니다."
      },
      {
        "heading": "동등성과 해시의 계약",
        "text": "equals로 같은 두 객체는 같은 hashCode를 반환해야 합니다. 역은 성립하지 않아 해시 충돌이 있을 수 있습니다. 해시 기반 컬렉션에 넣은 뒤 동등성·해시에 사용한 필드를 바꾸면 원래 기대한 조회가 깨질 수 있습니다. 값 객체나 안정적인 식별자를 키로 쓰는 이유를 이 계약과 연결해 설명하세요."
      },
      {
        "heading": "변경 불가 뷰는 스냅샷이 아니다",
        "text": "Collections.unmodifiableList는 지정 리스트에 대한 변경 불가 뷰입니다. 원본 리스트가 바뀌면 뷰에서 변경을 볼 수 있습니다. new ArrayList로 컨테이너를 복사한 뒤 감싸면 구조 변경을 분리할 수 있지만 요소 자체를 깊게 복사하지는 않습니다. Arrays.asList는 크기가 고정된 리스트이므로 일반 ArrayList와 같은 추가·삭제 계약으로 사용하면 안 됩니다."
      }
    ],
    "example": {
      "title": "집계와 컨테이너 복사 · Main.java",
      "code": "class Main {\n    public static void main(String[] args) {\n        java.util.List<String> tags =\n                java.util.Arrays.asList(\"java\", \"sql\", \"java\");\n        java.util.Map<String, Integer> counts =\n                new java.util.LinkedHashMap<String, Integer>();\n        for (String tag : tags) {\n            counts.put(tag, counts.getOrDefault(tag, 0) + 1);\n        }\n        java.util.List<String> snapshot =\n                java.util.Collections.unmodifiableList(\n                        new java.util.ArrayList<String>(tags));\n        tags.set(0, \"other\");\n        System.out.println(counts.get(\"java\"));\n        System.out.println(snapshot.get(0));\n        System.out.println(tags.get(0));\n    }\n}",
      "output": "2\njava\nother",
      "explanation": "집계용 Map은 java를 두 번 센 결과를 가집니다. snapshot의 컨테이너를 먼저 복사했으므로 tags.set의 영향을 받지 않습니다. 이 예제의 String은 불변이지만, 가변 요소를 쓸 때는 요소의 공유도 별도로 판단해야 합니다."
    },
    "quiz": [
      {
        "id": "collections-q1",
        "question": "equals가 true인 두 객체의 hashCode에 대한 필수 조건은?",
        "options": [
          "반드시 달라야 한다.",
          "반드시 같아야 한다.",
          "매 호출마다 바뀌어야 한다.",
          "HashMap에서는 hashCode가 사용되지 않는다."
        ],
        "correctIndex": 1,
        "explanation": "같다고 판단한 객체는 같은 해시값을 가져야 합니다. 해시값이 같은 두 객체가 반드시 equals까지 true인 것은 아닙니다."
      },
      {
        "id": "collections-q2",
        "question": "원본 ArrayList를 그대로 unmodifiableList로 감싼 뒤 원본에 항목을 추가하면?",
        "options": [
          "뷰는 독립 복사본이므로 바뀌지 않는다.",
          "뷰를 만든 순간 원본도 수정할 수 없다.",
          "원본의 변경이 뷰에서 보일 수 있다.",
          "모든 요소가 깊게 복사된다."
        ],
        "correctIndex": 2,
        "explanation": "unmodifiableList는 지정 리스트를 읽는 뷰입니다. 뷰 경유 변경은 제한하지만 원본이 다른 경로에서 바뀌는 것까지 차단하지 않습니다."
      }
    ],
    "practice": {
      "title": "중복 이벤트 식별자의 보관 방식 선택",
      "scenario": "배치에서 읽은 이벤트 코드의 중복을 제거하되 최초 순서를 유지해야 합니다.",
      "tasks": [
        "중복 판정 기준과 null 허용 여부를 정하세요.",
        "요구 순서를 보장하는 컬렉션을 선택하세요.",
        "반환 결과 변경이 원본 데이터에 영향을 주지 않는 테스트를 작성하세요."
      ],
      "takeaway": "자료구조 선택은 성능 이름표만으로 결정하지 않습니다. 동등성·순서·변경 가능성도 API 계약입니다."
    },
    "sources": [
      {
        "title": "JDK 8 Tutorial — Collections",
        "url": "https://docs.oracle.com/javase/tutorial/collections/index.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 8 API — Object.equals/hashCode",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/lang/Object.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 8 API — Collections",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/Collections.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java"
    ],
    "exerciseId": "collections-lab"
  },
  {
    "id": "generics",
    "title": "제네릭: 불공변성, 경계와 타입 소거",
    "description": "캐스팅으로 경고를 숨기지 않고 읽기·쓰기 역할에 맞는 API를 설계합니다.",
    "track": "both",
    "level": "심화",
    "minVersion": 8,
    "featureSince": 5,
    "preview": false,
    "duration": 45,
    "category": "타입과 데이터",
    "goals": [
      "List<Integer>가 List<Number>의 하위 타입이 아닌 이유를 설명한다.",
      "extends와 super를 읽기·쓰기 역할로 선택한다.",
      "타입 소거와 raw type의 한계를 이해한다."
    ],
    "theory": [
      {
        "heading": "하위 타입 관계가 그대로 전달되지 않는다",
        "text": "Integer가 Number의 하위 타입이어도 List<Integer>는 List<Number>의 하위 타입이 아닙니다. 만약 대입을 허용하면 Number를 받는 쪽에서 Double을 추가해 Integer 전용 리스트의 약속을 깨뜨릴 수 있습니다. 배열의 공변성과 런타임 검사에 익숙하다면 제네릭의 컴파일 시점 제약과 비교해 보세요."
      },
      {
        "heading": "생산자는 extends, 소비자는 super",
        "text": "List<? extends Number>에서는 Number로 읽을 수 있지만 특정 Number 값을 안전하게 추가할 수는 없습니다. 실제 리스트의 요소 타입을 모르기 때문입니다. List<? super Integer>에는 Integer를 추가할 수 있지만 읽은 값의 일반적인 정적 타입은 Object입니다. 양쪽 역할이 필요한 API는 wildcard를 기계적으로 붙이지 말고 타입 매개변수 관계를 먼저 정하세요."
      },
      {
        "heading": "타입 소거가 만드는 제한",
        "text": "제네릭의 많은 타입 정보는 컴파일 과정에서 소거됩니다. new T(), instanceof List<String>처럼 런타임의 구체 타입을 요구하는 사용에는 제한이 있습니다. raw type과 unchecked cast를 섞으면 컴파일러가 보장하던 안전성을 약화할 수 있습니다. 경고를 없애기 전에 API 경계를 수정할 수 있는지 검토하세요. 제네릭 자체의 도입은 Java 5이며 본 수업 예제 대상은 Java 8입니다."
      }
    ],
    "example": {
      "title": "읽기 역할에 맞춘 상한 경계 · Main.java",
      "code": "class Main {\n    static double sum(java.util.List<? extends Number> values) {\n        double total = 0;\n        for (Number value : values) {\n            total += value.doubleValue();\n        }\n        return total;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(sum(java.util.Arrays.asList(1, 2, 3)));\n        System.out.println(sum(java.util.Arrays.asList(0.5, 1.5)));\n    }\n}",
      "output": "6.0\n2.0",
      "explanation": "sum은 항목을 읽어 Number의 메서드만 사용합니다. Integer 리스트와 Double 리스트를 받되, 어떤 숫자 타입을 리스트에 새로 추가할 권한은 요구하지 않습니다."
    },
    "quiz": [
      {
        "id": "generics-q1",
        "question": "List<Integer>를 List<Number>에 바로 대입할 수 없는 이유는?",
        "options": [
          "Number에 하위 타입이 없기 때문이다.",
          "Integer가 참조형이 아니기 때문이다.",
          "허용하면 Number 경로로 Double을 넣어 Integer 리스트의 계약을 깨뜨릴 수 있기 때문이다.",
          "Java 8에는 제네릭이 없기 때문이다."
        ],
        "correctIndex": 2,
        "explanation": "제네릭은 기본적으로 불공변입니다. 요소 타입의 하위 관계가 파라미터화된 타입의 같은 하위 관계를 자동으로 만들지 않습니다."
      },
      {
        "id": "generics-q2",
        "question": "List<? super Integer> target에 안전하게 할 수 있는 작업은?",
        "options": [
          "Integer 값 추가",
          "읽은 모든 값을 캐스팅 없이 Integer에 대입",
          "어떤 Double 값이든 추가",
          "target을 List<String>으로 간주"
        ],
        "correctIndex": 0,
        "explanation": "실제 요소 타입은 Integer 또는 그 상위 타입입니다. Integer는 추가할 수 있지만 읽은 값은 더 넓은 타입의 값일 수 있으므로 일반적으로 Object로 취급해야 합니다."
      }
    ],
    "practice": {
      "title": "공통 복사 API의 타입 계약",
      "scenario": "Integer 목록을 Number 저장소로, String 목록을 Object 저장소로 복사하는 코드가 반복됩니다.",
      "tasks": [
        "source와 target의 읽기·쓰기 역할을 표시하세요.",
        "raw type 없이 공통 copy 메서드의 타입 매개변수를 정하세요.",
        "target의 기존 항목과 source가 보존되는지 검사하세요."
      ],
      "takeaway": "유연한 API와 타입 안전성은 양립할 수 있습니다. 어느 방향으로 값을 읽고 쓰는지부터 결정하세요."
    },
    "sources": [
      {
        "title": "JDK 8 Tutorial — Upper Bounded Wildcards",
        "url": "https://docs.oracle.com/javase/tutorial/java/generics/upperBounded.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "JDK 8 Tutorial — Lower Bounded Wildcards",
        "url": "https://docs.oracle.com/javase/tutorial/java/generics/lowerBounded.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "JLS 8 — Type Erasure",
        "url": "https://docs.oracle.com/javase/specs/jls/se8/html/jls-4.html#jls-4.6",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java"
    ],
    "exerciseId": "generics-lab"
  },
  {
    "id": "exceptions",
    "title": "예외: 실패 책임과 자원 소유권",
    "description": "예외 종류를 외우는 데서 나아가 처리·전파·진단의 경계를 설계합니다.",
    "track": "both",
    "level": "기본",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 40,
    "category": "실패와 검증",
    "goals": [
      "실패를 처리할 계층과 전파할 정보를 정한다.",
      "예외 변환 시 원인과 맥락을 보존한다.",
      "자원을 연 코드가 종료 책임을 지도록 설계한다."
    ],
    "theory": [
      {
        "heading": "checked 여부와 복구 가능성은 같은 말이 아니다",
        "text": "checked 예외는 처리하거나 throws로 선언해야 하는 컴파일 규칙을 가집니다. 이것만으로 현 계층이 복구할 수 있는지는 결정되지 않습니다. 호출자가 다시 입력할지, 재시도할지, 실패로 종료할지 판단하는 데 필요한 정보를 보존하세요. catch(Exception)으로 모든 실패를 정상값으로 바꾸면 호출자가 결과를 오해할 수 있습니다."
      },
      {
        "heading": "예외를 바꾸더라도 원인을 잃지 않는다",
        "text": "낮은 계층의 예외를 업무 의미의 예외로 변환할 수 있지만 cause를 유지하면 원인 추적이 가능합니다. 민감한 원문 전체를 메시지에 넣는 대신 실패한 작업과 안전한 맥락을 전달합니다. 잘못된 입력과 시스템 장애를 같은 임의 기본값으로 숨기지 마세요. 로그 기록과 사용자 응답도 서로 다른 책임입니다."
      },
      {
        "heading": "자원 해제와 suppressed exception",
        "text": "AutoCloseable 자원은 try-with-resources로 수명을 표현할 수 있습니다. 여러 자원은 선언 역순으로 닫힙니다. 본문과 close가 모두 실패하면 본문 예외가 주 예외가 되고 닫기 실패는 suppressed 예외로 보존될 수 있습니다. 메서드에 전달받은 자원을 누가 닫는지는 소유권 계약으로 명시하세요."
      }
    ],
    "example": {
      "title": "읽기 자원의 수명 명시 · Main.java",
      "code": "class Main {\n    static int readQuantity(String text) throws java.io.IOException {\n        try (java.io.BufferedReader reader =\n                     new java.io.BufferedReader(new java.io.StringReader(text))) {\n            String line = reader.readLine();\n            if (line == null) {\n                throw new IllegalArgumentException(\"quantity is required\");\n            }\n            try {\n                return Integer.parseInt(line);\n            } catch (NumberFormatException cause) {\n                throw new IllegalArgumentException(\"invalid quantity\", cause);\n            }\n        }\n    }\n\n    public static void main(String[] args) throws java.io.IOException {\n        System.out.println(readQuantity(\"12\"));\n        try {\n            readQuantity(\"many\");\n        } catch (IllegalArgumentException failure) {\n            System.out.println(failure.getCause().getClass().getSimpleName());\n        }\n    }\n}",
      "output": "12\nNumberFormatException",
      "explanation": "메서드 내부에서 만든 reader를 try-with-resources가 닫습니다. 숫자 파싱 실패는 입력 계약의 예외로 변환하면서 원본 NumberFormatException을 cause에 보존합니다."
    },
    "quiz": [
      {
        "id": "exceptions-q1",
        "question": "예외를 새 IllegalArgumentException으로 변환할 때 원인 보존에 적합한 방법은?",
        "options": [
          "항상 return 0으로 끝낸다.",
          "catch 블록을 비워 둔다.",
          "원본 예외의 메시지를 지운다.",
          "새 예외 생성자의 cause 인자로 원본 예외를 전달한다."
        ],
        "correctIndex": 3,
        "explanation": "원인 예외를 연결하면 낮은 계층에서 어떤 실패가 발생했는지 확인할 수 있습니다. 정상값을 반환하거나 예외를 삼키면 호출자가 실패와 성공을 구분하기 어렵습니다."
      },
      {
        "id": "exceptions-q2",
        "question": "try-with-resources 본문과 close가 모두 예외를 던졌다면 일반적인 처리 규칙은?",
        "options": [
          "close의 예외만 남고 본문 예외는 사라진다.",
          "본문 예외가 주 예외가 되고 close 실패가 suppressed로 보존될 수 있다.",
          "두 예외 모두 자동으로 무시된다.",
          "항상 프로그램이 컴파일되지 않는다."
        ],
        "correctIndex": 1,
        "explanation": "try-with-resources는 주 예외와 자원 종료 중 발생한 예외를 함께 진단할 수 있도록 suppressed 예외를 사용합니다. 자원 종료가 실패할 수 있다는 사실도 설계해야 합니다."
      }
    ],
    "practice": {
      "title": "환경 설정 입력의 실패 계약",
      "scenario": "설정 파일에서 읽은 포트 값이 잘못되어도 0을 반환해, 실제 원인을 늦게 발견하고 있습니다.",
      "tasks": [
        "입력 부재·형식 오류·범위 오류를 분류하세요.",
        "호출자가 실패를 확실하게 알도록 계약을 바꾸세요.",
        "파싱 실패의 cause가 남는지 검사하세요."
      ],
      "takeaway": "복구하지 못한 실패를 성공처럼 포장하지 않습니다. 예외·자원·진단 정보의 책임을 함께 정합니다."
    },
    "sources": [
      {
        "title": "JDK 8 Tutorial — Exceptions",
        "url": "https://docs.oracle.com/javase/tutorial/essential/exceptions/index.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "JDK 8 Tutorial — try-with-resources",
        "url": "https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 8 API — Throwable",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/lang/Throwable.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java"
    ],
    "exerciseId": "exceptions-lab"
  },
  {
    "id": "streams",
    "title": "Stream: 지연 실행과 부수 효과 없는 집계",
    "description": "짧은 코드보다 실행 시점·순서·공유 상태의 계약을 먼저 봅니다.",
    "track": "both",
    "level": "기본",
    "minVersion": 8,
    "featureSince": 8,
    "preview": false,
    "duration": 40,
    "category": "데이터 처리",
    "goals": [
      "중간 연산과 최종 연산을 구분한다.",
      "소스·파이프라인·결과의 역할을 설명한다.",
      "외부 가변 상태 없이 조건 집계를 구현한다."
    ],
    "theory": [
      {
        "heading": "Stream은 데이터를 저장하는 컬렉션이 아니다",
        "text": "Stream은 소스에서 결과를 만드는 연산 흐름입니다. filter와 map 같은 중간 연산은 지연되며 최종 연산이 파이프라인 평가를 시작합니다. 이미 소비한 Stream을 다시 순회하려고 하지 말고 소스에서 새로 만드세요. 필터·변환·집계 각각이 무엇을 약속하는지 설명할 수 있어야 합니다."
      },
      {
        "heading": "외부 상태 변경은 집계와 다른 책임이다",
        "text": "forEach에서 외부 ArrayList나 일반 카운터를 변경하면 상태 소유권이 흩어지고 병렬 처리에서 문제가 생길 수 있습니다. 결과 수집은 collect, 숫자 집계는 원시형 스트림의 합계처럼 의도가 드러나는 연산을 검토하세요. 콜백은 가능한 한 소스를 바꾸지 않고 입력에 대한 결과를 계산하도록 구성합니다."
      },
      {
        "heading": "병렬화와 API 버전은 별도 판단이다",
        "text": "parallelStream은 자동 성능 개선 스위치가 아닙니다. 작업량, 순서 요구, 공유 상태, 결합 가능한 연산과 실행 환경을 측정해야 합니다. Java 8에서는 collect(Collectors.toList())를 사용합니다. Stream.toList()는 Java 16에서 추가되었고 반환 리스트의 변경 계약도 다르므로 단순 문법 치환으로 취급하지 않습니다."
      }
    ],
    "example": {
      "title": "필터·변환·수집 파이프라인 · Main.java",
      "code": "class Main {\n    public static void main(String[] args) {\n        java.util.List<String> names =\n                java.util.Arrays.asList(\"java\", \"sql\", \"jvm\", \"java\");\n        java.util.List<String> selected = names.stream()\n                .filter(name -> name.startsWith(\"j\"))\n                .distinct()\n                .map(name -> name.toUpperCase(java.util.Locale.ROOT))\n                .collect(java.util.stream.Collectors.toList());\n        System.out.println(selected);\n        System.out.println(names.size());\n    }\n}",
      "output": "[JAVA, JVM]\n4",
      "explanation": "소스의 순서를 따라 j로 시작하는 항목을 고르고 중복 제거 후 대문자로 변환합니다. collect가 최종 연산입니다. 소스 names는 수정하지 않았으므로 크기는 4입니다."
    },
    "quiz": [
      {
        "id": "streams-q1",
        "question": "filter만 연결한 Stream에서 실제 결과를 얻기 위해 필요한 것은?",
        "options": [
          "원본 리스트를 반드시 정렬한다.",
          "최종 연산으로 파이프라인을 평가한다.",
          "항상 parallel로 전환한다.",
          "System.gc를 호출한다."
        ],
        "correctIndex": 1,
        "explanation": "Stream의 중간 연산은 지연됩니다. collect, sum 같은 최종 연산이 결과 계산을 시작합니다. 필요한 모든 요소가 항상 처리된다는 뜻은 아니며 단락 연산도 있습니다."
      },
      {
        "id": "streams-q2",
        "question": "Java 8 대상으로 작성한 예제에 Stream.toList()를 사용하면?",
        "options": [
          "Java 8 표준 API이므로 문제없다.",
          "모든 반환 리스트가 ArrayList로 보장된다.",
          "Java 16에서 추가된 API이므로 Java 8 대상 코드와 맞지 않는다.",
          "동일 Stream을 무제한 재사용할 수 있다."
        ],
        "correctIndex": 2,
        "explanation": "Stream.toList는 Java 16 API입니다. Java 8 대상에서는 지원 API를 사용하고, 반환 컬렉션의 변경 가능성도 별도로 확인해야 합니다."
      }
    ],
    "practice": {
      "title": "집계 배치의 공유 누산기 없애기",
      "scenario": "여러 조건을 거친 정수 값을 외부 변수에 더하는 배치 코드를 읽기 쉽고 검증 가능하게 바꾸려 합니다.",
      "tasks": [
        "필터 조건과 합계의 입력 범위를 분리해 적으세요.",
        "외부 상태 없이 조건에 맞는 값을 집계하세요.",
        "빈 입력·null 요소·중복 값을 처리하는 계약을 확인하세요."
      ],
      "takeaway": "데이터 흐름을 명확하게 만든 뒤 성능을 측정합니다. 짧은 표현이나 병렬화 자체가 설계의 목적은 아닙니다."
    },
    "sources": [
      {
        "title": "Java SE 8 API — Stream",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/stream/Stream.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 8 API — Collectors",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/stream/Collectors.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 17 API — Stream.toList (Since 16)",
        "url": "https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Stream.html#toList()",
        "edition": "Java SE 17; API Since 16",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java"
    ],
    "exerciseId": "streams-lab"
  },
  {
    "id": "concurrency",
    "title": "동시성: JMM, 원자성과 작업 수명",
    "description": "가시성·원자성·완료 대기를 구분하고 스레드 안전성의 근거를 제시합니다.",
    "track": "advanced",
    "level": "심화",
    "minVersion": 8,
    "featureSince": 5,
    "preview": false,
    "duration": 65,
    "category": "동시성과 실행 모델",
    "goals": [
      "원자성·가시성·happens-before를 구분한다.",
      "공유 상태 변경과 작업 완료의 보장을 설명한다.",
      "실패·취소·실행기 종료의 책임을 정한다."
    ],
    "theory": [
      {
        "heading": "보이는 것과 한 번에 처리되는 것은 다르다",
        "text": "JMM은 여러 스레드 사이에서 어떤 읽기 결과가 허용되는지 설명합니다. volatile은 특정 가시성·순서 보장에 쓰지만 count++처럼 읽기·계산·쓰기의 복합 동작을 원자적으로 만들지는 않습니다. 공유 상태가 필요 없는 설계, 불변 데이터, 락 또는 원자 연산 중 요구에 맞는 방법을 선택하세요."
      },
      {
        "heading": "happens-before와 안전한 공개",
        "text": "프로그램 순서만으로 다른 스레드가 언제 값을 볼지 결론내리지 않습니다. 모니터 잠금, volatile, 스레드 시작·종료, 동시성 API의 메모리 일관성 계약을 확인하세요. ExecutorService의 작업 제출과 Future.get도 명시된 관계를 제공합니다. 잠시 sleep한 뒤 값이 맞았다는 관찰은 동기화의 근거가 아닙니다."
      },
      {
        "heading": "작업과 자원의 생명주기를 설계한다",
        "text": "ExecutorService는 작업 제출과 스레드 관리를 분리합니다. 결과를 기다릴지, 실패를 어떻게 알릴지, 언제 종료할지 정해야 합니다. InterruptedException을 처리하고 상위로 인터럽트 의사를 전달할 때는 상태 복원도 검토합니다. AtomicInteger 하나가 안전해도 여러 필드나 DB 행을 함께 변경하는 업무 규칙까지 자동으로 원자적이 되지는 않습니다."
      }
    ],
    "example": {
      "title": "완료 후 읽는 원자 카운터 · Main.java",
      "code": "class Main {\n    public static void main(String[] args) throws Exception {\n        java.util.concurrent.ExecutorService executor =\n                java.util.concurrent.Executors.newFixedThreadPool(2);\n        java.util.concurrent.atomic.AtomicInteger total =\n                new java.util.concurrent.atomic.AtomicInteger();\n        try {\n            java.util.concurrent.Future<?> first = executor.submit(() -> {\n                for (int index = 0; index < 1000; index++) {\n                    total.incrementAndGet();\n                }\n            });\n            java.util.concurrent.Future<?> second = executor.submit(() -> {\n                for (int index = 0; index < 1000; index++) {\n                    total.incrementAndGet();\n                }\n            });\n            first.get();\n            second.get();\n            System.out.println(total.get());\n        } finally {\n            executor.shutdownNow();\n        }\n    }\n}",
      "output": "2000",
      "explanation": "증가에는 원자 연산을 사용하고 두 Future가 완료된 뒤 최종 값을 읽습니다. finally에서 실행기를 종료합니다. 이 예제는 작은 메모리 내 카운터이며 DB 트랜잭션이나 분산 환경의 원자성을 보여 주지는 않습니다."
    },
    "quiz": [
      {
        "id": "concurrency-q1",
        "question": "volatile int count에 여러 스레드가 count++를 수행합니다. 맞는 설명은?",
        "options": [
          "volatile이므로 모든 증가가 원자적이다.",
          "volatile은 메서드 전체를 자동으로 잠근다.",
          "가시성과 별개로 증가 연산의 원자성은 보장되지 않는다.",
          "항상 컴파일 오류가 발생한다."
        ],
        "correctIndex": 2,
        "explanation": "count++는 읽기·계산·쓰기를 포함합니다. volatile의 보장을 복합 연산 전체의 원자성으로 확대하면 안 됩니다. 요구에 맞는 락이나 원자 연산 등이 필요합니다."
      },
      {
        "id": "concurrency-q2",
        "question": "작업 완료를 확인하지 않고 Thread.sleep을 사용한 테스트의 한계는?",
        "options": [
          "sleep 자체가 모든 작업의 완료를 보장한다.",
          "시간이 지났다는 관찰만으로 완료·동기화 계약을 증명할 수 없다.",
          "sleep은 모든 변수를 final로 만든다.",
          "sleep을 두 번 호출하면 어떤 실행 환경에서도 안전하다."
        ],
        "correctIndex": 1,
        "explanation": "작업량과 스케줄링은 달라질 수 있습니다. Future.get, join 등 명시적 완료·동기화 계약을 사용해야 합니다. 반복 성공은 잘못된 동기화의 반례를 없애지 않습니다."
      }
    ],
    "practice": {
      "title": "병렬 작업의 완료·실패·종료 계약",
      "scenario": "배치 카운트가 간헐적으로 작게 나오고 실행기 스레드가 작업 후에도 남습니다.",
      "tasks": [
        "공유 카운터의 원자성 문제와 결과를 너무 일찍 읽는 문제를 분리하세요.",
        "작업을 제출하고 모두 완료된 후 반환하며 실행기를 닫으세요.",
        "인터럽트·작업 실패가 발생했을 때 호출자가 무엇을 관찰할지 설명하세요."
      ],
      "takeaway": "동시성 품질은 반복 테스트 횟수만으로 결정하지 않습니다. 어떤 계약으로 값과 작업의 순서를 보장했는지 설명해야 합니다."
    },
    "sources": [
      {
        "title": "JLS 8 — Threads and Locks / Memory Model",
        "url": "https://docs.oracle.com/javase/specs/jls/se8/html/jls-17.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 8 API — ExecutorService",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ExecutorService.html",
        "edition": "Java SE 8; API Since 5",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 8 API — AtomicInteger",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/atomic/AtomicInteger.html",
        "edition": "Java SE 8; API Since 5",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java"
    ],
    "exerciseId": "concurrency-lab"
  },
  {
    "id": "modern-apis",
    "title": "Java 11: 입력 처리와 표준 HTTP API",
    "description": "새 API의 Since와 호출 계약을 확인하며 Java 8 코드에서의 전환을 판단합니다.",
    "track": "advanced",
    "level": "심화",
    "minVersion": 11,
    "featureSince": 11,
    "preview": false,
    "duration": 40,
    "category": "버전 전환",
    "goals": [
      "strip·isBlank·lines의 입력 처리 계약을 설명한다.",
      "API 최초 도입 버전과 예제 실행 버전을 구분한다.",
      "HTTP 클라이언트의 시간 제한과 실패 경계를 설계한다."
    ],
    "theory": [
      {
        "heading": "문자열 API가 바꾸는 입력 정책",
        "text": "Java 11의 strip, isBlank, lines는 여러 줄 입력 처리의 의도를 표현하는 데 유용합니다. strip과 isBlank는 Character.isWhitespace의 공백 기준을 사용하며, trim의 기준과 같지 않습니다. 모든 시각적 공백 문자를 전부 제거한다는 뜻도 아닙니다. 문자 인코딩과 줄 구분자까지 포함해 어떤 입력을 허용할지 정하세요."
      },
      {
        "heading": "var와 API 도입 버전을 분리한다",
        "text": "지역 변수 타입 추론 var는 Java 10에 도입되었고 람다 매개변수의 var 문법은 Java 11에 추가되었습니다. var는 동적 타입이 아니며 컴파일 시점에 타입이 정해집니다. 이 수업의 String API와 표준 java.net.http.HttpClient는 Java 11이 필요합니다. 본문에 등장하는 기능의 최초 버전과 실제 예제 전체의 최소 대상 버전을 구분합니다."
      },
      {
        "heading": "HTTP는 성공 응답 한 번으로 끝나지 않는다",
        "text": "표준 HttpClient는 동기 send와 비동기 sendAsync를 제공합니다. 연결 시간 제한과 요청 시간 제한은 적용 지점이 다르며, 통신 성공과 업무상 성공 상태 코드도 분리해야 합니다. 자동 재시도는 요청의 멱등성과 중복 처리 위험을 검토한 뒤 적용합니다. 아래 예제는 클라이언트 설정만 만들며 외부 네트워크 호출을 하지 않습니다."
      }
    ],
    "example": {
      "title": "Java 11 API와 명시적 설정 · Main.java",
      "code": "class Main {\n    public static void main(String[] args) {\n        String text = \"  build \\n\\n test  \";\n        long meaningfulLines = text.lines()\n                .map(String::strip)\n                .filter(line -> !line.isBlank())\n                .count();\n        java.net.http.HttpClient client =\n                java.net.http.HttpClient.newBuilder()\n                        .connectTimeout(java.time.Duration.ofSeconds(3))\n                        .build();\n        System.out.println(meaningfulLines);\n        System.out.println(client.connectTimeout().get().getSeconds());\n    }\n}",
      "output": "2\n3",
      "explanation": "빈 줄을 제외하면 의미 있는 줄은 2개입니다. HTTP 클라이언트에 설정한 연결 시간 제한은 3초입니다. 클라이언트를 만들었다는 사실은 어떤 서버 요청이 성공했다는 증거가 아닙니다."
    },
    "quiz": [
      {
        "id": "modern-apis-q1",
        "question": "지역 변수 타입 추론 var의 최초 도입 버전과 성격은?",
        "options": [
          "Java 8의 동적 타입 기능",
          "Java 11에서 처음 도입된 런타임 타입 변경 기능",
          "Java 10의 컴파일 시점 지역 변수 타입 추론",
          "Java 17의 제네릭 제거 기능"
        ],
        "correctIndex": 2,
        "explanation": "지역 변수 var는 Java 10입니다. Java 11은 람다 매개변수에서의 var 문법을 추가했습니다. var를 사용해도 타입은 컴파일 시점에 정해집니다."
      },
      {
        "id": "modern-apis-q2",
        "question": "strip과 trim을 치환하기 전에 확인할 점은?",
        "options": [
          "공백 판정 기준과 대상 Java 버전",
          "두 API가 언제나 모든 문자에서 동일하다는 가정",
          "strip이 원본 String을 제자리 변경한다는 점",
          "strip을 사용하면 네트워크 오류가 사라진다는 점"
        ],
        "correctIndex": 0,
        "explanation": "strip은 Java 11 API이며 trim과 공백 판정 기준이 다릅니다. 입력 정규화가 업무 의미를 바꾸지 않는지 실제 요구와 대조해야 합니다."
      }
    ],
    "practice": {
      "title": "텍스트 설정을 줄 단위 값으로 바꾸기",
      "scenario": "운영자가 여러 줄로 붙여 넣은 항목에서 빈 줄과 앞뒤 공백을 제거해야 합니다.",
      "tasks": [
        "공백·줄 구분자·중복 보존 정책을 명시하세요.",
        "Java 11 API로 의도가 드러나는 변환을 작성하세요.",
        "Java 8 배포 대상에 이 API가 들어갔을 때 어떤 검증이 막아야 하는지 설명하세요."
      ],
      "takeaway": "짧아진 코드를 확인하는 데서 끝내지 않습니다. API 계약과 빌드·런타임 대상이 일치하는지 확인합니다."
    },
    "sources": [
      {
        "title": "Java SE 11 API — String",
        "url": "https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/String.html",
        "edition": "Java SE 11",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 11 API — HttpClient",
        "url": "https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpClient.html",
        "edition": "Java SE 11",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 11 — Local Variable Type Inference",
        "url": "https://docs.oracle.com/en/java/javase/11/language/local-variable-type-inference.html",
        "edition": "Java SE 11; local var Since 10",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java",
      "REST API"
    ],
    "exerciseId": "modern-apis-lab"
  },
  {
    "id": "records-sealed",
    "title": "Java 17: record와 sealed 결과 모델",
    "description": "값의 묶음과 결과 종류를 드러내되 불변성과 확장 제약을 정확히 이해합니다.",
    "track": "advanced",
    "level": "심화",
    "minVersion": 17,
    "featureSince": 17,
    "preview": false,
    "duration": 45,
    "category": "버전 전환",
    "goals": [
      "record가 제공하는 구성 요소와 생성 메서드를 설명한다.",
      "sealed 계층으로 허용된 결과 종류를 제한한다.",
      "Java 17에서 정식인 기능과 preview 기능을 구분한다."
    ],
    "theory": [
      {
        "heading": "record는 투명한 데이터 운반자",
        "text": "record는 구성 요소에 대응하는 final 필드, 접근자, 생성자와 값 기반 equals·hashCode·toString을 제공하는 특별한 클래스입니다. 구성 요소가 가변 리스트라면 record라고 해서 그 리스트까지 깊게 불변이 되지 않습니다. 값의 의미와 유효성 검증을 먼저 정하고 compact constructor나 방어적 복사가 필요한지 검토하세요. record의 정식 도입은 Java 16입니다."
      },
      {
        "heading": "sealed는 확장 가능한 종류를 제한한다",
        "text": "sealed 클래스·인터페이스는 허용된 직접 하위 타입을 제한합니다. 하위 타입은 final, sealed, non-sealed 등 규칙을 따라 확장 정책을 드러냅니다. 예측 가능한 결과의 종류를 모델링할 때 유용하지만 외부 확장을 의도한 API에는 제약 비용이 있습니다. sealed의 정식 도입은 Java 17이므로 두 기능을 함께 쓰는 이 예제의 대상은 17입니다."
      },
      {
        "heading": "모델의 종류와 처리 문법은 별개다",
        "text": "Java 17에서 record와 sealed를 사용할 수 있어도 pattern switch가 정식이라는 뜻은 아닙니다. 본 수업은 Java 17 preview 문법을 쓰지 않습니다. switch 표현식은 Java 14, text block은 15, instanceof 패턴은 16에서 정식 도입되었으며, record pattern과 pattern switch의 정식 학습은 Java 21 수업에서 이어집니다."
      }
    ],
    "example": {
      "title": "닫힌 계산 결과와 record 동등성 · Main.java",
      "code": "class Main {\n    sealed interface Result permits Success, Failure {}\n    record Success(int value) implements Result {}\n    record Failure(String reason) implements Result {}\n\n    static Result doublePositive(int value) {\n        if (value <= 0) {\n            return new Failure(\"positive-required\");\n        }\n        return new Success(Math.multiplyExact(value, 2));\n    }\n\n    public static void main(String[] args) {\n        System.out.println(doublePositive(3).equals(new Success(6)));\n        System.out.println(doublePositive(0));\n    }\n}",
      "output": "true\nFailure[reason=positive-required]",
      "explanation": "Success와 Failure만 Result의 직접 구현으로 허용합니다. 두 Success(6)은 record의 값 동등성으로 같습니다. 이 단순 예제에서 양수의 두 배가 int 범위를 넘으면 Math.multiplyExact가 ArithmeticException을 던집니다."
    },
    "quiz": [
      {
        "id": "records-sealed-q1",
        "question": "record에 가변 ArrayList를 구성 요소로 넣었을 때 맞는 설명은?",
        "options": [
          "record가 리스트와 요소를 자동으로 깊게 복사한다.",
          "record이므로 외부에서 리스트를 절대 바꿀 수 없다.",
          "구성 요소 참조의 final과 참조 대상의 깊은 불변성은 별개다.",
          "record의 equals는 항상 참조 동일성만 비교한다."
        ],
        "correctIndex": 2,
        "explanation": "record가 제공하는 final 필드는 참조의 재할당을 제한합니다. 가변 구성 요소를 공유할지 방어적으로 복사할지는 별도 설계입니다."
      },
      {
        "id": "records-sealed-q2",
        "question": "정식 도입 버전의 조합으로 맞는 것은?",
        "options": [
          "record 17, sealed 21",
          "record 16, sealed 17",
          "record 8, sealed 11",
          "record 11, sealed 16"
        ],
        "correctIndex": 1,
        "explanation": "record는 Java 16, sealed는 Java 17에서 정식 도입되었습니다. 이 수업은 둘을 함께 사용하므로 최소 대상 버전이 17입니다."
      }
    ],
    "practice": {
      "title": "성공과 거절 이유를 타입으로 표현",
      "scenario": "예약 메서드가 true/false만 반환해 재고 부족과 잘못된 수량을 호출자가 구별하기 어렵습니다.",
      "tasks": [
        "성공 결과와 실패 결과의 정보를 정하세요.",
        "record와 sealed로 결과 종류를 모델링하세요.",
        "새 실패 종류를 추가했을 때 호출 코드가 검토해야 할 지점을 설명하세요."
      ],
      "takeaway": "짧은 DTO 선언보다 상태와 결과의 의미를 명확히 하는 것이 먼저입니다. 닫힌 계층이 만드는 변경 비용도 함께 봅니다."
    },
    "sources": [
      {
        "title": "Java SE 17 — Record Classes",
        "url": "https://docs.oracle.com/en/java/javase/17/language/records.html",
        "edition": "Java SE 17; records final Since 16",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 17 — Sealed Classes",
        "url": "https://docs.oracle.com/en/java/javase/17/language/sealed-classes-and-interfaces.html",
        "edition": "Java SE 17; sealed final Since 17",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 21 — Language Changes",
        "url": "https://docs.oracle.com/en/java/javase/21/language/java-language-changes.html",
        "edition": "Java SE 21",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java",
      "Java 17"
    ],
    "exerciseId": "records-sealed-lab"
  },
  {
    "id": "java21",
    "title": "Java 21: 패턴 분기와 가상 스레드",
    "description": "타입별 처리를 명확하게 표현하고 동시성 도구의 적용 조건을 검토합니다.",
    "track": "advanced",
    "level": "심화",
    "minVersion": 21,
    "featureSince": 21,
    "preview": false,
    "duration": 50,
    "category": "버전 전환",
    "goals": [
      "record pattern·when 가드·null 분기를 설명한다.",
      "패턴의 순서와 포괄성의 의미를 이해한다.",
      "가상 스레드를 적용할 작업과 자원 한계를 구분한다."
    ],
    "theory": [
      {
        "heading": "타입과 상태를 함께 드러내는 패턴",
        "text": "Java 21에서 record pattern과 pattern switch가 정식 기능이 되었습니다. record의 구성 요소를 패턴으로 꺼내고 when 가드로 추가 조건을 표현할 수 있습니다. 넓은 패턴이 앞에 오면 뒤의 구체 패턴을 가릴 수 있으므로 지배 관계와 포괄성을 검토하세요. switch가 null을 자동으로 정상 처리한다고 가정하지 말고 의도한 case null을 명시합니다."
      },
      {
        "heading": "가상 스레드는 더 빠른 CPU 스레드가 아니다",
        "text": "가상 스레드는 많은 대기 중심 작업을 다루는 데 도움이 될 수 있지만 CPU 계산 자체를 빠르게 만들지 않습니다. 스레드당 작업 방식과 자원 수명을 이해하고 도입하세요. DB 연결 수나 외부 서비스 허용량은 스레드가 가볍다는 이유로 늘어나지 않으므로 별도 동시성 제한과 시간 제한이 필요합니다."
      },
      {
        "heading": "대상 버전의 실행 특성으로 판단한다",
        "text": "Java 21의 가상 스레드에서는 synchronized 블록 안의 특정 블로킹 작업 등으로 carrier에 고정되는 상황을 고려해야 합니다. 이후 JDK에서 동작이 개선되었다는 사실을 Java 21에 소급하지 않습니다. preview 기능을 섞지 않고 기존 테스트·관측 지표·부하 특성으로 이행 효과를 검증합니다. 아래 예제는 기능 사용을 보여 줄 뿐 성능 벤치마크가 아닙니다."
      }
    ],
    "example": {
      "title": "패턴 분기 작업을 실행하고 기다리기 · Main.java",
      "code": "class Main {\n    record Job(String name, int attempts) {}\n\n    static String label(Object value) {\n        return switch (value) {\n            case Job(String name, int attempts) when attempts > 0 ->\n                    name + \":\" + attempts;\n            case Job job -> \"not-started\";\n            case null -> \"missing\";\n            default -> \"unknown\";\n        };\n    }\n\n    public static void main(String[] args) throws Exception {\n        try (java.util.concurrent.ExecutorService executor =\n                     java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {\n            java.util.concurrent.Future<String> result =\n                    executor.submit(() -> label(new Job(\"sync\", 2)));\n            System.out.println(result.get());\n            System.out.println(label(null));\n        }\n    }\n}",
      "output": "sync:2\nmissing",
      "explanation": "패턴과 가드로 Job의 상태를 분류합니다. 가상 스레드 실행기에 작업을 제출한 뒤 Future로 결과를 기다리고 try-with-resources로 실행기 수명을 관리합니다. 모든 문법·API는 Java 21 정식 기능입니다."
    },
    "quiz": [
      {
        "id": "java21-q1",
        "question": "가상 스레드에 대한 설명으로 가장 적절한 것은?",
        "options": [
          "CPU 연산은 플랫폼 스레드보다 항상 빠르다.",
          "I/O 대기가 많은 동시 작업에 도움이 될 수 있지만 외부 자원의 한계는 별도로 관리해야 한다.",
          "가상 스레드를 쓰면 DB 연결 풀의 제한이 사라진다.",
          "동기화와 취소 처리를 모두 생략할 수 있다."
        ],
        "correctIndex": 1,
        "explanation": "가상 스레드는 많은 대기 작업의 처리 규모를 지원하는 도구입니다. 작업 자체의 CPU 속도나 DB·외부 시스템의 수용량을 자동으로 높이지 않습니다."
      },
      {
        "id": "java21-q2",
        "question": "case Order(String id, int quantity) when quantity > 0 의 의미는?",
        "options": [
          "모든 Object가 조건 없이 일치한다.",
          "Order의 모든 필드를 변경한다.",
          "Order 패턴에 맞고 quantity > 0도 만족해야 일치한다.",
          "Java 8에서 같은 문법을 사용할 수 있다."
        ],
        "correctIndex": 2,
        "explanation": "패턴 일치와 가드의 참 조건을 모두 만족해야 합니다. record pattern과 pattern switch는 이 수업의 Java 21 정식 문법입니다."
      }
    ],
    "practice": {
      "title": "버전 상향의 효과와 위험 설명",
      "scenario": "Java 17 서비스의 타입 분기를 단순화하고 대기 중심 호출의 실행 모델을 검토하려 합니다.",
      "tasks": [
        "패턴 분기에서 null·알 수 없는 타입·경계 상태를 테스트하세요.",
        "가상 스레드 적용 전후 비교에 필요한 대기·CPU·외부 자원 지표를 정하세요.",
        "외부 연결 수 제한과 취소·종료 정책을 설명하세요."
      ],
      "takeaway": "새 기능을 사용했다는 사실과 서비스가 개선되었다는 증거를 구분합니다. 버전별 계약과 실제 작업 특성으로 판단합니다."
    },
    "sources": [
      {
        "title": "Java SE 21 — Pattern Matching for switch",
        "url": "https://docs.oracle.com/en/java/javase/21/language/pattern-matching-switch.html",
        "edition": "Java SE 21",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 21 — Record Patterns",
        "url": "https://docs.oracle.com/en/java/javase/21/language/record-patterns.html",
        "edition": "Java SE 21",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 21 — Virtual Threads",
        "url": "https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html",
        "edition": "Java SE 21",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java",
      "Java 21"
    ],
    "exerciseId": "java21-lab"
  },
  {
    "id": "testing-design",
    "title": "테스트 설계: 계약과 경계 결함 구별",
    "description": "테스트가 통과한다는 사실보다 잘못된 구현을 실제로 구별하는지 확인합니다.",
    "track": "both",
    "level": "심화",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 45,
    "category": "실패와 검증",
    "goals": [
      "사례를 정상·경계·실패로 나눠 계약을 검증한다.",
      "결정적 계산과 외부 환경 의존을 분리한다.",
      "잘못된 구현을 통해 테스트의 판별력을 점검한다."
    ],
    "theory": [
      {
        "heading": "테스트는 구현을 복사하지 않는다",
        "text": "메서드 내부의 조건문을 그대로 기대값 계산에 복사하면 같은 결함을 테스트에도 넣을 수 있습니다. 요구사항에서 기대 행동을 먼저 정하고 경계 바로 아래·경계·경계 위를 선택하세요. 대표값 검사가 전체 입력 공간에 대한 수학적 증명은 아니라는 점도 구분합니다."
      },
      {
        "heading": "테스트 가능성은 의존 관계와 연결된다",
        "text": "현재 시간, 임의 값, 네트워크와 DB를 계산 로직에 직접 결합하면 재현하기 어렵습니다. 순수 계산과 외부 의존을 분리하고 필요한 경계에 협력 객체를 주입하세요. 대역을 사용한 단위 검사는 실제 통합 환경의 계약 검사를 대체하지 않습니다. 테스트마다 같은 입력과 조건으로 실행할 수 있도록 설계합니다."
      },
      {
        "heading": "좋은 테스트는 잘못된 구현을 거절한다",
        "text": "정상 구현만 통과하는지 보는 데서 멈추지 않고 >=를 >로 바꾸거나 음수 검증을 누락한 구현을 넣어 보세요. 실제 실무에서는 JUnit 등의 테스트 도구가 실패 위치·메시지·실행을 지원합니다. 이 수업은 외부 의존성 없는 Java로 판별력의 원리를 연습하며 JUnit을 실행했다고 표시하지 않습니다."
      }
    ],
    "example": {
      "title": "기대값을 명시하는 작은 계약 검사 · Main.java",
      "code": "class Main {\n    static int shippingFee(int subtotal) {\n        if (subtotal < 0) {\n            throw new IllegalArgumentException(\"negative subtotal\");\n        }\n        return subtotal >= 30000 ? 0 : 3000;\n    }\n\n    static void check(int expected, int actual) {\n        if (expected != actual) {\n            throw new AssertionError(\"expected=\" + expected + \", actual=\" + actual);\n        }\n    }\n\n    public static void main(String[] args) {\n        check(3000, shippingFee(29999));\n        check(0, shippingFee(30000));\n        check(0, shippingFee(30001));\n        try {\n            shippingFee(-1);\n            throw new AssertionError(\"negative input must fail\");\n        } catch (IllegalArgumentException expected) {\n            // Expected contract failure.\n        }\n        System.out.println(\"4 contract checks passed\");\n    }\n}",
      "output": "4 contract checks passed",
      "explanation": "무료 배송 경계의 양옆과 음수 실패 계약을 직접 검사합니다. -ea 옵션에 의존하는 assert 문 대신 실패 시 AssertionError를 던지므로 검사가 항상 실행됩니다. 실제 테스트 도구를 대체하려는 구현은 아닙니다."
    },
    "quiz": [
      {
        "id": "testing-design-q1",
        "question": "무료 배송 조건이 subtotal >= 30000일 때 경계 결함을 잘 구별하는 입력 묶음은?",
        "options": [
          "1000, 2000, 3000",
          "0 하나만",
          "29999, 30000, 30001",
          "항상 100000만"
        ],
        "correctIndex": 2,
        "explanation": "경계 바로 아래·경계·경계 위를 검사하면 >와 >=의 차이 등을 드러낼 수 있습니다. 다른 입력·실패 조건도 별도 요구에 따라 추가합니다."
      },
      {
        "id": "testing-design-q2",
        "question": "정상 구현과 의도적으로 틀린 구현이 모두 테스트를 통과했다면?",
        "options": [
          "테스트가 더 유연하므로 항상 좋은 결과다.",
          "테스트가 해당 결함을 구별하지 못하므로 기대값·입력·검사 여부를 검토해야 한다.",
          "틀린 구현도 자동으로 올바른 계약이 된다.",
          "테스트 실행 횟수만 늘리면 모든 설계 문제가 해결된다."
        ],
        "correctIndex": 1,
        "explanation": "테스트는 중요한 결함을 드러내야 합니다. 입력 선정, 기대값, 실제 assertion의 실행 여부를 확인하고 그 결함을 재현하는 검사를 보완합니다."
      }
    ],
    "practice": {
      "title": "배송비 정책을 검증하는 테스트 작성",
      "scenario": "무료 배송 경계를 잘못 바꾼 구현이 기존 테스트를 통과했습니다.",
      "tasks": [
        "정상·경계·실패 대표값을 기대 결과와 함께 정하세요.",
        "정상 구현은 수용하고 경계가 틀린 구현은 거절하는 검사 함수를 만드세요.",
        "실무 도구로 옮길 때 필요한 실패 메시지와 단위·통합 검사 범위를 설명하세요."
      ],
      "takeaway": "실행 성공과 계약 검증, 설계 설명은 서로 다른 결과입니다. 테스트가 어떤 결함을 찾는지 근거를 남깁니다."
    },
    "sources": [
      {
        "title": "Java SE 8 API — IntUnaryOperator",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/util/function/IntUnaryOperator.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "JUnit 5 User Guide — Writing Tests",
        "url": "https://docs.junit.org/5.11.4/user-guide/",
        "edition": "JUnit 5.11.4; 후속 실무 도구 참고",
        "checkedAt": "2026-10-12"
      },
      {
        "title": "Java SE 8 API — AssertionError",
        "url": "https://docs.oracle.com/javase/8/docs/api/java/lang/AssertionError.html",
        "edition": "Java SE 8",
        "checkedAt": "2026-10-12"
      }
    ],
    "jobTags": [
      "Java",
      "JUnit"
    ],
    "exerciseId": "testing-design-lab"
  }
];
