// Original Korean learning content. Each example is a standalone Main.java.
export const lessons = [
  {
    "id": "java-basics",
    "title": "Java의 값 전달과 객체 동등성",
    "description": "메서드에서 값을 바꿨는데 호출한 쪽의 값은 왜 다를까요? 변수 재할당·객체 변경·내용 비교를 예제의 출력으로 구분합니다.",
    "track": "transition",
    "level": "전환",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 35,
    "category": "Java 사고 모델",
    "goals": [
      "update(box) 뒤 값이 99가 아닌 15인 이유를 변수와 객체로 나눠 설명한다.",
      "두 String의 ==와 equals 결과가 다른 이유를 설명한다.",
      "null인 Integer를 계산할 때 발생하는 실패를 예상한다."
    ],
    "theory": [
      {
        "heading": "객체도 값으로 전달된다",
        "text": "예제의 main과 update에는 이름이 같은 box 변수가 각각 있습니다. 호출할 때 복사되는 것은 객체 자체가 아니라 그 객체를 가리키는 참조값입니다. 그래서 update의 box.value += 10은 두 변수가 함께 보는 기존 Box를 바꿉니다. 반면 box = new Box(99)는 update 안의 변수만 새 객체를 가리키게 합니다. 이를 값 전달이라고 합니다. int도 같은 규칙을 따라 replaceNumber 안에서 99를 대입해도 main의 number는 5입니다."
      },
      {
        "heading": "같은 객체와 같은 내용",
        "text": "main은 내용이 java인 String을 두 번 new로 만듭니다. left == right는 ‘같은 객체인가’를 물으므로 false이고, left.equals(right)는 String의 문자 내용을 비교하므로 true입니다. Objects.equals는 한쪽이나 양쪽이 null인 경우까지 다룹니다. 직접 만든 상품 타입에서는 무엇이 같아야 같은 상품인지 먼저 정해야 합니다. equals를 바꾼다면 equals가 true인 객체는 같은 hashCode를 갖도록 맞추세요. DB 식별자로 비교할지 모든 필드로 비교할지는 업무 요구에 따라 다릅니다."
      },
      {
        "heading": "boxing은 null과 타입 변환을 숨길 수 있다",
        "text": "boxing은 int 값을 Integer 객체 형태로 다루는 변환이고, unboxing은 Integer에서 int 값을 꺼내는 변환입니다. count가 null인데 count + 1을 계산하면 꺼낼 int 값이 없어 NullPointerException이 납니다. Integer의 ==를 숫자 내용 비교로 사용하지 말고, 먼저 null을 오류·기본값·값 없음 중 무엇으로 볼지 정하세요. 정수 나눗셈이나 작은 타입으로의 변환도 호출자가 예상할 결과에 영향을 줍니다."
      }
    ],
    "example": {
      "title": "참조 복사와 객체 변경 · Main.java",
      "code": "class Main {\n    static class Box {\n        int value;\n        Box(int value) { this.value = value; }\n    }\n\n    static void replaceNumber(int value) {\n        value = 99;\n    }\n\n    static void update(Box box) {\n        box.value += 10;\n        box = new Box(99);\n    }\n\n    public static void main(String[] args) {\n        int number = 5;\n        Box box = new Box(5);\n        replaceNumber(number);\n        update(box);\n        String left = new String(\"java\");\n        String right = new String(\"java\");\n        System.out.println(number);\n        System.out.println(box.value);\n        System.out.println(left == right);\n        System.out.println(left.equals(right));\n    }\n}",
      "output": "5\n15\nfalse\ntrue",
      "explanation": "출력은 5, 15, false, true입니다. replaceNumber는 자신이 받은 숫자 복사본만 99로 바꾸므로 number는 5입니다. update는 기존 Box의 필드를 15로 바꾼 뒤 자신의 box만 새 객체로 돌립니다. main의 box는 여전히 기존 객체를 봅니다. left와 right는 서로 다른 String이지만 내용은 같습니다."
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
        "explanation": "호출자의 변수와 매개변수 x는 별개입니다. x에 새 객체를 넣어도 호출자의 참조는 그대로입니다. 예제의 update에서 box = new Box(99)와 box.value += 10이 서로 다른 결과를 만드는 이유입니다."
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
        "explanation": "count + 1을 계산하려면 count에서 int 값을 꺼내야 합니다. null에는 꺼낼 값이 없어 실행 중 NullPointerException이 납니다. 컴파일 가능 여부와 실행 시 값의 유효성은 별도로 확인해야 합니다."
      }
    ],
    "practice": {
      "title": "외부 입력의 동등성 계약 정하기",
      "scenario": "외부 시스템의 상품 코드 두 개가 모두 같은 문자열인데 == 비교는 false입니다. 어떤 요청은 코드가 null이고, 어떤 요청은 앞뒤 공백을 포함합니다.",
      "tasks": [
        "같은 코드의 기준을 대소문자·공백·null 정책으로 명시하세요.",
        "참조 비교로 생기는 결함을 재현하고 내용 비교로 수정하세요.",
        "정규화가 원본 식별자의 의미를 바꿀 수 있는 사례를 하나 설명하세요."
      ],
      "takeaway": "같은 상품 코드의 기준을 정한 뒤 비교하세요. 공백 제거·대소문자 변환·null 대체는 편의 기능이지만, 원래 다른 식별자를 같은 것으로 만들 수도 있습니다."
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
    "exerciseId": "java-basics-lab",
    "learningGuide": {
      "scenario": "main에서 Box(5)를 update에 넘깁니다. 메서드 마지막에는 Box(99)를 대입했는데, 호출 뒤 출력은 15입니다.",
      "question": "같은 box에 쓰는 두 줄인데, 왜 한 줄의 변경만 호출한 쪽에 남을까요?",
      "terms": [
        {
          "term": "참조값",
          "meaning": "어떤 객체를 가리키는 값. box 변수와 Box 객체는 구별합니다."
        },
        {
          "term": "값 전달",
          "meaning": "호출한 쪽의 변수값을 매개변수에 복사하는 규칙. 참조값도 복사됩니다."
        },
        {
          "term": "재할당과 객체 변경",
          "meaning": "box = ...는 변수의 참조값을 바꾸고, box.value = ...는 참조가 가리키는 객체의 필드를 바꿉니다."
        }
      ],
      "walkthrough": [
        "main의 box가 가리키는 Box의 value는 5입니다. update의 매개변수 box도 같은 객체를 가리키며 시작합니다.",
        "box.value += 10은 그 기존 객체의 value를 15로 바꿉니다.",
        "box = new Box(99)는 update 안의 box만 새 객체로 돌립니다. main의 box에 대입한 것이 아닙니다.",
        "update가 끝나면 main은 기존 Box를 계속 가리키므로 box.value에서 15를 읽습니다."
      ],
      "prediction": {
        "question": "update(box) 호출 뒤 main의 box.value는 5, 15, 99 중 무엇일까요?",
        "answer": "15입니다.",
        "explanation": "기존 객체의 필드 변경은 남지만, 매개변수 재할당은 호출자의 변수를 바꾸지 않습니다. 두 대입의 대상이 다릅니다."
      },
      "takeaway": "메서드가 객체를 바꾼 것인지, 자신의 변수가 가리키는 대상을 바꾼 것인지부터 확인하면 변경이 사라진 것처럼 보이는 버그를 설명할 수 있습니다.",
      "code": {
        "file": "examples/java8/java-basics/Main.java",
        "source": "    static void update(Box box) {\n        box.value += 10;\n        box = new Box(99);\n    }"
      }
    }
  },
  {
    "id": "oop",
    "title": "OOP: 책임과 불변식을 객체에 두기",
    "description": "잔액 100에서 40을 쓰고 70을 다시 요청합니다. 거절 뒤에도 잔액이 60으로 남도록 상태 변경 규칙을 객체 안에 모읍니다.",
    "track": "both",
    "level": "심화",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 50,
    "category": "객체 설계",
    "goals": [
      "‘잔액은 항상 0 이상’처럼 객체가 지켜야 할 상태 규칙을 정한다.",
      "생성 시 검사와 사용 중 검사를 구분하고, 실패 후 상태가 그대로인지 확인한다.",
      "필드·컬렉션을 외부에 노출했을 때 규칙을 우회할 수 있는 경로를 찾는다."
    ],
    "theory": [
      {
        "heading": "캡슐화는 private 필드보다 넓다",
        "text": "Credit의 balance는 private이지만, 이것만으로 잔액 규칙이 완성되지는 않습니다. 아무 숫자나 넣는 setBalance가 공개되어 있다면 음수도 들어갈 수 있습니다. 예제는 생성자가 음수 초기값을 거절하고, 잔액 변경은 spend에서만 처리하도록 합니다. 이렇게 상태를 바꿀 수 있는 경로와 그 규칙을 함께 관리하는 것이 캡슐화입니다. balance()는 값을 알려 주고, spend는 요청을 검사한 뒤 상태를 바꿉니다."
      },
      {
        "heading": "불변식과 실패의 원자성",
        "text": "불변식은 객체가 유효한 상태에서 항상 지켜야 하는 규칙입니다. Credit에서는 balance가 0 이상이어야 합니다. spend(40)는 100을 60으로 바꾸지만, 이어진 spend(70)는 차감 전에 false를 반환해 60을 보존합니다. 실패했을 때 일부 변경만 남기지 않는 성질을 여기서는 실패의 원자성이라고 부릅니다. 먼저 차감한 뒤 부족함을 발견하는 순서라면 이 규칙을 놓치기 쉽습니다. 이 예제는 단일 객체의 단일 스레드 동작이며, 동시 호출이나 DB 트랜잭션까지 보장하지 않습니다."
      },
      {
        "heading": "불변 객체와 협력 경계",
        "text": "final List 필드는 다른 리스트로 재할당하지 못하게 할 뿐, 그 리스트의 add까지 금지하지는 않습니다. 객체가 내부 목록을 그대로 반환하면 호출자가 내용을 바꿔 객체의 규칙을 우회할 수 있습니다. 변경 불가 뷰를 줄지, 목록을 복사할지, 목록 안의 요소도 변경 가능한지 나눠 판단하세요. ‘모든 것을 불변으로 만들기’보다 어떤 객체가 변경을 담당하는지 분명히 하는 것이 목표입니다. 서비스·저장소·도메인 객체의 역할도 같은 기준으로 검토합니다."
      }
    ],
    "example": {
      "title": "잔액 규칙을 지키는 객체 · Main.java",
      "code": "class Main {\n    static final class Credit {\n        private int balance;\n\n        Credit(int initialBalance) {\n            if (initialBalance < 0) {\n                throw new IllegalArgumentException(\"negative balance\");\n            }\n            balance = initialBalance;\n        }\n\n        boolean spend(int amount) {\n            if (amount <= 0 || amount > balance) {\n                return false;\n            }\n            balance -= amount;\n            return true;\n        }\n\n        int balance() { return balance; }\n    }\n\n    public static void main(String[] args) {\n        Credit credit = new Credit(100);\n        System.out.println(credit.spend(40));\n        System.out.println(credit.spend(70));\n        System.out.println(credit.balance());\n    }\n}",
      "output": "true\nfalse\n60",
      "explanation": "생성자가 잔액 100을 받아 시작합니다. spend(40)는 검사를 통과해 60을 저장하고 true를 반환합니다. spend(70)는 amount > balance에서 false를 반환하므로 차감 줄에 도달하지 않습니다. 마지막 balance()는 그대로 60입니다. 잔액을 직접 넣는 setter 대신 ‘사용 요청’ 메서드가 검증과 변경을 함께 담당합니다."
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
        "explanation": "private은 직접 접근을 제한하지만 setStock(-1)이 허용되면 공개 메서드로 음수 상태를 만들 수 있습니다. 생성자와 이후 변경 메서드 모두에서 ‘재고는 0 이상’이라는 규칙을 지켜야 합니다."
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
        "explanation": "final이 막는 것은 names에 다른 리스트를 대입하는 일입니다. 현재 리스트가 ArrayList처럼 변경을 허용하면 add는 가능합니다. 요소까지 불변인지, 여러 작업을 묶어 안전하게 처리하는지는 별도 문제입니다."
      }
    ],
    "practice": {
      "title": "예약 도메인의 상태 변경 경로 줄이기",
      "scenario": "예약 실패가 반환됐는데 재고는 이미 줄어 있습니다. 여러 서비스가 재고 값을 직접 설정해 어떤 경로에서 잘못된 상태가 생겼는지 찾기 어렵습니다.",
      "tasks": [
        "생성·예약·취소 각각의 사전조건과 사후조건을 적으세요.",
        "호출자가 규칙을 우회하는 setter와 가변 컬렉션 노출을 찾으세요.",
        "실패한 예약 뒤 상태가 유지되는 테스트를 먼저 제시하세요."
      ],
      "takeaway": "상태를 바꾸는 코드를 한곳으로 모으고, 성공 뒤 값뿐 아니라 거절 뒤 보존할 값도 테스트하세요. 상태 규칙의 책임이 분명해져야 호출자도 실패를 다룰 수 있습니다."
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
    "exerciseId": "oop-lab",
    "learningGuide": {
      "scenario": "잔액 100인 Credit에 40 사용을 요청한 뒤 70 사용을 요청합니다. 두 번째 요청이 실패해도 첫 번째 결과인 잔액 60은 유지해야 합니다.",
      "question": "spend는 어느 줄까지 실행해야 실패 뒤에도 잔액을 지킬 수 있을까요?",
      "terms": [
        {
          "term": "캡슐화",
          "meaning": "필드를 숨기는 것과 함께, 상태를 바꿀 수 있는 경로와 규칙을 객체 안에서 관리하는 것."
        },
        {
          "term": "불변식",
          "meaning": "객체가 항상 지켜야 하는 상태 규칙. 여기서는 balance가 0 이상이어야 합니다."
        },
        {
          "term": "실패의 원자성",
          "meaning": "작업이 실패했을 때 일부 변경만 남지 않도록 하는 것. 여기서는 거절 시 기존 잔액을 유지합니다."
        }
      ],
      "walkthrough": [
        "첫 spend(40) 호출은 amount가 양수이고 balance 100 이하이므로 if를 통과합니다.",
        "balance -= amount에서 잔액을 60으로 저장하고 true를 반환합니다.",
        "다음 spend(70) 호출은 70 > 60이므로 if 안에서 false를 반환합니다.",
        "거절 경로는 balance -= amount에 도달하지 않습니다. 그래서 실패 후에도 잔액 60을 읽을 수 있습니다."
      ],
      "prediction": {
        "question": "두 번의 spend가 끝난 뒤 성공 여부와 잔액은 무엇일까요?",
        "answer": "true, false, 잔액 60입니다.",
        "explanation": "검사가 변경보다 먼저입니다. 두 번째 요청은 검증 단계에서 끝나므로 70을 차감한 흔적이 남지 않습니다."
      },
      "takeaway": "예약·차감·취소 메서드는 실패 메시지만 확인하지 말고, 거절 뒤 어떤 필드가 그대로 남아야 하는지도 확인하세요.",
      "code": {
        "file": "examples/java8/oop/Main.java",
        "source": "        boolean spend(int amount) {\n            if (amount <= 0 || amount > balance) {\n                return false;\n            }\n            balance -= amount;\n            return true;\n        }"
      }
    }
  },
  {
    "id": "polymorphism",
    "title": "OOP: 다형성, 계약과 합성",
    "description": "Report의 render는 그대로 두고 출력 형식만 바꿉니다. 다른 구현을 끼워 넣어도 호출자가 기대하는 입력·결과를 지키는지 살펴봅니다.",
    "track": "both",
    "level": "심화",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 55,
    "category": "객체 설계",
    "goals": [
      "Report가 구체적인 Formatter 종류를 검사하지 않아도 동작하는 이유를 설명한다.",
      "새 구현이 기존에 허용하던 입력과 결과 약속을 깨뜨리는지 확인한다.",
      "상속·합성·인터페이스 추가의 이득과 읽기 비용을 실제 변경 요청으로 비교한다."
    ],
    "theory": [
      {
        "heading": "교체 가능성에는 행동 계약이 필요하다",
        "text": "Report는 Formatter의 format을 호출합니다. 구현을 바꿔도 같은 메서드 이름으로 요청할 수 있는 것이 다형성입니다. 하지만 타입이 같다고 업무 행동까지 같아지는 것은 아닙니다. 예를 들어 0 이상 금액을 받던 정책을 10000 이상만 받는 정책으로 바꾸면 기존 호출이 실패합니다. 입력 조건, 반환 결과, 예외, 외부 상태 변경까지 호출자가 기대할 수 있는 약속을 행동 계약이라고 부릅니다. LSP는 이런 교체가 기존 호출을 깨뜨리지 않는지 검토하는 원칙입니다."
      },
      {
        "heading": "상속과 합성은 변경 이유로 선택한다",
        "text": "Report는 Formatter를 상속하지 않고 필드에 보관해 일을 맡깁니다. 필요한 객체를 조합하는 이 방식이 합성입니다. 출력 형식이 늘어도 Report의 render는 그대로 두고 Formatter를 바꿀 수 있습니다. 상속은 상위 클래스의 구현과 확장 규칙을 함께 받아들이므로 변경 영향이 다릅니다. 반대로 교체할 필요가 없는 작은 기능마다 인터페이스를 만들면 찾아갈 파일만 늘 수 있습니다. SOLID는 인터페이스 개수를 늘리는 규칙이 아니라 변경 영향과 책임을 검토하는 관점으로 사용하세요."
      },
      {
        "heading": "수동 의존성 주입에서 실행 원리 이해하기",
        "text": "main이 ‘어떤 Formatter를 쓸지’를 선택하고 생성자로 Report에 넘깁니다. Report는 ‘받은 Formatter를 사용하기’만 합니다. 사용할 객체를 외부에서 전달하는 것을 의존성 주입이라고 합니다. 테스트에서는 같은 계약을 지키는 단순한 구현을 넣어 외부 환경을 통제할 수 있습니다. 예제는 사람이 main에서 조립하는 순수 Java 코드입니다. Spring의 컨테이너·프록시·AOP를 실행한 것이 아니며, 후속 과정에서는 누가 조립하고 어떤 경로로 호출하는지 비교합니다."
      }
    ],
    "example": {
      "title": "출력 정책을 조합하는 객체 · Main.java",
      "code": "class Main {\n    interface Formatter {\n        String format(String value);\n    }\n\n    static final class Report {\n        private final Formatter formatter;\n\n        Report(Formatter formatter) {\n            this.formatter = java.util.Objects.requireNonNull(formatter);\n        }\n\n        String render(String value) {\n            return formatter.format(value);\n        }\n    }\n\n    public static void main(String[] args) {\n        Report bracketed = new Report(value -> \"[\" + value + \"]\");\n        Report prefixed = new Report(value -> \"report:\" + value);\n        System.out.println(bracketed.render(\"stock\"));\n        System.out.println(prefixed.render(\"stock\"));\n    }\n}",
      "output": "[stock]\nreport:stock",
      "explanation": "bracketed와 prefixed는 둘 다 Report입니다. 생성자에 전달한 람다만 달라 첫 객체는 [stock], 두 번째 객체는 report:stock을 만듭니다. render는 formatter.format(value) 한 줄로 위임하며 포맷터 종류를 검사하지 않습니다. requireNonNull은 협력 객체 자체가 빠진 구성을 생성 시 거절합니다. 람다는 Java 8에서 지원합니다."
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
        "explanation": "기존 호출자는 0부터 9999까지도 유효한 입력이라고 믿고 사용했습니다. 새 구현이 이 범위를 거절하면 인터페이스가 같아도 교체 때문에 기존 기능이 깨집니다. 이를 입력 조건을 더 강하게 요구한 문제로 설명할 수 있습니다."
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
        "explanation": "출력 형식을 실제로 교체해야 하는 Report에는 합성이 도움이 됩니다. 그러나 교체 요구가 없는 한 줄짜리 계산까지 분리하면 이해해야 할 파일이 늘어납니다. 변경 이유와 테스트 요구가 그 비용을 정당화하는지 판단합니다."
      }
    ],
    "practice": {
      "title": "할인 정책 변경 요청 대응",
      "scenario": "결제 모듈의 정액 할인에 비율 할인과 기간 한정 할인이 추가됩니다. 할인 종류마다 결제 코드를 바꾸다 보니 음수 할인이나 결제액보다 큰 할인을 놓칩니다.",
      "tasks": [
        "정책이 반환할 할인액의 허용 범위와 실패 조건을 정하세요.",
        "정책 종류를 검사하는 조건문 없이 교체 가능한 협력을 만드세요.",
        "새 정책의 계약 위반을 잡는 테스트와 추상화 비용을 설명하세요."
      ],
      "takeaway": "정책을 교체하기 전에 허용 입력·할인액 범위·실패 조건을 공통으로 정하세요. 같은 타입으로 호출할 수 있다는 사실과 기존 기능을 깨뜨리지 않는다는 사실은 다릅니다."
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
    "exerciseId": "polymorphism-lab",
    "learningGuide": {
      "scenario": "같은 stock 내용을 화면에서는 [stock], 로그에서는 report:stock으로 표시하려고 합니다. Report의 본문 처리까지 두 벌로 복사하고 싶지는 않습니다.",
      "question": "Report는 Formatter의 구체적인 종류를 모르는데 어떻게 서로 다른 결과를 만들까요?",
      "terms": [
        {
          "term": "다형성",
          "meaning": "같은 타입과 메서드로 요청하되, 연결된 구현에 따라 다른 동작을 수행하는 것."
        },
        {
          "term": "합성",
          "meaning": "상속으로 기능을 가져오는 대신 필요한 객체를 필드에 두고 일을 맡기는 방식."
        },
        {
          "term": "의존성 주입",
          "meaning": "사용할 협력 객체를 내부에서 고르지 않고 생성자 같은 외부 경로로 받는 것."
        },
        {
          "term": "행동 계약",
          "meaning": "호출자가 기대해도 되는 입력 조건·결과·실패·상태 변경의 약속."
        }
      ],
      "walkthrough": [
        "Report 생성자는 전달받은 formatter를 필드에 저장합니다. requireNonNull은 null인 협력 객체를 거절합니다.",
        "전체 예제의 main은 대괄호를 붙이는 람다와 report:를 붙이는 람다를 서로 다른 Report에 넣습니다.",
        "render(\"stock\")는 현재 Report가 가진 formatter의 format에 stock을 전달합니다.",
        "같은 render 코드라도 연결된 람다가 다르므로 [stock]과 report:stock이 각각 반환됩니다."
      ],
      "prediction": {
        "question": "두 Report에서 render 구현이 같다면 출력도 반드시 같을까요?",
        "answer": "아닙니다. 각각 [stock]과 report:stock을 출력합니다.",
        "explanation": "render가 요청하는 메서드 계약은 같지만 실제 처리를 맡은 Formatter가 다릅니다. 선택은 main에서, 사용은 Report에서 이루어집니다."
      },
      "takeaway": "할인·알림·포맷 정책을 바꿀 때 호출 코드의 조건문을 늘리기 전에, 교체할 부분을 협력 객체로 넘길 수 있는지 확인하세요.",
      "code": {
        "file": "examples/java8/polymorphism/Main.java",
        "source": "    static final class Report {\n        private final Formatter formatter;\n\n        Report(Formatter formatter) {\n            this.formatter = java.util.Objects.requireNonNull(formatter);\n        }\n\n        String render(String value) {\n            return formatter.format(value);\n        }\n    }"
      }
    }
  },
  {
    "id": "collections",
    "title": "컬렉션: 순서, 동등성과 변경 계약",
    "description": "원본 목록의 첫 값을 바꿨는데 복사본에는 이전 값이 남습니다. 순서·중복·해시와 함께 뷰와 복사본의 차이를 코드로 확인합니다.",
    "track": "both",
    "level": "기본",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 40,
    "category": "타입과 데이터",
    "goals": [
      "counts가 java를 두 번 세는 과정을 키 조회와 값 갱신으로 설명한다.",
      "같은 키의 기준인 equals와 hashCode가 어긋나면 조회가 깨질 수 있음을 설명한다.",
      "unmodifiableList로 감싸는 것과 그 전에 ArrayList로 복사하는 것을 구분한다."
    ],
    "theory": [
      {
        "heading": "인터페이스와 구현이 약속하는 것",
        "text": "예제의 tags에는 java가 두 번 들어 있습니다. List는 위치가 있고 중복도 허용하므로 이 입력을 그대로 담습니다. counts는 태그를 키, 개수를 값으로 연결하는 Map이며, Map은 Collection의 하위 인터페이스가 아닙니다. 중복 없는 값 자체가 필요하면 Set을 검토합니다. 순회 순서도 별도로 정해야 합니다. HashMap의 순서를 믿지 말고, 처음 등장한 순서를 유지해야 하는 중복 제거라면 LinkedHashSet처럼 그 순서를 약속하는 구현을 선택하세요."
      },
      {
        "heading": "동등성과 해시의 계약",
        "text": "counts.get(\"java\")가 기존 항목을 찾으려면 키의 ‘같음’이 일관되어야 합니다. 해시 기반 컬렉션에서는 equals로 같은 객체가 같은 hashCode를 반환해야 합니다. 반대로 해시값이 같아도 다른 객체일 수 있습니다. 키를 저장한 뒤 equals나 hashCode에 쓰는 필드를 바꾸면 같은 객체를 갖고도 기대한 조회가 깨질 수 있습니다. 그래서 상품 코드처럼 비교 기준이 안정적인 값을 키로 쓰는지 확인합니다."
      },
      {
        "heading": "변경 불가 뷰는 스냅샷이 아니다",
        "text": "unmodifiableList는 원본을 복사하는 기능이 아닙니다. 같은 목록을 읽되 그 뷰를 통한 변경을 막습니다. 예제는 먼저 new ArrayList(tags)로 별도 목록을 만든 다음 감싸므로 tags.set(0, \"other\")가 snapshot에는 반영되지 않습니다. 이를 얕은 복사라고 부릅니다. 목록은 별개지만 각 요소 객체까지 새로 만드는 것은 아닙니다. 또 tags를 만든 Arrays.asList는 크기가 고정되어 add·remove와 set의 허용 범위가 일반 ArrayList와 다릅니다."
      }
    ],
    "example": {
      "title": "집계와 컨테이너 복사 · Main.java",
      "code": "class Main {\n    public static void main(String[] args) {\n        java.util.List<String> tags =\n                java.util.Arrays.asList(\"java\", \"sql\", \"java\");\n        java.util.Map<String, Integer> counts =\n                new java.util.LinkedHashMap<String, Integer>();\n        for (String tag : tags) {\n            counts.put(tag, counts.getOrDefault(tag, 0) + 1);\n        }\n        java.util.List<String> snapshot =\n                java.util.Collections.unmodifiableList(\n                        new java.util.ArrayList<String>(tags));\n        tags.set(0, \"other\");\n        System.out.println(counts.get(\"java\"));\n        System.out.println(snapshot.get(0));\n        System.out.println(tags.get(0));\n    }\n}",
      "output": "2\njava\nother",
      "explanation": "반복문은 java를 처음 만나면 0+1, 다시 만나면 1+1을 counts에 저장하므로 첫 출력은 2입니다. snapshot을 만들 때 목록을 먼저 복사했기 때문에 원본 tags의 첫 항목을 other로 교체해도 snapshot은 java를 유지합니다. String 자체는 불변입니다. 요소가 가변 객체라면 별도 목록 안에서도 같은 요소 객체를 공유한다는 점을 추가로 확인해야 합니다."
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
        "explanation": "해시로 조회 위치를 좁힌 뒤 같음을 판정하는 컬렉션이 일관되게 동작하려면 equals가 true인 키의 해시도 같아야 합니다. 다만 서로 다른 키가 같은 해시를 갖는 충돌은 허용됩니다."
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
        "explanation": "뷰는 별도 목록을 만들지 않고 원본을 읽습니다. 원본에 추가하면 뷰에서도 보입니다. 예제의 snapshot이 다른 이유는 unmodifiableList 전에 new ArrayList로 원본과 별도의 목록을 만들었기 때문입니다."
      }
    ],
    "practice": {
      "title": "중복 이벤트 식별자의 보관 방식 선택",
      "scenario": "배치의 이벤트 코드 목록에 중복이 있습니다. 최초 등장 순서는 유지해야 하고, 결과를 받은 호출자가 목록을 수정해도 배치가 보관한 원본은 바뀌지 않아야 합니다.",
      "tasks": [
        "중복 판정 기준과 null 허용 여부를 정하세요.",
        "요구 순서를 보장하는 컬렉션을 선택하세요.",
        "반환 결과 변경이 원본 데이터에 영향을 주지 않는 테스트를 작성하세요."
      ],
      "takeaway": "‘Set을 쓸까 List를 쓸까’보다 중복·순서·변경 허용 요구부터 적으세요. 복사한 것이 목록인지 요소까지인지 확인해야 반환값을 안전하게 공유할 수 있습니다."
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
    "exerciseId": "collections-lab",
    "learningGuide": {
      "scenario": "tags의 java를 센 뒤 현재 목록을 보관하려고 합니다. 이후 원본 첫 값을 other로 바꿔도 snapshot에는 java가 남아야 합니다.",
      "question": "unmodifiableList만으로 충분할까요? 그 안의 new ArrayList(tags)는 무엇을 지킬까요?",
      "terms": [
        {
          "term": "변경 불가 뷰",
          "meaning": "원본을 읽되, 이 뷰를 통한 추가·삭제·교체를 막는 객체. 원본을 자동 복사하지 않습니다."
        },
        {
          "term": "얕은 복사",
          "meaning": "목록 자체는 별도로 만들지만 요소 객체의 참조는 공유하는 복사."
        },
        {
          "term": "키의 동등성",
          "meaning": "Map이 어떤 두 키를 같은 항목으로 취급할지 정하는 기준. 해시 기반 구현에서는 equals와 hashCode가 함께 맞아야 합니다."
        }
      ],
      "walkthrough": [
        "counts는 tags의 java, sql, java를 차례로 읽습니다. getOrDefault는 아직 없는 키의 개수를 0으로 보고, put은 증가한 개수를 저장합니다.",
        "new ArrayList(tags)가 현재 요소들을 담는 별도 목록을 만듭니다.",
        "unmodifiableList는 그 복사된 목록을 감쌉니다. snapshot을 통해 항목을 교체하지 못하게 합니다.",
        "tags.set(0, \"other\")는 원본 목록의 첫 자리만 바꿉니다. counts의 집계 결과와 snapshot의 첫 자리는 다시 계산되거나 함께 교체되지 않습니다."
      ],
      "prediction": {
        "question": "마지막 세 출력은 무엇일까요?",
        "answer": "2, java, other입니다.",
        "explanation": "집계는 변경 전에 끝나 java의 개수가 2입니다. snapshot은 별도 목록을 읽으므로 java를 유지하고, 원본 tags만 other로 바뀝니다."
      },
      "takeaway": "조회 결과를 다른 코드에 넘길 때 ‘수정하지 못하게 함’과 ‘나중 원본 변경을 보지 않게 함’을 따로 결정하세요.",
      "code": {
        "file": "examples/java8/collections/Main.java",
        "source": "        java.util.List<String> tags =\n                java.util.Arrays.asList(\"java\", \"sql\", \"java\");\n        java.util.Map<String, Integer> counts =\n                new java.util.LinkedHashMap<String, Integer>();\n        for (String tag : tags) {\n            counts.put(tag, counts.getOrDefault(tag, 0) + 1);\n        }\n        java.util.List<String> snapshot =\n                java.util.Collections.unmodifiableList(\n                        new java.util.ArrayList<String>(tags));\n        tags.set(0, \"other\");\n        System.out.println(counts.get(\"java\"));\n        System.out.println(snapshot.get(0));\n        System.out.println(tags.get(0));"
      }
    }
  },
  {
    "id": "generics",
    "title": "제네릭: 불공변성, 경계와 타입 소거",
    "description": "정수 목록과 소수 목록을 같은 sum으로 읽습니다. 받을 수 있는 목록을 넓히면서 잘못된 값 추가는 막는 타입 규칙을 이해합니다.",
    "track": "both",
    "level": "심화",
    "minVersion": 8,
    "featureSince": 5,
    "preview": false,
    "duration": 45,
    "category": "타입과 데이터",
    "goals": [
      "sum이 Integer 목록과 Double 목록을 모두 읽을 수 있는 이유를 설명한다.",
      "List<Integer>를 List<Number>로 다루면 어떤 잘못된 추가가 가능해지는지 설명한다.",
      "extends·super·타입 소거를 읽기·쓰기·실행 시 검사와 연결한다."
    ],
    "theory": [
      {
        "heading": "하위 타입 관계가 그대로 전달되지 않는다",
        "text": "Integer는 Number의 하위 타입이지만 List<Integer>를 List<Number> 변수에 넣을 수는 없습니다. 허용한다면 그 변수를 통해 Double도 추가할 수 있어 ‘정수만 들어 있다’는 원래 목록의 약속이 깨집니다. 요소 타입의 상하 관계가 목록 타입으로 그대로 이어지지 않는 성질을 불공변성이라고 합니다. 배열은 다른 규칙으로 대입을 허용하고 잘못된 저장을 실행 중 검사하므로, 배열에서 되던 대입을 제네릭 목록에도 그대로 기대하면 안 됩니다."
      },
      {
        "heading": "생산자는 extends, 소비자는 super",
        "text": "sum은 목록에 값을 넣지 않고 각 값을 Number로 읽어 doubleValue를 호출합니다. 그래서 List<? extends Number>가 맞습니다. 물음표는 정확한 요소 타입은 모르지만 Number 또는 그 하위 타입이라는 뜻입니다. 실제로 Double 목록일 수 있으므로 non-null Integer를 임의로 추가할 수는 없습니다. 반대로 List<? super Integer>에는 Integer를 추가할 수 있지만 읽은 값의 일반적 정적 타입은 Object입니다. 이는 타입 안전성에 관한 규칙이며, 변경 불가 목록의 add 성공까지 보장하지 않습니다. 읽고 쓰는 역할이 모두 필요하면 두 타입 사이의 관계부터 정하세요. extends 자체가 null 추가나 clear·remove를 타입 수준에서 금지하는 것은 아니므로 ‘불변 목록’으로 이해하지 마세요."
      },
      {
        "heading": "타입 소거가 만드는 제한",
        "text": "타입 소거는 컴파일할 때 제네릭의 많은 타입 정보를 상한 타입 등으로 바꾸는 처리입니다. 따라서 실행 중에 T가 정확히 무엇인지 안다고 가정해 new T()를 쓰거나 instanceof List<String>으로 요소 타입을 검사할 수는 없습니다. 타입 인자를 생략한 raw type과 확인되지 않은 캐스팅을 섞으면 잘못된 요소가 들어와도 경고만 남고, 나중에 값을 꺼낼 때 실패할 수 있습니다. 경고를 숨기기 전에 API의 타입 관계를 고치세요. 제네릭은 Java 5부터이며 이 예제는 Java 8 대상으로 작성했습니다."
      }
    ],
    "example": {
      "title": "읽기 역할에 맞춘 상한 경계 · Main.java",
      "code": "class Main {\n    static double sum(java.util.List<? extends Number> values) {\n        double total = 0;\n        for (Number value : values) {\n            total += value.doubleValue();\n        }\n        return total;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(sum(java.util.Arrays.asList(1, 2, 3)));\n        System.out.println(sum(java.util.Arrays.asList(0.5, 1.5)));\n    }\n}",
      "output": "6.0\n2.0",
      "explanation": "sum은 첫 호출에서 1, 2, 3을 Number로 읽고 각각 double 값으로 더해 6.0을 반환합니다. 다음 호출도 같은 코드를 사용해 0.5와 1.5를 더한 2.0을 반환합니다. 값을 추가하지 않고 읽기만 하므로 실제 목록이 Integer용인지 Double용인지 구분할 필요가 없습니다."
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
        "explanation": "List<Number>에는 Double도 넣을 수 있습니다. List<Integer>를 그 타입으로 대입할 수 있다면 정수 전용 목록에 소수가 들어가는 문제가 생깁니다. 컴파일러가 이 경로를 막는 것이 제네릭 불공변성의 이유입니다."
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
        "explanation": "실제 목록의 요소 타입은 Integer 또는 그 상위 타입이므로 Integer 값은 타입상 안전하게 추가할 수 있습니다. 하지만 Number나 Object 목록에는 Integer가 아닌 값도 있을 수 있어, 읽은 값을 곧바로 Integer라고 할 수는 없습니다. add의 실제 지원 여부는 목록 구현의 계약을 따릅니다."
      }
    ],
    "practice": {
      "title": "공통 복사 API의 타입 계약",
      "scenario": "Integer 목록을 Number 목록 뒤에 붙이는 코드와 String 목록을 Object 목록 뒤에 붙이는 코드가 반복됩니다. 타입 검사를 없애지 않고 공통 메서드로 만들려 합니다.",
      "tasks": [
        "source와 target의 읽기·쓰기 역할을 표시하세요.",
        "raw type 없이 공통 copy 메서드의 타입 매개변수를 정하세요.",
        "target의 기존 항목과 source가 보존되는지 검사하세요."
      ],
      "takeaway": "복사 메서드에서는 source가 값을 제공하고 target이 값을 받습니다. 이 방향을 정한 뒤 타입 매개변수와 경계를 쓰면, 유연하게 받으면서 잘못된 요소 추가를 컴파일 단계에서 막을 수 있습니다."
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
    "exerciseId": "generics-lab",
    "learningGuide": {
      "scenario": "정수 1·2·3과 소수 0.5·1.5를 각각 더하고 싶습니다. 숫자 종류마다 sum을 다시 만들 필요는 없어 보입니다.",
      "question": "sum이 List<Number> 대신 List<? extends Number>를 받는 이유는 무엇일까요?",
      "terms": [
        {
          "term": "불공변성",
          "meaning": "Integer가 Number의 하위 타입이어도 List<Integer>를 List<Number>로 바로 대입할 수 없는 규칙."
        },
        {
          "term": "상한 경계 extends",
          "meaning": "정확한 요소 타입은 몰라도 Number 또는 그 하위 타입임을 보장해 Number로 읽게 하는 조건."
        },
        {
          "term": "타입 소거",
          "meaning": "컴파일 과정에서 많은 제네릭 타입 정보가 상한 타입 등으로 바뀌어 실행 시 구별에 한계가 생기는 것."
        }
      ],
      "walkthrough": [
        "sum의 values는 정확히 어떤 숫자 타입의 목록인지는 몰라도 각 요소를 Number로 읽을 수 있습니다.",
        "total은 0에서 시작합니다. for문의 value가 받은 각 숫자에 doubleValue를 호출합니다.",
        "정수 목록에서는 1.0, 2.0, 3.0을 누적해 6.0을 반환합니다.",
        "소수 목록도 같은 코드를 지나 0.5와 1.5의 합인 2.0을 반환합니다. values에 새 요소를 추가하는 줄은 없습니다."
      ],
      "prediction": {
        "question": "같은 sum에 두 예제 목록을 전달하면 어느 호출이 컴파일되고 어떤 결과를 낼까요?",
        "answer": "둘 다 컴파일되며 6.0과 2.0을 반환합니다.",
        "explanation": "Integer와 Double 모두 Number로 읽을 수 있고 doubleValue를 제공합니다. sum은 읽기에 필요한 공통 기능만 요구합니다."
      },
      "takeaway": "공통 API를 만들 때 모든 목록을 같은 구체 타입으로 바꾸려 하지 말고, 메서드가 값을 읽는지 쓰는지부터 확인하세요.",
      "code": {
        "file": "examples/java8/generics/Main.java",
        "source": "    static double sum(java.util.List<? extends Number> values) {\n        double total = 0;\n        for (Number value : values) {\n            total += value.doubleValue();\n        }\n        return total;\n    }"
      }
    }
  },
  {
    "id": "exceptions",
    "title": "예외: 실패 책임과 자원 소유권",
    "description": "숫자 대신 many가 들어온 경우를 따라가며, 호출자에게 실패를 알리고 원래 예외와 자원 종료 정보를 남기는 방법을 익힙니다.",
    "track": "both",
    "level": "기본",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 40,
    "category": "실패와 검증",
    "goals": [
      "readQuantity의 입력 오류를 성공값 0으로 숨기면 생기는 문제를 설명한다.",
      "새 예외의 cause에서 원래 파싱 오류를 찾는다.",
      "return이나 예외로 빠져나가도 reader를 닫는 경로를 설명한다."
    ],
    "theory": [
      {
        "heading": "checked 여부와 복구 가능성은 같은 말이 아니다",
        "text": "readQuantity(\"many\")는 숫자를 읽지 못한 실패입니다. 이를 catch해서 0을 반환하면 호출자는 ‘입력값이 0’과 ‘읽기에 실패함’을 구별할 수 없습니다. checked 예외는 catch로 처리하거나 throws로 알리도록 컴파일러가 요구하는 예외입니다. 그렇다고 그 자리에서 복구할 수 있다는 뜻은 아닙니다. 예제의 IOException은 밖으로 전달하고 입력 형식 오류는 IllegalArgumentException으로 알립니다. 입력을 다시 받을지 작업을 중단할지는 판단할 정보가 있는 호출자가 결정해야 합니다."
      },
      {
        "heading": "예외를 바꾸더라도 원인을 잃지 않는다",
        "text": "parseInt가 던진 NumberFormatException을 호출자에게 의미 있는 invalid quantity 오류로 바꾸되 원인까지 지우지는 않습니다. 예제는 새 IllegalArgumentException의 두 번째 인자로 cause를 넘깁니다. 그러면 호출자는 ‘수량 입력에 실패했다’는 맥락과 ‘숫자로 해석하지 못했다’는 원인을 함께 확인할 수 있습니다. 로그에는 진단에 필요한 안전한 정보를 남기고 사용자 응답에는 필요한 안내를 줍니다. 민감한 입력 원문 전체를 예외 메시지에 붙일 필요는 없습니다."
      },
      {
        "heading": "자원 해제와 suppressed exception",
        "text": "readQuantity가 만든 reader는 try-with-resources의 괄호 안에 선언되어 있습니다. 본문이 값을 반환하거나 예외로 끝나도 닫기 처리가 이루어집니다. 여러 자원은 선언한 순서의 반대로 닫힙니다. 본문과 close가 모두 실패하면 본문 예외를 주로 전달하고 닫기 오류는 suppressed 예외로 붙여 진단할 수 있게 합니다. 이는 새로운 예외의 cause와 다른 정보입니다. 밖에서 전달받은 자원이라면 이 메서드가 닫아도 되는지 소유 책임을 먼저 정하세요."
      }
    ],
    "example": {
      "title": "읽기 자원의 수명 명시 · Main.java",
      "code": "class Main {\n    static int readQuantity(String text) throws java.io.IOException {\n        try (java.io.BufferedReader reader =\n                     new java.io.BufferedReader(new java.io.StringReader(text))) {\n            String line = reader.readLine();\n            if (line == null) {\n                throw new IllegalArgumentException(\"quantity is required\");\n            }\n            try {\n                return Integer.parseInt(line);\n            } catch (NumberFormatException cause) {\n                throw new IllegalArgumentException(\"invalid quantity\", cause);\n            }\n        }\n    }\n\n    public static void main(String[] args) throws java.io.IOException {\n        System.out.println(readQuantity(\"12\"));\n        try {\n            readQuantity(\"many\");\n        } catch (IllegalArgumentException failure) {\n            System.out.println(failure.getCause().getClass().getSimpleName());\n        }\n    }\n}",
      "output": "12\nNumberFormatException",
      "explanation": "readQuantity(\"12\")는 12를 반환하고 reader를 닫습니다. \"many\"는 parseInt에서 NumberFormatException을 만들며, 이를 cause로 담은 IllegalArgumentException이 밖으로 나옵니다. main은 getCause에서 원래 예외 이름을 읽어 NumberFormatException을 출력합니다. 실패 경로에서도 reader 닫기는 try-with-resources가 담당합니다."
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
        "explanation": "새 IllegalArgumentException에 cause를 넘기면 바깥 예외는 업무 맥락을, 원인 예외는 실제 실패 이유를 전달합니다. 예제의 main이 getCause로 NumberFormatException을 확인할 수 있는 이유입니다."
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
        "explanation": "본문에서 발생한 실패를 주 예외로 전달하고 close에서 난 실패는 suppressed 정보로 보존합니다. 하나의 실패가 다른 실패를 무조건 지워 버리는 것이 아닙니다. 호출자는 getSuppressed로 종료 중 문제도 조사할 수 있습니다."
      }
    ],
    "practice": {
      "title": "환경 설정 입력의 실패 계약",
      "scenario": "설정 파일의 포트 값이 many여도 읽기 메서드가 0을 반환합니다. 서버를 시작하는 코드에서 뒤늦게 실패해 입력 오류였다는 사실을 찾기 어렵습니다.",
      "tasks": [
        "입력 부재·형식 오류·범위 오류를 분류하세요.",
        "호출자가 실패를 확실하게 알도록 계약을 바꾸세요.",
        "파싱 실패의 cause가 남는지 검사하세요."
      ],
      "takeaway": "오류를 처리했다는 것은 catch를 썼다는 뜻이 아닙니다. 복구하지 못했다면 실패를 명확히 전달하고, 원인과 자원 종료 책임도 함께 남겨야 합니다."
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
    "exerciseId": "exceptions-lab",
    "learningGuide": {
      "scenario": "수량을 읽는 readQuantity는 \"12\"를 받으면 성공하지만 \"many\"를 받으면 실패합니다. 호출자에게 읽기 실패를 알리면서 원래 이유도 남기려 합니다.",
      "question": "새 IllegalArgumentException을 던지는데 main은 어떻게 NumberFormatException을 확인할까요?",
      "terms": [
        {
          "term": "예외 전파",
          "meaning": "현재 메서드가 처리하지 못한 실패를 호출한 쪽으로 전달하는 것."
        },
        {
          "term": "cause",
          "meaning": "현재 예외가 생긴 원인 예외. 새 예외를 만들 때 연결해야 원래 이유를 따라갈 수 있습니다."
        },
        {
          "term": "자원 소유권",
          "meaning": "누가 자원을 만들고 누가 닫을 책임을 지는지에 대한 약속."
        },
        {
          "term": "suppressed 예외",
          "meaning": "주된 실패를 전달하면서 함께 보관하는 추가 실패. 자원을 닫는 중 난 오류 등이 여기에 남습니다."
        }
      ],
      "walkthrough": [
        "readQuantity가 StringReader를 감싼 BufferedReader를 만들고 reader에서 첫 줄을 읽습니다.",
        "line이 없으면 quantity is required를 던집니다. 값이 있으면 Integer.parseInt로 숫자 변환을 시도합니다.",
        "\"many\"의 변환은 NumberFormatException을 던집니다. 안쪽 catch가 이를 cause라는 변수로 받습니다.",
        "new IllegalArgumentException(\"invalid quantity\", cause)는 읽기 실패라는 맥락과 원래 예외를 연결해 밖으로 던집니다.",
        "try-with-resources가 reader를 닫습니다. 전체 예제의 main은 failure.getCause()를 통해 원래 예외 종류를 출력합니다."
      ],
      "prediction": {
        "question": "두 번째 입력 many를 처리한 뒤 main이 출력하는 원인 예외 이름은 무엇일까요?",
        "answer": "NumberFormatException입니다.",
        "explanation": "바깥으로 전달한 예외는 IllegalArgumentException이지만 두 번째 생성자 인자에 원인 예외를 보존했기 때문입니다."
      },
      "takeaway": "실패를 업무용 예외로 바꿀 때는 호출자에게 필요한 맥락을 더하고, 진단에 필요한 원인은 유지하세요.",
      "code": {
        "file": "examples/java8/exceptions/Main.java",
        "source": "    static int readQuantity(String text) throws java.io.IOException {\n        try (java.io.BufferedReader reader =\n                     new java.io.BufferedReader(new java.io.StringReader(text))) {\n            String line = reader.readLine();\n            if (line == null) {\n                throw new IllegalArgumentException(\"quantity is required\");\n            }\n            try {\n                return Integer.parseInt(line);\n            } catch (NumberFormatException cause) {\n                throw new IllegalArgumentException(\"invalid quantity\", cause);\n            }\n        }\n    }"
      }
    }
  },
  {
    "id": "streams",
    "title": "Stream: 지연 실행과 부수 효과 없는 집계",
    "description": "java·sql·jvm·java에서 [JAVA, JVM]을 만드는 과정을 읽으며, 처리를 연결하는 시점과 실제 결과를 구하는 시점을 구별합니다.",
    "track": "both",
    "level": "기본",
    "minVersion": 8,
    "featureSince": 8,
    "preview": false,
    "duration": 40,
    "category": "데이터 처리",
    "goals": [
      "filter·distinct·map이 각각 어떤 입력을 남기거나 바꾸는지 설명한다.",
      "collect가 결과 계산을 시작하고 selected에 결과를 담는 역할을 설명한다.",
      "원본 names를 변경하는 일과 새 결과를 수집하는 일을 구분한다."
    ],
    "theory": [
      {
        "heading": "Stream은 데이터를 저장하는 컬렉션이 아니다",
        "text": "예제의 names는 데이터를 보관한 List이고, names.stream() 뒤의 연산은 그 데이터로 무엇을 계산할지 나타냅니다. filter는 j로 시작하는 값을 고르고, distinct는 중복을 제거하며, map은 대문자로 바꿉니다. 이런 중간 연산은 연결만으로 결과를 계산하지 않습니다. collect 같은 최종 연산이 실행될 때 계산이 시작되는 성질을 지연 실행이라고 합니다. 한번 소비한 Stream을 다시 사용하려 하지 말고 names에서 새 Stream을 만드세요."
      },
      {
        "heading": "외부 상태 변경은 집계와 다른 책임이다",
        "text": "예제의 selected는 collect가 수집한 결과입니다. 외부의 빈 ArrayList를 만들고 forEach 안에서 add하는 방식은 콜백이 바깥 상태까지 바꾸게 합니다. 이런 외부 상태 변경을 부수 효과라고 부르며, 특히 병렬 실행에서는 누가 언제 수정하는지 맞추기 어려워집니다. 결과를 모으려면 collect, 숫자 합계라면 해당 합계 연산을 사용해 목적을 드러내세요. 예제의 콜백은 names의 내용을 수정하지 않고 각 입력으로부터 결과를 계산합니다."
      },
      {
        "heading": "병렬화와 API 버전은 별도 판단이다",
        "text": "같은 코드를 parallelStream으로 바꾼다고 항상 빨라지지는 않습니다. 작업을 나눌 비용, 순서 유지 비용, 공유 상태와 실행 환경을 함께 봐야 합니다. Java 8의 이 예제는 collect(Collectors.toList())를 사용합니다. Java 16에서 추가된 Stream.toList()는 Java 8에 없고 반환 목록도 변경 불가입니다. Collectors.toList() 역시 구체 목록 타입이나 변경 가능성을 보장하지 않으므로, 단순히 이름이 비슷하다고 같은 계약으로 취급하지 마세요."
      }
    ],
    "example": {
      "title": "필터·변환·수집 파이프라인 · Main.java",
      "code": "class Main {\n    public static void main(String[] args) {\n        java.util.List<String> names =\n                java.util.Arrays.asList(\"java\", \"sql\", \"jvm\", \"java\");\n        java.util.List<String> selected = names.stream()\n                .filter(name -> name.startsWith(\"j\"))\n                .distinct()\n                .map(name -> name.toUpperCase(java.util.Locale.ROOT))\n                .collect(java.util.stream.Collectors.toList());\n        System.out.println(selected);\n        System.out.println(names.size());\n    }\n}",
      "output": "[JAVA, JVM]\n4",
      "explanation": "filter 뒤의 값은 java, jvm, java이고 distinct가 뒤의 java 중복을 없앱니다. map이 남은 두 값을 JAVA, JVM으로 바꾸고 collect가 [JAVA, JVM]을 selected에 담습니다. 이 설명은 값의 흐름이며 각 단계마다 임시 List를 만든다는 뜻은 아닙니다. names를 수정하지 않았으므로 두 번째 출력은 원래 크기인 4입니다."
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
        "explanation": "filter는 ‘어떤 항목을 통과시킬지’를 연결한 중간 연산입니다. collect나 sum 같은 최종 연산이 있어야 결과 계산을 시작합니다. findFirst처럼 필요한 결과를 일찍 얻으면 모든 요소를 끝까지 처리하지 않는 최종 연산도 있습니다."
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
        "explanation": "Stream.toList()는 Java 16부터 있어 Java 8 대상 예제에서는 사용할 수 없습니다. 지원 버전뿐 아니라 반환 목록의 변경 허용 여부도 확인해야 합니다. 이름이 유사해도 모든 API를 그대로 바꿔 쓸 수는 없습니다."
      }
    ],
    "practice": {
      "title": "집계 배치의 공유 누산기 없애기",
      "scenario": "배치 코드가 조건을 통과한 숫자를 바깥 변수에 계속 더합니다. 병렬화하거나 조건을 바꿀 때 누락된 합계가 생겨, 필터 조건과 집계 책임을 분명히 하려 합니다.",
      "tasks": [
        "필터 조건과 합계의 입력 범위를 분리해 적으세요.",
        "외부 상태 없이 조건에 맞는 값을 집계하세요.",
        "빈 입력·null 요소·중복 값을 처리하는 계약을 확인하세요."
      ],
      "takeaway": "먼저 어떤 값을 남기고 어떤 결과를 계산하는지 드러내세요. 외부 변수를 바꾸지 않는 집계로 만든 뒤, 필요한 경우 성능을 측정해 병렬화를 판단합니다."
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
    "exerciseId": "streams-lab",
    "learningGuide": {
      "scenario": "태그 java, sql, jvm, java에서 j로 시작하는 값만 남기고, 중복 없이 대문자로 표시해야 합니다. 원본 목록은 다른 곳에서도 사용합니다.",
      "question": "처리 규칙은 어느 줄에서 연결되고, 최종 결과는 어느 줄에서 만들어질까요?",
      "terms": [
        {
          "term": "파이프라인",
          "meaning": "원본에서 어떤 값을 고르고 바꾸고 모을지 연결한 연산 흐름."
        },
        {
          "term": "중간 연산·지연 실행",
          "meaning": "filter나 map처럼 다음 연산을 연결하며, 최종 연산 전에는 소스의 결과 계산을 시작하지 않는 방식."
        },
        {
          "term": "최종 연산",
          "meaning": "collect처럼 연결된 흐름을 실행해 결과나 효과를 얻는 연산."
        },
        {
          "term": "부수 효과",
          "meaning": "계산 결과를 돌려주는 것 외에 원본이나 외부 변수의 상태도 바꾸는 일."
        }
      ],
      "walkthrough": [
        "names.stream()에서 시작해 filter가 j로 시작하는 java, jvm, java를 통과시키도록 연결합니다.",
        "distinct는 같은 문자열 java가 반복돼도 하나만 남기도록 하고, map은 남은 문자열을 대문자로 바꾸도록 연결합니다.",
        "collect(Collectors.toList())가 최종 연산입니다. 앞서 연결한 규칙으로 값을 처리해 selected를 만듭니다.",
        "selected는 [JAVA, JVM]입니다. 콜백에 names를 수정하는 코드가 없으므로 원본 크기는 4를 유지합니다."
      ],
      "prediction": {
        "question": "selected를 만든 뒤 names.size()도 2로 줄어들까요?",
        "answer": "아닙니다. selected는 [JAVA, JVM]이고 names.size()는 4입니다.",
        "explanation": "이 예제는 원본의 요소를 삭제하지 않고 조건에 맞는 값으로 별도 결과를 수집합니다. 모든 Stream 사용이 자동으로 원본 변경을 막는다는 뜻은 아닙니다."
      },
      "takeaway": "원본·처리 규칙·결과 목록을 따로 생각하면, 읽기 위한 변환인지 외부 상태를 바꾸는 작업인지 구별하기 쉬워집니다.",
      "code": {
        "file": "examples/java8/streams/Main.java",
        "source": "        java.util.List<String> names =\n                java.util.Arrays.asList(\"java\", \"sql\", \"jvm\", \"java\");\n        java.util.List<String> selected = names.stream()\n                .filter(name -> name.startsWith(\"j\"))\n                .distinct()\n                .map(name -> name.toUpperCase(java.util.Locale.ROOT))\n                .collect(java.util.stream.Collectors.toList());\n        System.out.println(selected);\n        System.out.println(names.size());"
      }
    }
  },
  {
    "id": "concurrency",
    "title": "동시성: JMM, 원자성과 작업 수명",
    "description": "두 작업이 각각 1000번 증가시킨 카운터가 왜 2000이어야 하는지, 증가 자체의 안전성과 완료 대기를 나눠 설명합니다.",
    "track": "advanced",
    "level": "심화",
    "minVersion": 8,
    "featureSince": 5,
    "preview": false,
    "duration": 65,
    "category": "동시성과 실행 모델",
    "goals": [
      "count++에서 증가가 사라질 수 있는 이유와 AtomicInteger의 역할을 설명한다.",
      "first.get·second.get 없이 결과를 읽을 때 생기는 문제를 구별한다.",
      "작업 실패·인터럽트·실행기 종료 요청을 누가 처리하는지 정한다."
    ],
    "theory": [
      {
        "heading": "보이는 것과 한 번에 처리되는 것은 다르다",
        "text": "두 작업이 동시에 0을 읽고 각자 1을 기록하면 증가 요청은 두 번인데 결과는 1일 수 있습니다. count++가 읽기·계산·쓰기를 묶은 동작이기 때문입니다. 다른 스레드의 변경을 어떤 규칙으로 볼 수 있는지는 가시성, 한 동작이 중간에 쪼개져 섞이지 않게 보장되는지는 원자성의 문제입니다. volatile로 가시성과 순서를 다뤄도 ++ 전체가 원자적이 되지는 않습니다. 예제는 total.incrementAndGet으로 각 증가를 원자적으로 수행합니다. JMM은 이런 스레드 사이 읽기 결과와 순서 보장을 규정합니다."
      },
      {
        "heading": "happens-before와 안전한 공개",
        "text": "증가를 안전하게 해도 아직 작업 중일 때 total을 읽으면 값은 2000보다 작을 수 있습니다. 예제는 first.get과 second.get이 모두 정상 반환한 뒤 읽습니다. 이 호출은 해당 작업의 완료를 기다리며 작업의 결과를 읽는 데 필요한 메모리 일관성 관계도 제공합니다. 이런 ‘앞선 작업의 영향이 뒤의 관찰에 반영되도록 하는 관계’를 happens-before라고 부릅니다. 시계상 먼저 실행됐다는 뜻으로만 이해하지 마세요. 락·volatile·스레드 시작과 종료·동시성 API의 명시된 보장을 확인해야 하며, sleep으로 잠시 기다리는 것은 완료 확인을 대신하지 않습니다."
      },
      {
        "heading": "작업과 자원의 생명주기를 설계한다",
        "text": "ExecutorService는 작업을 제출하는 코드와 실행할 스레드를 관리하는 코드를 나눕니다. 두 submit은 작업을 맡기고 Future를 돌려주며, get은 대기 중 인터럽트나 작업 실패를 알릴 수 있습니다. 예제는 예외를 밖으로 전달하면서 finally에서 shutdownNow로 종료를 요청합니다. 이 요청이 모든 실행 중 작업을 강제로 끝냈다는 보장은 아닙니다. 호출자가 InterruptedException을 받아 상위로 의사를 전달할 때는 전파나 인터럽트 상태 복원 정책을 정하세요. 또 AtomicInteger 하나가 안전해도 여러 필드나 DB 행을 함께 바꾸는 업무 전체가 자동으로 원자적이 되지는 않습니다."
      }
    ],
    "example": {
      "title": "완료 후 읽는 원자 카운터 · Main.java",
      "code": "class Main {\n    public static void main(String[] args) throws Exception {\n        java.util.concurrent.ExecutorService executor =\n                java.util.concurrent.Executors.newFixedThreadPool(2);\n        java.util.concurrent.atomic.AtomicInteger total =\n                new java.util.concurrent.atomic.AtomicInteger();\n        try {\n            java.util.concurrent.Future<?> first = executor.submit(() -> {\n                for (int index = 0; index < 1000; index++) {\n                    total.incrementAndGet();\n                }\n            });\n            java.util.concurrent.Future<?> second = executor.submit(() -> {\n                for (int index = 0; index < 1000; index++) {\n                    total.incrementAndGet();\n                }\n            });\n            first.get();\n            second.get();\n            System.out.println(total.get());\n        } finally {\n            executor.shutdownNow();\n        }\n    }\n}",
      "output": "2000",
      "explanation": "두 작업은 각자 1000번 total.incrementAndGet을 호출합니다. 각 증가가 원자적이므로 정상 완료하면 합계는 2000입니다. first.get과 second.get으로 둘 다 끝났음을 확인한 뒤 total.get을 출력합니다. finally의 shutdownNow는 실행기 종료를 요청합니다. 이 예제는 메모리 안의 카운터이며 여러 DB 변경이나 분산 처리의 보장을 보여 주는 것은 아닙니다."
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
        "explanation": "두 스레드가 모두 0을 읽고 각자 1을 쓰는 경우를 생각해 보세요. volatile이어도 읽기·계산·쓰기 전체가 한 번에 처리되지는 않아 증가가 사라질 수 있습니다. 예제의 incrementAndGet처럼 요구에 맞는 원자 연산이나 락이 필요합니다."
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
        "explanation": "100ms가 지났다는 사실은 특정 작업이 끝났다는 신호가 아닙니다. 환경과 작업량에 따라 아직 실행 중일 수 있고, sleep 자체가 작업 결과의 전달 규칙을 만들지도 않습니다. Future.get이나 join처럼 완료·동기화 계약이 있는 방법을 사용해야 합니다."
      }
    ],
    "practice": {
      "title": "병렬 작업의 완료·실패·종료 계약",
      "scenario": "병렬 배치가 2000개를 처리했어야 하는데 카운트가 간헐적으로 작습니다. 값 증가가 충돌했는지, 완료 전에 읽었는지부터 나누어 확인하고 작업 후 남는 스레드도 정리하려 합니다.",
      "tasks": [
        "공유 카운터의 원자성 문제와 결과를 너무 일찍 읽는 문제를 분리하세요.",
        "작업을 제출하고 모두 완료된 후 반환하며 실행기를 닫으세요.",
        "인터럽트·작업 실패가 발생했을 때 호출자가 무엇을 관찰할지 설명하세요."
      ],
      "takeaway": "‘여러 번 실행해 맞았다’보다 어느 연산이 증가를 보호하고 어느 호출이 완료를 확인하는지 설명하세요. 실패와 종료까지 포함해야 호출자가 결과를 믿을 수 있습니다."
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
    "exerciseId": "concurrency-lab",
    "learningGuide": {
      "scenario": "두 작업이 total을 각각 1000번 증가시킵니다. 합계가 2000이 되려면 증가를 잃지 않아야 하고, 두 작업이 끝나기 전에 읽어서도 안 됩니다.",
      "question": "incrementAndGet과 Future.get은 서로 다른 어떤 문제를 해결할까요?",
      "terms": [
        {
          "term": "원자성",
          "meaning": "하나로 취급해야 할 동작의 중간에 다른 작업이 끼어 결과를 깨뜨리지 않도록 하는 보장."
        },
        {
          "term": "가시성",
          "meaning": "한 스레드의 변경을 다른 스레드가 읽을 때 어떤 결과를 볼 수 있는지에 관한 보장."
        },
        {
          "term": "Future",
          "meaning": "제출한 작업의 완료와 결과·실패를 확인하는 객체. get은 필요하면 완료를 기다립니다."
        },
        {
          "term": "happens-before",
          "meaning": "앞선 동작의 영향과 뒤의 관찰 사이에 Java가 보장하는 순서·메모리 일관성 관계. 실제 시각만 비교하는 말은 아닙니다."
        }
      ],
      "walkthrough": [
        "first와 second는 각각 1000번 반복하는 작업을 executor에 제출해 얻은 Future입니다.",
        "각 작업의 total.incrementAndGet은 한 번의 증가를 원자적으로 처리합니다. 두 작업이 섞여도 증가 자체를 잃지 않습니다.",
        "first.get은 첫 작업을 기다립니다. 이어지는 second.get까지 정상 반환해야 두 작업의 완료를 확인한 것입니다.",
        "그 뒤 total.get으로 읽으므로 정상 완료한 두 루프의 합인 2000을 출력합니다. 전체 예제의 finally는 실행기 종료를 요청합니다."
      ],
      "prediction": {
        "question": "incrementAndGet을 사용했으니 두 get 호출을 빼도 출력이 항상 2000일까요?",
        "answer": "보장할 수 없습니다.",
        "explanation": "증가가 안전하다는 것과 증가 작업이 이미 끝났다는 것은 다릅니다. get을 빼면 출력 시점에도 작업이 진행 중일 수 있습니다."
      },
      "takeaway": "동시성 버그를 볼 때 ‘공유 값을 어떻게 바꾸는가’와 ‘언제 결과를 읽어도 되는가’를 별도로 추적하세요.",
      "code": {
        "file": "examples/java8/concurrency/Main.java",
        "source": "            java.util.concurrent.Future<?> first = executor.submit(() -> {\n                for (int index = 0; index < 1000; index++) {\n                    total.incrementAndGet();\n                }\n            });\n            java.util.concurrent.Future<?> second = executor.submit(() -> {\n                for (int index = 0; index < 1000; index++) {\n                    total.incrementAndGet();\n                }\n            });\n            first.get();\n            second.get();\n            System.out.println(total.get());"
      }
    }
  },
  {
    "id": "modern-apis",
    "title": "Java 11: 입력 처리와 표준 HTTP API",
    "description": "여러 줄 입력에서 빈 줄을 빼고, HTTP 연결 제한을 설정합니다. 출력 2와 3이 각각 어떤 사실을 보여 주는지 확인합니다.",
    "track": "advanced",
    "level": "심화",
    "minVersion": 11,
    "featureSince": 11,
    "preview": false,
    "duration": 40,
    "category": "버전 전환",
    "goals": [
      "lines·strip·isBlank가 입력의 어느 부분을 처리하는지 설명한다.",
      "지역 변수 var의 도입 버전과 이 예제의 Java 11 API 요구를 구별한다.",
      "HTTP 클라이언트 설정과 실제 요청 성공을 구분한다."
    ],
    "theory": [
      {
        "heading": "문자열 API가 바꾸는 입력 정책",
        "text": "예제의 text에는 build, 빈 줄, test가 들어 있고 두 단어의 앞뒤에 공백이 있습니다. lines는 줄 단위로 읽게 하고, strip은 각 줄 앞뒤의 공백을 제거하며, isBlank는 비었거나 공백뿐인 줄을 구별합니다. 이 조합은 ‘의미 있는 줄 두 개’를 세려는 의도를 드러냅니다. strip과 isBlank의 공백 기준은 Character.isWhitespace이며 trim의 기준과 다릅니다. 눈에 공백처럼 보이는 모든 문자를 제거한다고 가정하지 말고 실제 입력 문자·인코딩·줄 구분자를 확인하세요."
      },
      {
        "heading": "var와 API 도입 버전을 분리한다",
        "text": "API를 읽을 때는 ‘코드를 실행할 JDK 버전’과 ‘기능이 처음 생긴 버전’을 나누어 확인합니다. 지역 변수 var는 Java 10에서 추가된 컴파일 시점 타입 추론입니다. 값을 대입한 뒤 아무 타입으로나 바뀌는 동적 타입이 아닙니다. Java 11에서 추가된 것은 람다 매개변수의 var 문법입니다. 이 예제의 strip·isBlank·lines와 표준 java.net.http.HttpClient는 Java 11을 요구하므로 예제 전체 대상도 11입니다."
      },
      {
        "heading": "HTTP는 성공 응답 한 번으로 끝나지 않는다",
        "text": "예제의 client는 연결 시간 제한을 3초로 설정한 객체입니다. send나 sendAsync를 호출하지 않았으므로 서버 응답을 받은 것은 아닙니다. 실제 호출에서는 연결을 기다리는 시간과 요청 응답을 기다리는 시간의 제한을 각각 설계해야 합니다. 응답이 도착해도 상태 코드가 업무 성공을 뜻하는지 따로 봅니다. 같은 요청을 다시 보내도 중복 차감 같은 추가 효과가 없는 성질을 멱등성이라고 합니다. 재시도 전에는 이 성질과 중복 처리 위험을 확인하세요."
      }
    ],
    "example": {
      "title": "Java 11 API와 명시적 설정 · Main.java",
      "code": "class Main {\n    public static void main(String[] args) {\n        String text = \"  build \\n\\n test  \";\n        long meaningfulLines = text.lines()\n                .map(String::strip)\n                .filter(line -> !line.isBlank())\n                .count();\n        java.net.http.HttpClient client =\n                java.net.http.HttpClient.newBuilder()\n                        .connectTimeout(java.time.Duration.ofSeconds(3))\n                        .build();\n        System.out.println(meaningfulLines);\n        System.out.println(client.connectTimeout().get().getSeconds());\n    }\n}",
      "output": "2\n3",
      "explanation": "lines는 세 줄을 읽고 strip과 filter를 거치면 build와 test만 남아 count가 2를 반환합니다. 뒤의 3은 client에 저장된 연결 시간 제한을 초 단위로 읽은 값입니다. 3초 동안 기다렸다거나 실제 요청이 성공했다는 출력이 아닙니다. 이 예제는 외부 네트워크를 호출하지 않습니다."
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
        "explanation": "지역 변수 var는 초기값 등을 보고 컴파일러가 타입을 정하는 Java 10 기능입니다. Java 11의 람다 매개변수 var와 최초 버전을 혼동하지 마세요. 선언이 짧아져도 컴파일 시 정해지는 타입이라는 성격은 같습니다."
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
        "explanation": "두 API의 공백 판정 기준이 달라 실제 입력에서 결과가 달라질 수 있습니다. strip은 Java 11부터이므로 배포 대상도 확인해야 합니다. 원본 String을 제자리에서 바꾸는 기능은 아닙니다."
      }
    ],
    "practice": {
      "title": "텍스트 설정을 줄 단위 값으로 바꾸기",
      "scenario": "운영자가 build, 빈 줄, test처럼 항목을 여러 줄로 붙여 넣습니다. 앞뒤 공백과 빈 줄을 제거하되 중복 항목을 유지할지는 업무 규칙으로 정해야 합니다.",
      "tasks": [
        "공백·줄 구분자·중복 보존 정책을 명시하세요.",
        "Java 11 API로 의도가 드러나는 변환을 작성하세요.",
        "Java 8 배포 대상에 이 API가 들어갔을 때 어떤 검증이 막아야 하는지 설명하세요."
      ],
      "takeaway": "API 이름이 간단해졌다고 입력 정책까지 같아지는 것은 아닙니다. 허용 문자와 결과를 먼저 정하고, 대상 버전에서 지원되는 API인지 확인하세요."
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
    "exerciseId": "modern-apis-lab",
    "learningGuide": {
      "scenario": "붙여 넣은 텍스트에서 실제 항목 수를 세고, 이후 사용할 HTTP 클라이언트의 연결 제한도 지정합니다. 콘솔에는 2와 3이 출력됩니다.",
      "question": "각 숫자는 계산한 결과일까요, 실행한 네트워크 요청의 결과일까요?",
      "terms": [
        {
          "term": "입력 정규화",
          "meaning": "비교·처리하기 전에 공백 등 입력 표현을 정해진 규칙으로 맞추는 것. 원래 의미가 바뀌지 않는지 확인해야 합니다."
        },
        {
          "term": "연결 시간 제한",
          "meaning": "새 연결을 만드는 데 허용할 대기 시간에 관한 설정. 응답 처리 전체의 시간 제한과 구별합니다."
        },
        {
          "term": "최초 도입 버전",
          "meaning": "문법이나 API를 처음 사용할 수 있게 된 Java 버전. 현재 실행하는 JVM의 버전과는 다른 정보입니다."
        }
      ],
      "walkthrough": [
        "text.lines()가 build가 있는 줄, 빈 줄, test가 있는 줄을 제공합니다.",
        "map(String::strip)이 각 줄의 앞뒤 공백을 처리하고 filter가 빈 줄을 제외합니다.",
        "count()가 남은 두 줄을 세어 meaningfulLines에 2를 저장합니다.",
        "HttpClient의 builder는 3초 연결 제한을 저장해 client를 만듭니다. 여기까지 요청 전송은 없습니다.",
        "마지막 출력은 meaningfulLines의 2와 설정값을 초로 읽은 3입니다."
      ],
      "prediction": {
        "question": "출력 3을 보고 서버가 3초 안에 응답했다고 판단할 수 있을까요?",
        "answer": "아닙니다. 연결 시간 제한 설정값만 읽었습니다.",
        "explanation": "코드에는 요청을 보내는 send나 sendAsync가 없습니다. 설정 객체를 생성한 사실과 실제 통신 결과는 다릅니다."
      },
      "takeaway": "새 API를 읽을 때 입력 변환·설정 생성·실제 실행을 구별하면, 코드가 보장하는 것보다 큰 효과를 기대하지 않게 됩니다.",
      "code": {
        "file": "examples/java11/modern-apis/Main.java",
        "source": "        String text = \"  build \\n\\n test  \";\n        long meaningfulLines = text.lines()\n                .map(String::strip)\n                .filter(line -> !line.isBlank())\n                .count();\n        java.net.http.HttpClient client =\n                java.net.http.HttpClient.newBuilder()\n                        .connectTimeout(java.time.Duration.ofSeconds(3))\n                        .build();\n        System.out.println(meaningfulLines);\n        System.out.println(client.connectTimeout().get().getSeconds());"
      }
    }
  },
  {
    "id": "records-sealed",
    "title": "Java 17: record와 sealed 결과 모델",
    "description": "계산 결과를 숫자 하나나 true/false 대신 성공 값과 실패 이유로 돌려줍니다. record의 값 비교와 sealed의 종류 제한을 실제 반환값에서 확인합니다.",
    "track": "advanced",
    "level": "심화",
    "minVersion": 17,
    "featureSince": 17,
    "preview": false,
    "duration": 45,
    "category": "버전 전환",
    "goals": [
      "doublePositive가 성공 값과 실패 이유를 서로 다른 타입으로 반환하는 과정을 설명한다.",
      "record가 생성하는 접근자·동등성·문자열 표현을 예제와 연결한다.",
      "record·sealed의 정식 버전과 Java 17에서 사용할 수 없는 정식 패턴 문법을 구분한다."
    ],
    "theory": [
      {
        "heading": "record는 투명한 데이터 운반자",
        "text": "Success(6)은 value가 6인 결과 값입니다. record는 이 구성 요소에 대한 private final 필드, value() 같은 접근자, 생성자와 equals·hashCode·toString을 제공합니다. 예제의 두 Success(6)은 별개 객체여도 같은 record 타입과 구성 요소 값을 가져 equals가 true입니다. record를 쓰면 데이터의 모양이 선언에 드러납니다. 다만 구성 요소가 가변 List라면 참조를 final로 보관해도 목록 내용은 바뀔 수 있습니다. 필요한 입력 검사는 compact constructor에서, 공유를 막을 필요는 방어적 복사로 다룹니다. record의 정식 도입은 Java 16입니다."
      },
      {
        "heading": "sealed는 확장 가능한 종류를 제한한다",
        "text": "Result는 Success 또는 Failure만 직접 구현할 수 있게 선언했습니다. 이렇게 허용할 직접 하위 타입을 정하는 기능이 sealed입니다. 이 예제는 성공이면 숫자, 실패면 이유를 주므로 호출자가 처리할 결과 종류를 읽기 쉽습니다. 하위 타입은 final·sealed·non-sealed 등의 확장 규칙을 따라야 하며, 외부에서 자유롭게 결과 종류를 추가해야 하는 API라면 제한 비용도 있습니다. sealed는 Java 17부터 정식이므로 record와 함께 쓰는 이 예제의 최소 대상은 17입니다."
      },
      {
        "heading": "모델의 종류와 처리 문법은 별개다",
        "text": "Java 17에서 결과 종류를 record와 sealed로 선언할 수 있다는 것과, 그 결과를 어떤 switch 문법으로 처리할 수 있다는 것은 별개입니다. 이 예제는 preview 문법을 쓰지 않습니다. switch 표현식은 14, text block은 15, instanceof 패턴은 16에서 정식 도입되었습니다. record 구성 요소를 패턴으로 꺼내거나 타입 패턴을 switch에 쓰는 정식 기능은 Java 21 수업에서 다룹니다. 새 문법을 사용할 때는 클래스 선언과 처리 문법의 버전을 각각 확인하세요."
      }
    ],
    "example": {
      "title": "닫힌 계산 결과와 record 동등성 · Main.java",
      "code": "class Main {\n    sealed interface Result permits Success, Failure {}\n    record Success(int value) implements Result {}\n    record Failure(String reason) implements Result {}\n\n    static Result doublePositive(int value) {\n        if (value <= 0) {\n            return new Failure(\"positive-required\");\n        }\n        return new Success(Math.multiplyExact(value, 2));\n    }\n\n    public static void main(String[] args) {\n        System.out.println(doublePositive(3).equals(new Success(6)));\n        System.out.println(doublePositive(0));\n    }\n}",
      "output": "true\nFailure[reason=positive-required]",
      "explanation": "doublePositive(3)는 Success(6)을 반환합니다. 새로 만든 다른 Success(6)과도 equals가 true여서 첫 출력은 true입니다. doublePositive(0)는 계산 전에 Failure(\"positive-required\")를 반환하고 record의 문자열 표현을 출력합니다. 이 예제는 모든 실패를 Failure로 바꾸지는 않습니다. 양수라도 두 배가 int 범위를 넘으면 Math.multiplyExact가 ArithmeticException을 던집니다."
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
        "explanation": "record가 고정하는 것은 구성 요소 필드의 참조입니다. 그 참조가 가리키는 ArrayList가 다른 경로에서 바뀌는 것까지 막지는 않습니다. 목록 복사 여부와 요소의 변경 가능성은 별도로 정해야 합니다."
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
        "explanation": "record는 Java 16에서, sealed는 Java 17에서 정식 도입되었습니다. 하나의 예제에서 함께 쓰므로 더 높은 요구인 Java 17을 대상으로 잡습니다. 예제 대상 버전이 각 기능의 최초 버전과 항상 같지는 않습니다."
      }
    ],
    "practice": {
      "title": "성공과 거절 이유를 타입으로 표현",
      "scenario": "예약 결과가 false로만 돌아와 수량이 잘못됐는지 재고가 부족한지 알 수 없습니다. 호출자가 실패 이유에 따라 다른 안내를 할 수 있는 반환 모델이 필요합니다.",
      "tasks": [
        "성공 결과와 실패 결과의 정보를 정하세요.",
        "record와 sealed로 결과 종류를 모델링하세요.",
        "새 실패 종류를 추가했을 때 호출 코드가 검토해야 할 지점을 설명하세요."
      ],
      "takeaway": "record를 골라 선언을 줄이기 전에 성공 때 줄 정보와 실패 때 줄 정보를 정하세요. sealed로 종류를 제한하면 새 종류 추가 시 어떤 호출부를 함께 검토해야 할지도 드러납니다."
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
    "exerciseId": "records-sealed-lab",
    "learningGuide": {
      "scenario": "양수의 두 배를 계산하되, 0 이하 입력은 값 대신 거절 이유를 반환하려 합니다. 호출자는 성공과 실패를 구별할 수 있어야 합니다.",
      "question": "Result 한 타입으로 받으면서도 성공 값과 실패 이유를 어떻게 나눠 표현할까요?",
      "terms": [
        {
          "term": "record",
          "meaning": "구성 요소를 선언하면 그 값을 담는 필드·접근자·동등성 등의 기본 동작을 제공하는 클래스."
        },
        {
          "term": "sealed",
          "meaning": "직접 하위 타입으로 허용할 종류를 선언에서 제한하는 기능."
        },
        {
          "term": "값 동등성",
          "meaning": "같은 인스턴스인지가 아니라, 타입이 정한 값 기준으로 같은지 비교하는 것. record는 구성 요소를 사용합니다."
        }
      ],
      "walkthrough": [
        "Result는 직접 구현할 타입을 Success와 Failure로 제한합니다. Success는 value를, Failure는 reason을 보관합니다.",
        "doublePositive(3)은 value <= 0을 통과하지 않고 Math.multiplyExact로 6을 계산해 Success로 반환합니다.",
        "전체 예제의 main은 그 결과를 새 Success(6)과 비교합니다. 같은 record 타입과 값이므로 true입니다.",
        "doublePositive(0)은 첫 조건에서 Failure를 반환합니다. reason은 positive-required이며 아래의 곱셈 줄에는 도달하지 않습니다."
      ],
      "prediction": {
        "question": "doublePositive(0)은 숫자 0이나 Success(0)을 돌려줄까요?",
        "answer": "Failure[reason=positive-required]에 해당하는 Failure 객체를 반환합니다.",
        "explanation": "메서드의 입력 정책이 0 이하를 거절하도록 정해져 있습니다. record와 sealed는 그 정책의 결과를 표현하며, 정책 자체를 자동으로 정해 주지는 않습니다."
      },
      "takeaway": "반환값이 false 하나라서 호출자가 후속 행동을 결정하지 못한다면, 성공 데이터와 실패 이유를 드러내는 결과 타입을 검토하세요.",
      "code": {
        "file": "examples/java17/records-sealed/Main.java",
        "source": "    sealed interface Result permits Success, Failure {}\n    record Success(int value) implements Result {}\n    record Failure(String reason) implements Result {}\n\n    static Result doublePositive(int value) {\n        if (value <= 0) {\n            return new Failure(\"positive-required\");\n        }\n        return new Success(Math.multiplyExact(value, 2));\n    }"
      }
    }
  },
  {
    "id": "java21",
    "title": "Java 21: 패턴 분기와 가상 스레드",
    "description": "Job의 종류와 attempts 값을 함께 보고 이름을 붙입니다. 이 분기 코드와 가상 스레드 실행기의 역할을 나누어 읽습니다.",
    "track": "advanced",
    "level": "심화",
    "minVersion": 21,
    "featureSince": 21,
    "preview": false,
    "duration": 50,
    "category": "버전 전환",
    "goals": [
      "Job 패턴에서 name·attempts를 꺼내고 when 조건으로 분기를 고르는 과정을 설명한다.",
      "0회·null·다른 타입의 입력이 어느 분기에 도달하는지 예측한다.",
      "가상 스레드가 바꾸는 실행 방식과 바꾸지 않는 CPU·외부 자원 한계를 구분한다."
    ],
    "theory": [
      {
        "heading": "타입과 상태를 함께 드러내는 패턴",
        "text": "label은 입력이 Job이고 attempts가 양수이면 name:attempts를 만듭니다. case Job(String name, int attempts)가 구성 요소를 꺼내는 record pattern이고, when attempts > 0은 추가로 만족해야 할 가드 조건입니다. 나머지 Job은 다음 case로, null은 case null로 갑니다. 앞의 넓은 패턴이 뒤의 구체 패턴을 모두 포함해 버리면 그 분기는 가려질 수 있습니다. 모든 입력을 처리할 분기가 있는지도 확인해야 합니다. 이 record pattern과 pattern switch는 Java 21의 정식 기능입니다."
      },
      {
        "heading": "가상 스레드는 더 빠른 CPU 스레드가 아니다",
        "text": "main은 label 계산을 newVirtualThreadPerTaskExecutor에 제출합니다. 가상 스레드는 JVM이 관리하며, 많은 작업이 I/O를 기다리는 상황을 감당하는 데 도움이 될 수 있습니다. 하지만 이 예제의 문자열 계산 한 건이 더 빨라졌음을 뜻하지 않습니다. CPU 계산량은 그대로이고 DB 연결 10개만 허용되는 서비스가 가상 스레드를 많이 만든다고 연결도 늘어나지는 않습니다. 동시 요청 수·시간 제한·작업 종료를 외부 자원 한계에 맞춰 따로 관리하세요."
      },
      {
        "heading": "대상 버전의 실행 특성으로 판단한다",
        "text": "Java 21에서는 가상 스레드가 synchronized 블록·메서드 안에서 블로킹할 때 이를 실행하는 플랫폼 스레드인 carrier를 놓지 못하는 pinning을 고려해야 합니다. 빈번하고 오래 걸리는 경우 확장성을 떨어뜨릴 수 있으므로 실제 대기와 관측 결과를 봐야 합니다. 이후 JDK의 개선을 Java 21에도 있다고 가정하지 마세요. 이 수업은 preview 기능 없이 패턴 분기와 가상 스레드 사용을 보여 줍니다. 성능 개선 여부는 기존 테스트·지표·부하 비교로 별도 확인해야 합니다."
      }
    ],
    "example": {
      "title": "패턴 분기 작업을 실행하고 기다리기 · Main.java",
      "code": "class Main {\n    record Job(String name, int attempts) {}\n\n    static String label(Object value) {\n        return switch (value) {\n            case Job(String name, int attempts) when attempts > 0 ->\n                    name + \":\" + attempts;\n            case Job job -> \"not-started\";\n            case null -> \"missing\";\n            default -> \"unknown\";\n        };\n    }\n\n    public static void main(String[] args) throws Exception {\n        try (java.util.concurrent.ExecutorService executor =\n                     java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {\n            java.util.concurrent.Future<String> result =\n                    executor.submit(() -> label(new Job(\"sync\", 2)));\n            System.out.println(result.get());\n            System.out.println(label(null));\n        }\n    }\n}",
      "output": "sync:2\nmissing",
      "explanation": "제출한 작업은 label에 Job(\"sync\", 2)를 넘깁니다. Job 패턴에 맞고 attempts > 0도 참이므로 sync:2를 반환합니다. main은 result.get으로 작업 결과를 기다린 다음 출력합니다. label(null)은 명시한 case null에서 missing을 돌려줍니다. try-with-resources는 실행기를 닫는 시점을 정하며, 이 짧은 실행은 성능 비교 실험이 아닙니다."
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
        "explanation": "가상 스레드는 대기하는 작업을 많이 두는 비용을 줄이는 데 도움이 될 수 있습니다. CPU 계산을 자동으로 빠르게 하거나 DB 연결 풀·외부 API 허용량을 늘리는 기능은 아닙니다. 그 자원들의 동시 사용 제한은 따로 필요합니다."
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
        "explanation": "입력이 Order 패턴에 맞아 구성 요소를 꺼낼 수 있고, 꺼낸 quantity가 0보다 커야 이 case를 선택합니다. 같은 Order라도 quantity가 조건에 맞지 않으면 이 가드가 붙은 분기에 일치하지 않습니다."
      }
    ],
    "practice": {
      "title": "버전 상향의 효과와 위험 설명",
      "scenario": "Java 17 서비스에서 타입별 if 분기가 길어졌습니다. 한편 외부 호출을 기다리는 작업도 많아, 분기 문법을 바꾸는 효과와 실행 방식을 바꾸는 효과를 각각 확인하려 합니다.",
      "tasks": [
        "패턴 분기에서 null·알 수 없는 타입·경계 상태를 테스트하세요.",
        "가상 스레드 적용 전후 비교에 필요한 대기·CPU·외부 자원 지표를 정하세요.",
        "외부 연결 수 제한과 취소·종료 정책을 설명하세요."
      ],
      "takeaway": "분기 코드가 읽기 쉬워진 것과 서비스 처리량이 좋아진 것은 다른 결과입니다. 입력 반례로 문법 변경을 검증하고 실제 부하·외부 자원 지표로 실행 모델 변경을 검증하세요."
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
    "exerciseId": "java21-lab",
    "learningGuide": {
      "scenario": "작업 Job에는 name과 attempts가 있습니다. 시도 횟수가 양수이면 sync:2처럼 표시하고, 아직 시도하지 않은 Job이나 값이 없는 경우는 다른 이름을 붙입니다.",
      "question": "Job이라는 타입 확인만으로 첫 번째 case를 선택할 수 있을까요?",
      "terms": [
        {
          "term": "record pattern",
          "meaning": "record 타입이 맞는지 보면서 구성 요소를 변수로 꺼내는 패턴."
        },
        {
          "term": "가드 when",
          "meaning": "타입 패턴에 맞은 뒤에도 추가로 참이어야 하는 조건."
        },
        {
          "term": "분기의 포괄성",
          "meaning": "가능한 입력을 처리할 분기가 빠지지 않았는지 보는 성질."
        },
        {
          "term": "가상 스레드",
          "meaning": "JVM이 관리하는 스레드. 분기 결과의 의미를 바꾸지 않으며 CPU 계산을 자동 가속하지 않습니다."
        }
      ],
      "walkthrough": [
        "label에 Job(\"sync\", 2)가 들어오면 첫 패턴에서 name은 sync, attempts는 2가 됩니다.",
        "when attempts > 0이 참이므로 첫 분기가 sync:2를 반환합니다.",
        "Job이지만 가드가 거짓이면 다음 case Job job에서 not-started를 반환합니다.",
        "입력이 null이면 case null에서 missing을, 나머지 타입이면 default에서 unknown을 반환합니다. 각 case의 범위와 순서가 결과를 정합니다."
      ],
      "prediction": {
        "question": "Job의 attempts가 0인 경우와 입력이 null인 경우에 각각 무엇을 반환할까요?",
        "answer": "각각 not-started와 missing입니다.",
        "explanation": "0은 양수 가드를 통과하지 못하지만 Job 타입에는 맞습니다. null은 일반 Job 분기가 아니라 명시한 case null에서 처리합니다."
      },
      "takeaway": "타입을 확인한 뒤 필드를 다시 꺼내는 코드를 읽을 때, 패턴·추가 조건·null 처리를 한곳에 모으면 어떤 입력이 어느 분기로 가는지 확인하기 쉬워집니다.",
      "code": {
        "file": "examples/java21/java21/Main.java",
        "source": "    static String label(Object value) {\n        return switch (value) {\n            case Job(String name, int attempts) when attempts > 0 ->\n                    name + \":\" + attempts;\n            case Job job -> \"not-started\";\n            case null -> \"missing\";\n            default -> \"unknown\";\n        };\n    }"
      }
    }
  },
  {
    "id": "testing-design",
    "title": "테스트 설계: 계약과 경계 결함 구별",
    "description": "무료 배송 조건의 >=를 >로 잘못 바꿨을 때 어떤 검사가 실패해야 할까요? 실제 경계값과 기대값으로 테스트의 역할을 확인합니다.",
    "track": "both",
    "level": "심화",
    "minVersion": 8,
    "featureSince": null,
    "preview": false,
    "duration": 45,
    "category": "실패와 검증",
    "goals": [
      "29999·30000·30001의 기대 배송비를 요구사항에서 먼저 정한다.",
      "음수 입력이 정상 반환하면 테스트 자체가 실패하도록 만드는 이유를 설명한다.",
      "테스트가 찾을 수 있는 결함과 다루지 않은 범위를 구분한다."
    ],
    "theory": [
      {
        "heading": "테스트는 구현을 복사하지 않는다",
        "text": "요구사항이 ‘30000 이상은 무료 배송’이라면 29999는 3000, 30000과 30001은 0이어야 합니다. 테스트의 기대값은 이 문장에서 정합니다. shippingFee의 조건문을 테스트 안에 그대로 복사해 기대값을 계산하면, 두 곳에 같은 실수가 들어가도 통과할 수 있습니다. 동작이 바뀌는 값 바로 아래·그 값·바로 위를 경계값이라고 부릅니다. 이 값들을 고르면 >=를 >로 잘못 바꾸는 결함을 드러낼 수 있지만 모든 입력에 대한 증명이 되는 것은 아닙니다."
      },
      {
        "heading": "테스트 가능성은 의존 관계와 연결된다",
        "text": "shippingFee는 subtotal만 받아 결과를 계산하므로 같은 입력으로 반복 확인하기 쉽습니다. 계산 안에서 현재 시간·무작위 값·네트워크·DB를 직접 읽으면 같은 테스트도 조건에 따라 달라질 수 있습니다. 필요한 외부 값을 계산과 분리하거나 협력 객체로 전달하면 조건을 통제할 수 있습니다. 테스트에서 진짜 외부 시스템 대신 쓰는 객체를 대역이라고 합니다. 대역으로 계산을 확인한 단위 테스트와 실제 DB·네트워크 연결을 확인하는 통합 테스트는 서로 다른 범위를 봅니다."
      },
      {
        "heading": "좋은 테스트는 잘못된 구현을 거절한다",
        "text": "check(0, shippingFee(30000))는 무료 배송 경계가 잘못되면 AssertionError를 던집니다. 음수 검사에서는 shippingFee(-1)이 예외 없이 돌아오면 오히려 테스트 쪽에서 AssertionError를 던집니다. 기대한 실패가 없다는 것도 결함이기 때문입니다. 이런 검사가 잘못된 구현을 걸러내는 힘을 테스트의 판별력이라고 부릅니다. 실무에서는 JUnit이 실패 위치와 실행 관리를 돕지만, 이 예제는 의존성 없는 Java 메서드로 원리를 보여 줍니다."
      }
    ],
    "example": {
      "title": "기대값을 명시하는 작은 계약 검사 · Main.java",
      "code": "class Main {\n    static int shippingFee(int subtotal) {\n        if (subtotal < 0) {\n            throw new IllegalArgumentException(\"negative subtotal\");\n        }\n        return subtotal >= 30000 ? 0 : 3000;\n    }\n\n    static void check(int expected, int actual) {\n        if (expected != actual) {\n            throw new AssertionError(\"expected=\" + expected + \", actual=\" + actual);\n        }\n    }\n\n    public static void main(String[] args) {\n        check(3000, shippingFee(29999));\n        check(0, shippingFee(30000));\n        check(0, shippingFee(30001));\n        try {\n            shippingFee(-1);\n            throw new AssertionError(\"negative input must fail\");\n        } catch (IllegalArgumentException expected) {\n            // Expected contract failure.\n        }\n        System.out.println(\"4 contract checks passed\");\n    }\n}",
      "output": "4 contract checks passed",
      "explanation": "앞의 세 check는 경계 아래·경계·경계 위의 배송비를 직접 비교합니다. 다음 try는 음수 입력이 IllegalArgumentException을 던지는지 확인합니다. 정상 반환한다면 테스트가 AssertionError를 던져 실패합니다. 네 검사를 모두 지나야 마지막 문장이 출력됩니다. check의 if와 throw는 -ea 옵션이 필요한 assert 문을 사용하지 않으며, 이 예제가 JUnit의 전체 기능을 대체하는 것은 아닙니다."
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
        "explanation": "29999는 아직 유료, 30000부터는 무료라는 차이를 직접 관찰하는 입력입니다. >=를 >로 잘못 바꾸면 30000 검사가 실패합니다. 같은 쪽에만 있는 1000·2000·3000은 이 결함을 드러내지 못합니다."
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
        "explanation": "틀린 구현도 통과한다면 그 차이가 드러나는 입력이나 기대값을 검사하지 않았을 수 있습니다. 실제 check가 실행되는지도 확인해야 합니다. 같은 검사를 많이 반복하는 것보다 해당 오답이 실패하는 사례를 추가하는 것이 먼저입니다."
      }
    ],
    "practice": {
      "title": "배송비 정책을 검증하는 테스트 작성",
      "scenario": "무료 배송 조건이 >=에서 >로 바뀌었는데 기존 테스트는 계속 통과했습니다. 테스트가 1000원과 100000원 주문만 확인해 정확히 30000원인 경우를 놓쳤기 때문입니다.",
      "tasks": [
        "정상·경계·실패 대표값을 기대 결과와 함께 정하세요.",
        "정상 구현은 수용하고 경계가 틀린 구현은 거절하는 검사 함수를 만드세요.",
        "실무 도구로 옮길 때 필요한 실패 메시지와 단위·통합 검사 범위를 설명하세요."
      ],
      "takeaway": "테스트 이름이나 실행 횟수만 보지 말고, 어떤 잘못된 구현이 어느 입력에서 실패하는지 설명하세요. 실행 성공·계약 확인·설계 설명은 각각 확인해야 합니다."
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
    "exerciseId": "testing-design-lab",
    "learningGuide": {
      "scenario": "배송비 정책은 30000 이상 무료, 그 미만 3000이며 음수 금액은 거절합니다. 정상 코드를 통과시키는 것뿐 아니라 잘못 바뀐 경계도 잡아야 합니다.",
      "question": "어떤 줄이 >=를 >로 바꾼 실수를 잡고, 어떤 줄이 음수 검증 누락을 잡을까요?",
      "terms": [
        {
          "term": "계약 검사",
          "meaning": "구현 방식과 별개로, 약속한 입력·결과·실패를 실제 호출로 확인하는 검사."
        },
        {
          "term": "경계값",
          "meaning": "동작이 달라지는 값과 그 바로 주변의 값. 여기서는 30000과 양옆 금액입니다."
        },
        {
          "term": "테스트의 판별력",
          "meaning": "정상 구현은 통과시키고 중요한 잘못된 구현은 실패시키는 능력."
        }
      ],
      "walkthrough": [
        "첫 check는 29999의 배송비가 3000인지, 다음 두 check는 30000과 30001의 배송비가 0인지 비교합니다.",
        "check는 expected와 actual이 다르면 AssertionError를 던집니다. 조건을 >로 잘못 바꾸면 30000 검사에서 멈춥니다.",
        "음수 입력은 IllegalArgumentException이 나야 합니다. shippingFee(-1)이 정상 반환하면 다음 줄이 AssertionError를 던집니다.",
        "기대한 IllegalArgumentException만 catch한 뒤 네 검사를 모두 통과해야 마지막 출력에 도달합니다."
      ],
      "prediction": {
        "question": "shippingFee가 음수에서도 3000을 반환하도록 잘못 바뀌면 마지막 성공 문구가 출력될까요?",
        "answer": "출력되지 않습니다.",
        "explanation": "shippingFee(-1)이 정상 반환하면 바로 다음 줄의 AssertionError가 발생합니다. catch는 IllegalArgumentException만 받으므로 테스트 실패가 숨겨지지 않습니다."
      },
      "takeaway": "실패해야 하는 입력의 테스트에는 ‘예외가 안 나면 테스트가 실패하는가’까지 확인하세요. 기대값은 구현의 조건문을 복사하지 말고 업무 규칙에서 정합니다.",
      "code": {
        "file": "examples/java8/testing-design/Main.java",
        "source": "        check(3000, shippingFee(29999));\n        check(0, shippingFee(30000));\n        check(0, shippingFee(30001));\n        try {\n            shippingFee(-1);\n            throw new AssertionError(\"negative input must fail\");\n        } catch (IllegalArgumentException expected) {\n            // Expected contract failure.\n        }\n        System.out.println(\"4 contract checks passed\");"
      }
    }
  }
];
