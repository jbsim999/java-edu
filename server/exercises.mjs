import { exercises } from '../dist/data/exercises.js';

// Trusted educational test expressions. Never evaluate expressions received from clients.
const checksById = {
  "java-basics-lab": [
    {
      "name": "내용이 같은 별도 객체",
      "expression": "new Solution().sameCode(new String(\"JAVA\"), new String(\"JAVA\"))"
    },
    {
      "name": "내용이 다른 코드",
      "expression": "!new Solution().sameCode(\"JAVA\", \"java\")"
    },
    {
      "name": "둘 다 null",
      "expression": "new Solution().sameCode(null, null)"
    },
    {
      "name": "왼쪽만 null",
      "expression": "!new Solution().sameCode(null, \"JAVA\")"
    },
    {
      "name": "오른쪽만 null",
      "expression": "!new Solution().sameCode(\"JAVA\", null)"
    },
    {
      "name": "빈 문자열",
      "expression": "new Solution().sameCode(\"\", \"\")"
    }
  ],
  "oop-lab": [
    {
      "name": "예약 성공과 초과 예약 실패",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { Solution inventory = new Solution(5); return inventory.reserve(3) && inventory.remaining() == 2 && !inventory.reserve(3) && inventory.remaining() == 2; }).get()"
    },
    {
      "name": "전량 예약",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { Solution inventory = new Solution(5); return inventory.reserve(5) && inventory.remaining() == 0; }).get()"
    },
    {
      "name": "0과 음수 예약의 상태 보존",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { Solution inventory = new Solution(5); return !inventory.reserve(0) && !inventory.reserve(-2) && inventory.remaining() == 5; }).get()"
    },
    {
      "name": "빈 재고",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { Solution inventory = new Solution(0); return !inventory.reserve(1) && inventory.remaining() == 0; }).get()"
    },
    {
      "name": "음수 초기 재고 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution(-1); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    }
  ],
  "polymorphism-lab": [
    {
      "name": "정액 정책 주입",
      "expression": "new Solution().payable(10000, amount -> 1000) == 9000"
    },
    {
      "name": "비율 정책 주입",
      "expression": "new Solution().payable(20000, amount -> amount / 10) == 18000"
    },
    {
      "name": "전액 할인",
      "expression": "new Solution().payable(5000, amount -> amount) == 0"
    },
    {
      "name": "음수 할인 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().payable(1000, amount -> -1); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    },
    {
      "name": "소계 초과 할인 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().payable(1000, amount -> 1001); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    },
    {
      "name": "음수 소계 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().payable(-1, amount -> 0); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    },
    {
      "name": "null 정책 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().payable(1000, null); return false; } catch (NullPointerException expected) { return true; } }).get()"
    },
    {
      "name": "정책 한 번 호출",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { java.util.concurrent.atomic.AtomicInteger calls = new java.util.concurrent.atomic.AtomicInteger(); int price = new Solution().payable(500, amount -> { calls.incrementAndGet(); return 100; }); return price == 400 && calls.get() == 1; }).get()"
    }
  ],
  "collections-lab": [
    {
      "name": "최초 등장 순서",
      "expression": "new Solution().uniqueCodes(java.util.Arrays.asList(\"B\", \"A\", \"B\")).equals(java.util.Arrays.asList(\"B\", \"A\"))"
    },
    {
      "name": "내용으로 중복 제거",
      "expression": "new Solution().uniqueCodes(java.util.Arrays.asList(new String(\"A\"), new String(\"A\"))).equals(java.util.Arrays.asList(\"A\"))"
    },
    {
      "name": "null 항목 한 번 유지",
      "expression": "new Solution().uniqueCodes(java.util.Arrays.asList(null, \"A\", null)).equals(java.util.Arrays.asList(null, \"A\"))"
    },
    {
      "name": "빈 입력",
      "expression": "new Solution().uniqueCodes(java.util.Collections.<String>emptyList()).isEmpty()"
    },
    {
      "name": "입력 보존과 새 리스트",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { java.util.List<String> input = new java.util.ArrayList<String>(java.util.Arrays.asList(\"A\", \"A\", \"B\")); java.util.List<String> result = new Solution().uniqueCodes(input); result.add(\"C\"); return result != input && input.equals(java.util.Arrays.asList(\"A\", \"A\", \"B\")); }).get()"
    }
  ],
  "generics-lab": [
    {
      "name": "Integer에서 Number로 복사",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { java.util.List<Integer> source = java.util.Arrays.asList(1, 2); java.util.List<Number> target = new java.util.ArrayList<Number>(); target.add(0.5); new Solution().copy(source, target); return target.equals(java.util.Arrays.<Number>asList(0.5, 1, 2)); }).get()"
    },
    {
      "name": "String에서 Object로 복사",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { java.util.List<Object> target = new java.util.ArrayList<Object>(); new Solution().copy(java.util.Arrays.asList(\"A\", \"B\"), target); return target.equals(java.util.Arrays.<Object>asList(\"A\", \"B\")); }).get()"
    },
    {
      "name": "빈 source와 기존 항목 유지",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { java.util.List<Integer> target = new java.util.ArrayList<Integer>(java.util.Arrays.asList(7)); new Solution().copy(java.util.Collections.<Integer>emptyList(), target); return target.equals(java.util.Arrays.asList(7)); }).get()"
    },
    {
      "name": "source 보존",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { java.util.List<Integer> source = new java.util.ArrayList<Integer>(java.util.Arrays.asList(3, 3)); java.util.List<Integer> target = new java.util.ArrayList<Integer>(); new Solution().copy(source, target); return source.equals(java.util.Arrays.asList(3, 3)) && target.equals(source); }).get()"
    }
  ],
  "exceptions-lab": [
    {
      "name": "공백을 포함한 유효 설정",
      "expression": "new Solution().parsePort(\" 8080 \") == 8080"
    },
    {
      "name": "양쪽 유효 경계",
      "expression": "new Solution().parsePort(\"1\") == 1 && new Solution().parsePort(\"65535\") == 65535"
    },
    {
      "name": "숫자 형식 오류의 원인 보존",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().parsePort(\"eighty\"); return false; } catch (IllegalArgumentException expected) { return expected.getCause() instanceof NumberFormatException; } }).get()"
    },
    {
      "name": "빈 문자열 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().parsePort(\"   \"); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    },
    {
      "name": "null 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().parsePort(null); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    },
    {
      "name": "아래쪽 범위 위반",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().parsePort(\"0\"); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    },
    {
      "name": "위쪽 범위 위반",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().parsePort(\"65536\"); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    }
  ],
  "streams-lab": [
    {
      "name": "조건 필터와 합계",
      "expression": "new Solution().totalPositiveEven(java.util.Arrays.asList(2, -4, 3, null, 6, 0)) == 8"
    },
    {
      "name": "빈 입력의 항등값",
      "expression": "new Solution().totalPositiveEven(java.util.Collections.<Integer>emptyList()) == 0"
    },
    {
      "name": "모두 제외되는 입력",
      "expression": "new Solution().totalPositiveEven(java.util.Arrays.asList(null, -2, 0, 1)) == 0"
    },
    {
      "name": "중복 값 유지",
      "expression": "new Solution().totalPositiveEven(java.util.Arrays.asList(2, 2, 4)) == 8"
    },
    {
      "name": "입력 보존",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { java.util.List<Integer> input = new java.util.ArrayList<Integer>(java.util.Arrays.asList(2, 3, 4)); int result = new Solution().totalPositiveEven(input); return result == 6 && input.equals(java.util.Arrays.asList(2, 3, 4)); }).get()"
    }
  ],
  "concurrency-lab": [
    {
      "name": "두 작업의 완료 합계",
      "expression": "new Solution().count(2, 500) == 1000"
    },
    {
      "name": "증가 횟수 0",
      "expression": "new Solution().count(3, 0) == 0"
    },
    {
      "name": "단일 작업",
      "expression": "new Solution().count(1, 17) == 17"
    },
    {
      "name": "여러 작업의 누적",
      "expression": "new Solution().count(4, 2000) == 8000"
    },
    {
      "name": "workers 아래 경계 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().count(0, 1); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    },
    {
      "name": "workers 위 경계 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().count(9, 1); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    },
    {
      "name": "음수 반복 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().count(1, -1); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    },
    {
      "name": "반복 상한 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().count(1, 10001); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    }
  ],
  "modern-apis-lab": [
    {
      "name": "빈 줄 제거와 순서",
      "expression": "new Solution().normalizedLines(\"  Java\\n\\n SQL  \").equals(java.util.Arrays.asList(\"Java\", \"SQL\"))"
    },
    {
      "name": "유니코드 공백",
      "expression": "new Solution().normalizedLines(\"\\u2003Java\\u2003\\n\\u2003\").equals(java.util.Arrays.asList(\"Java\"))"
    },
    {
      "name": "CRLF와 중복 줄",
      "expression": "new Solution().normalizedLines(\"A\\r\\nA\\r\\n B \").equals(java.util.Arrays.asList(\"A\", \"A\", \"B\"))"
    },
    {
      "name": "빈 입력",
      "expression": "new Solution().normalizedLines(\"\").isEmpty()"
    },
    {
      "name": "null 입력 거절",
      "expression": "((java.util.function.Supplier<Boolean>) () -> { try { new Solution().normalizedLines(null); return false; } catch (IllegalArgumentException expected) { return true; } }).get()"
    }
  ],
  "records-sealed-lab": [
    {
      "name": "성공 결과의 값 동등성",
      "expression": "new Solution().reserve(5, 2).equals(new Solution.Accepted(3))"
    },
    {
      "name": "전량 예약",
      "expression": "new Solution().reserve(5, 5).equals(new Solution.Accepted(0))"
    },
    {
      "name": "초과 요청의 구체적 이유",
      "expression": "new Solution().reserve(2, 3).equals(new Solution.Rejected(\"insufficient-stock\"))"
    },
    {
      "name": "0 이하 요청",
      "expression": "new Solution().reserve(3, 0).equals(new Solution.Rejected(\"invalid-quantity\")) && new Solution().reserve(3, -1).equals(new Solution.Rejected(\"invalid-quantity\"))"
    },
    {
      "name": "초기 재고 검증 우선",
      "expression": "new Solution().reserve(-1, -1).equals(new Solution.Rejected(\"invalid-stock\"))"
    },
    {
      "name": "record 접근자",
      "expression": "new Solution.Accepted(7).remaining() == 7"
    }
  ],
  "java21-lab": [
    {
      "name": "양수 주문 패턴",
      "expression": "\"A-21:3\".equals(new Solution().describe(new Solution.Order(\"A-21\", 3)))"
    },
    {
      "name": "0 수량 주문",
      "expression": "\"empty\".equals(new Solution().describe(new Solution.Order(\"A\", 0)))"
    },
    {
      "name": "음수 수량 주문",
      "expression": "\"empty\".equals(new Solution().describe(new Solution.Order(\"A\", -1)))"
    },
    {
      "name": "null 분기",
      "expression": "\"missing\".equals(new Solution().describe(null))"
    },
    {
      "name": "다른 참조 타입",
      "expression": "\"unsupported\".equals(new Solution().describe(\"A\"))"
    },
    {
      "name": "다른 숫자 타입",
      "expression": "\"unsupported\".equals(new Solution().describe(Integer.valueOf(3)))"
    }
  ],
  "testing-design-lab": [
    {
      "name": "계약을 만족하는 정책 수용",
      "expression": "new Solution().acceptsPolicy(total -> { if (total < 0) throw new IllegalArgumentException(); return total >= 30000 ? 0 : 3000; })"
    },
    {
      "name": "무료 배송 시작점 결함 발견",
      "expression": "!new Solution().acceptsPolicy(total -> { if (total < 0) throw new IllegalArgumentException(); return total > 30000 ? 0 : 3000; })"
    },
    {
      "name": "너무 이른 무료 배송 발견",
      "expression": "!new Solution().acceptsPolicy(total -> { if (total < 0) throw new IllegalArgumentException(); return total >= 29999 ? 0 : 3000; })"
    },
    {
      "name": "주문액 0만 틀린 정책 발견",
      "expression": "!new Solution().acceptsPolicy(total -> { if (total < 0) throw new IllegalArgumentException(); if (total == 0) return 0; return total >= 30000 ? 0 : 3000; })"
    },
    {
      "name": "주문액 30001만 틀린 정책 발견",
      "expression": "!new Solution().acceptsPolicy(total -> { if (total < 0) throw new IllegalArgumentException(); if (total == 30001) return 3000; return total >= 30000 ? 0 : 3000; })"
    },
    {
      "name": "음수 처리 누락 발견",
      "expression": "!new Solution().acceptsPolicy(total -> total >= 30000 ? 0 : 3000)"
    },
    {
      "name": "고정 배송비 결함 발견",
      "expression": "!new Solution().acceptsPolicy(total -> { if (total < 0) throw new IllegalArgumentException(); return 3000; })"
    },
    {
      "name": "예상 밖 런타임 오류 발견",
      "expression": "!new Solution().acceptsPolicy(total -> { throw new IllegalStateException(); })"
    }
  ]
};

export const exerciseDefinitions = exercises.map(({ id, lessonId, minVersion, template, mode }) => ({
  id,
  lessonId,
  minVersion,
  template,
  mode,
  checks: checksById[id],
  sampleChecks: [checksById[id][0]],
}));
