# 이론 시각 자료 설계 기록

기준일: 2026-10-12. 대상은 다른 언어 경험자의 Java 전환 과정과 현직자 심화 과정이다. 기존 34개 수업의 본문·예제·과제 계약을 읽고 **12개 수업에 12개 도식, 25개 패널**을 선정했다. 이 문서는 선정 판단과 의미·접근성 계약을 기록한다. 화면 구현과 실제 합성 화면의 승인은 별도 검수 대상이다.

## 선정 기준

관계·순서·상태·비교 중 하나가 긴 설명을 대신하거나 자주 생기는 오해를 드러낼 때 채택한다. 도식마다 한 가지 학습 질문을 유지하고 기존 예제의 수치·이름·실행 전제를 우선 사용한다. 새 비교 사례가 필요하면 예제의 실제 실행 기록과 구별한다.

모든 수업에 같은 형식의 그림을 붙이지 않는다. 짧은 코드·단언·SQL·설정 파일이 더 정확하거나, 이미 선정한 그림과 중복되거나, 현재 실습의 검증 범위를 넘겨 보일 경우 이번에는 제외한다. 비채택은 이후 교재 확장에서도 영구히 불필요하다는 뜻은 아니다.

## 34개 수업 평가

아래 표는 모든 현재 수업을 한 번씩 평가한다. 마지막 열은 채택 근거와 오해 방지 조건, 또는 비채택 이유를 함께 기록한다.

| 수업 ID | 판단 | 시각화 후보 축 | 판단 근거·오해 위험 |
| --- | --- | --- | --- |
| `java-basics` | 채택 | 참조 변수와 객체, 두 시점의 비교 | 동일한 객체를 공유하는 것과 매개변수 재할당을 분리한다. 메모리 주소·JVM 배치를 그린 것으로 보이지 않게 한다. |
| `oop` | 채택 | 성공·실패 전후 객체 상태 | 불변식이 성공뿐 아니라 거절 뒤에도 유지됨을 수치로 확인한다. private이나 단일 필드가 동시성까지 보장하는 것으로 확대하지 않는다. |
| `polymorphism` | 채택 | 호출자·계약·협력 구현의 관계 | 같은 Report가 다른 Formatter로 동작하는 예제를 연결한다. 상속도·Spring 컨테이너·LSP 자동 보장으로 읽지 않게 한다. |
| `collections` | 채택 | equals와 hashCode의 비대칭 계약 | 같음이면 같은 해시라는 요구와 그 역의 반례를 나란히 둔다. HashMap 내부 알고리즘으로 설명을 확대하지 않는다. |
| `generics` | 채택 | 읽기·쓰기의 정적 타입 비교 | extends와 super에서 각각 안전한 연산을 구별한다. 완전한 읽기 전용·쓰기 전용이나 런타임 변경 가능성 보장으로 오해하지 않게 한다. |
| `exceptions` | 비채택 | 자원 소유권·닫기 순서 | 잠재 이득은 있으나 현재 예제의 단일 Reader와 원인 예외는 코드로 추적하기 짧다. 다중 자원 역순 해제 그림은 예제에 없는 경우를 늘려 이번에 넣지 않는다. |
| `streams` | 채택 | 파이프라인 구성과 최종 소비 | 지연 실행의 두 단계를 분리한다. 중간 연산마다 임시 List가 생기거나 콜백 횟수가 고정된다는 인상을 피한다. |
| `concurrency` | 채택 | 복합 증가와 원자 증가의 비교 | volatile이어도 잃어버린 증가가 가능한 한 사례를 보여 준다. 화살표를 happens-before·측정된 시각·모든 가능한 실행으로 단정하지 않는다. |
| `modern-apis` | 비채택 | 입력 정책·API 도입 버전 | 문자열 API의 차이는 현재 짧은 코드와 버전 표기가 더 직접적이다. HTTP 흐름을 추가하면 이 예제가 실제 네트워크 호출을 실행한 것으로 보일 수 있어 제외한다. |
| `records-sealed` | 비채택 | 허용 하위 타입·불변성 범위 | 현재 결과 종류가 적어 선언 코드만으로 관계를 확인할 수 있다. 단순 계층 그림은 record의 깊은 불변성을 보장한다는 오해를 풀지 못하므로 추가하지 않는다. |
| `java21` | 비채택 | 패턴 분기·가상 스레드 | 두 독립 개념을 한 그림으로 묶는 이득이 작다. 스케줄러 그림은 성능·pinning·실제 실행 범위를 과장하기 쉬워 버전 설명과 예제를 유지한다. |
| `testing-design` | 비채택 | 경계값·정책 변형의 비교 | 소수의 금액 경계는 입력·기대값과 테스트 코드로 확인하기 쉽다. 도식이 실제로 어떤 오답 구현을 거절하는지 가릴 수 있어 추가하지 않는다. |
| `build-maven` | 비채택 | 컴파일 대상·실행 JVM·의존성 | 구분 자체는 중요하지만 고정 POM과 기존 실행 환경 표기가 직접적인 근거다. 일반 파이프라인 그림으로 모든 실행 환경이 검증됐다는 인상을 더하지 않는다. |
| `test-contracts` | 비채택 | 성공·거절 후 상태 전이 | oop의 상태 그림과 중복이 크다. 이 단원은 같은 계약을 AssertJ 단언으로 어떻게 관찰하는지에 집중한다. |
| `test-collaborators` | 비채택 | 업무 객체와 테스트 대역 | 한 협력 인터페이스와 한 호출의 관계라 기존 짧은 코드로 충분하다. 외부 결제 서비스를 실제 통합한 것으로 읽힐 흐름도는 피한다. |
| `lombok-values` | 비채택 | 생성된 동등성·가변성 | equals/hashCode 도식과 겹친다. 애너테이션과 생성되는 계약, 엔티티에 적용할 때의 한계는 실제 선언·설명으로 비교한다. |
| `spring-di` | 비채택 | 컨테이너·생성자 주입·스코프 | 수동 주입은 polymorphism 도식에서 다룬다. 현재 작은 빈 구성에 추가 그림을 붙여 singleton과 스레드 안전성을 혼동할 여지를 늘리지 않는다. |
| `spring-aop` | 비채택 | 외부 호출과 자기 호출 | 시각적 이득은 높지만 tx-proxy에서 동일한 경계를 DB 결과까지 연결한다. 이 단원은 조언 호출 횟수의 코드·검사에 집중해 반복 그림을 줄인다. |
| `mvc-rest` | 비채택 | 전송 계약·업무 계약 | 정상·없는 자원의 상태 코드는 현재 요청과 테스트로 간명하다. 서버·네트워크 배치도는 MockMvc의 실제 검증 범위를 넘어서 제외한다. |
| `json-validation` | 비채택 | 역직렬화·필드 검증·업무 검증 | 단계 비교의 잠재 이득은 있으나 현재 입력 반례와 예외 코드가 짧다. 모든 요청이 같은 검사 순서를 거친다는 단순화 대신 명시적 실패 사례를 유지한다. |
| `sql-jdbc` | 비채택 | 조건부 UPDATE·트랜잭션·자원 수명 | 조건식과 영향 행 수는 SQL 코드가 정확한 표현이다. commit 경계는 tx-proxy와 kafka-idempotency에서 구체적인 실패 결과로 다루어 중복을 줄인다. |
| `mybatis-mapping` | 비채택 | XML 매핑·파라미터 바인딩 | 치환과 바인딩의 차이는 SQL 조각 비교가 가장 직접적이다. 일반 화살표가 모든 동적 SQL의 안전성을 보장하는 것으로 읽히지 않도록 추가하지 않는다. |
| `jpa-state` | 채택 | 관리·분리 상태의 DB 결과 비교 | 같은 필드 변경이 다른 저장 결과를 내는 이유를 보여 준다. 두 패널의 독립 초기값, flush와 commit 차이, merge 생략을 명시한다. |
| `flyway-migrations` | 비채택 | 스키마 버전의 적용 순서 | 현재 V1·V2 두 SQL 파일은 순서가 짧고 명시적이다. 일반 DDL 상태도가 모든 DB에서 마이그레이션 전체의 원자성을 뜻하지 않게 추가하지 않는다. |
| `tx-proxy` | 채택 | 호출 경로·트랜잭션 진입·DB 결과 | 같은 대상 메서드여도 조언 진입 여부가 결과를 바꾸는 반례를 보여 준다. 기존 트랜잭션 없는 조건과 기본 롤백 정책을 한정한다. |
| `optimistic-cancel` | 비채택 | 오래된 버전·경쟁하는 취소 | 두 컨텍스트의 충돌 그림은 잠재 이득이 높다. 이번에는 JPA 상태와 원자성 도식을 먼저 두고, 자동 재시도·외부 효과까지 해결한다는 오해를 피하도록 현재 검사 코드로 경계를 드러낸다. |
| `security-csrf` | 채택 | 독립 요청 네 개의 조건 비교 | 인증·역할·CSRF 실패를 하나씩 분리해 관찰한다. 공통 필터 실행 순서나 모든 설정의 보편적 응답 코드로 표현하지 않는다. |
| `oidc-identity` | 비채택 | 프로토콜 역할·issuer와 subject | 교재 실습은 테스트 주체의 식별 계약이다. 전체 로그인·리다이렉트 그림은 수행하지 않은 OIDC 통합으로 읽힐 위험이 커서 제외한다. |
| `jwt-validation` | 채택 | 서명과 수용 정책의 AND 관계 | 서명만 통과하면 수용한다는 오해를 교정한다. 디코더의 형식·typ 등 헤더 검사를 전제로 한 주요 조건이며 검사 순서도가 아님을 밝힌다. |
| `redis-cache` | 비채택 | 원본·캐시·무효화의 시간 차 | 현재 과제의 TTL·조회·무효화 계약을 넘어 DB와 연결한 cache-aside 전체 흐름을 그리면 없는 정합성 검증을 암시한다. 제공 연동 범위에 맞춘 코드와 조건을 유지한다. |
| `kafka-idempotency` | 채택 | DB 커밋과 오프셋 커밋 사이 장애 | 두 성공 지점의 틈이 재전달로 이어지는 이유를 보여 준다. 제공 중복 메시지 테스트와 설명용 장애 시나리오를 분리하고 전역 exactly-once로 확대하지 않는다. |
| `observability` | 비채택 | 로그·지표·추적의 질문 비교 | 세 신호의 분류는 짧은 문장과 지표 코드로 충분하다. 수집기·대시보드 배치도는 현재 실습의 실제 exporter 검증 범위를 넘어서 제외한다. |
| `build-gradle-ci` | 비채택 | 빌드·이미지·CI 산출물 연결 | 구성 파일 비교가 기준 버전과 실패 조건을 직접 드러낸다. 전체 배포 흐름을 그려 제공된 모든 환경이 실행 검증됐다고 보이게 하지 않는다. |
| `orders-capstone` | 비채택 | 주문·재고·취소의 통합 관계 | 대상 경계가 넓어 한 도식에 담으면 정보 밀도가 높아진다. 선정한 상태·트랜잭션·보안 그림의 개념을 코드로 통합하며, 완전한 운영 아키텍처처럼 보이는 종합 그림은 이번에 추가하지 않는다. |

## 데이터와 화면의 계약

자료는 [lesson-visuals.js](../dist/data/lesson-visuals.js)의 `export const lessonVisuals` 객체다. 기존 수업 ID가 키이며 도식별 식별자 `id`는 전체에서 고유하다. 자료는 정적 HTML/SVG 문자열을 포함하지 않는 구조 데이터다.

| 필드 | 의미와 수용 조건 |
| --- | --- |
| `title`, `caption` | 학습 질문과 그림의 전제. 예제의 관찰인지 설명용 사례인지 밝힌다. |
| `kind` | `flow`, `state`, `comparison`, `relationship` 중 하나. 스타일 선택용이며 화살표에 암묵적 실행 의미를 부여하지 않는다. |
| `afterSection` | 관련 이론 절 뒤의 0부터 시작하는 삽입 위치. 각 수업의 이론 절 범위 안이어야 한다. |
| `altText` | 배치·색을 보지 않아도 이해할 수 있는 개념 요약. 화면에는 동일 의미를 가진 본문 텍스트도 제공한다. |
| `readingOrder` | 두 시점·독립 실행·논리 조건 등 자료에 맞는 읽기 순서. 모든 값은 문자열이다. |
| `panels` | 비교 단위. 패널 제목에 비교 축과 실행 전제를 드러낸다. 패널당 노드는 2~8개, 전체 패널은 최대 4개로 제한했다. |
| `nodes` | 패널 내부에서 고유한 ID와 `label`, `detail`, 보조 색상용 `tone`. 의미는 텍스트로 완결된다. |
| `edges` | 같은 패널 안의 노드만 참조하는 `from`, `to`, `label`. 관계 이름을 생략하지 않는다. |
| `takeaway`, `limits` | 배울 판단과 생략·적용 범위. 실행되지 않은 시나리오와 구현별 계약을 드러낸다. |
| `sources` | 공식 자료의 제목·HTTPS URL·문서 판·확인일. 그림 자체의 주장은 본문과 범위 설명을 함께 읽어야 한다. |

카드의 DOM 순서가 기본 읽기 순서다. flow/state의 인접 노드 연결은 본문 이름과 함께 표시하며, 되돌림·분기·비인접 관계는 이름 있는 연결 행으로 보완한다. comparison과 relationship은 배열 순서만으로 실행 선후를 만들지 않는다. 비교 패널의 참조 관계는 “함께 볼 연결 관계”처럼 중립적인 제목으로 읽힌다.

모든 필드는 일반 텍스트로 출력한다. `List<? extends Number>` 같은 제네릭 문법을 HTML로 해석하지 않는다. 화살표 SVG가 사용되더라도 장식으로 취급하며 핵심 의미는 노드 텍스트와 연결 이름으로 제공한다. 색상·화살표·공간적 좌우 위치만으로 정답이나 의미를 전달하지 않는다. 의미 없는 재생·단계 이동 버튼을 추가하지 않는다.

## 정확성 경계

- 값 전달 그림은 변수와 객체를 별도 카드로 표시한다. A·B는 설명용 이름이며 물리 메모리 주소가 아니다.
- OOP의 실패 후 잔액 보존은 예제의 업무 설계이며 `private`가 자동으로 보장하는 기능이 아니다. 다형성 관계도도 행동 계약의 증명을 대신하지 않는다.
- 컬렉션 그림의 화살표는 `equals`와 `hashCode`의 논리 관계다. `Aa`와 `BB`의 해시 2112는 String 명세의 계산에 따른 반례다.
- PECS 그림은 컴파일 시 타입 안전성을 비교한다. `extends` 자체가 null 추가·제거 연산을 금지하거나 컬렉션을 불변으로 만들지 않는다.
- 동시성 화살표는 가능한 끼어들기 사례다. JMM happens-before 관계나 실제 실행 시각·관측 로그가 아니다.
- JPA 두 패널은 각각 DB 수량 2에서 출발하는 독립 테스트다. flush와 commit을 구별하며 merge를 원래 객체의 자동 재부착으로 그리지 않는다.
- 트랜잭션 프록시 비교는 호출 전 열린 트랜잭션이 없는 예제다. 자기 호출도 외부에서 이미 연 트랜잭션 안에서는 실행될 수 있다.
- CSRF의 네 패널은 독립 요청이다. 인증·인가·CSRF가 모든 설정에서 고정된 순서와 응답 코드를 갖는다는 설명이 아니다.
- JWT 그림은 디코더의 형식·헤더 검사를 통과했다는 전제 아래 주요 수용 조건을 AND로 연결한다. `typ` 기본 검사는 생략 범위에 적고, 시간·필수 claim 규칙은 이 실습의 정책으로 한정한다.
- Kafka 그림은 DB 성공 뒤 오프셋 커밋 전 장애 가능성을 설명한다. 제공 검사는 같은 payload의 중복 메시지를 모델링하며 브로커 장애·재시작 복구를 실제 재현한 그림으로 표시하지 않는다.
- 전체 OIDC 로그인 흐름, Redis와 DB의 완전한 정합성 알고리즘, 운영 배포 아키텍처는 현재 교재의 실행 범위와 혼동될 수 있어 추가하지 않았다.

## 채택 자료의 공식 근거

같은 출처가 언어·라이브러리의 보장을 설명하더라도 잔액 규칙·실습의 응답 코드·JWT 수용 정책 같은 업무 계약은 해당 수업의 예제·기준 테스트와 대조했다. 공식 근거가 프로젝트별 정책을 보장한다고 표현하지 않는다. 모든 도식의 확인일은 2026-10-12다.

| 수업 | 공식 출처 |
| --- | --- |
| `java-basics` | [Oracle Tutorial — Passing Reference Data Type Arguments](https://docs.oracle.com/javase/tutorial/java/javaOO/arguments.html) |
| `oop` | [Oracle Tutorial — Classes](https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html) · [JLS — Access Control](https://docs.oracle.com/javase/specs/jls/se8/html/jls-6.html#jls-6.6) |
| `polymorphism` | [Oracle Tutorial — Interfaces](https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html) · [Oracle Tutorial — Lambda Expressions](https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html) |
| `collections` | [Java API — Object.hashCode and equals](https://docs.oracle.com/javase/8/docs/api/java/lang/Object.html#hashCode--) · [Java API — String.hashCode](https://docs.oracle.com/javase/8/docs/api/java/lang/String.html#hashCode--) |
| `generics` | [Oracle Tutorial — Upper Bounded Wildcards](https://docs.oracle.com/javase/tutorial/java/generics/upperBounded.html) · [Oracle Tutorial — Lower Bounded Wildcards](https://docs.oracle.com/javase/tutorial/java/generics/lowerBounded.html) · [Oracle Tutorial — Guidelines for Wildcard Use](https://docs.oracle.com/javase/tutorial/java/generics/wildcardGuidelines.html) |
| `streams` | [Java API — Stream package, pipelines and laziness](https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html) · [Java API — Stream](https://docs.oracle.com/javase/8/docs/api/java/util/stream/Stream.html) |
| `concurrency` | [JLS — Memory Model and happens-before](https://docs.oracle.com/javase/specs/jls/se8/html/jls-17.html#jls-17.4.5) · [Java API — AtomicInteger.incrementAndGet](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/atomic/AtomicInteger.html#incrementAndGet--) · [Java API — ExecutorService memory consistency](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ExecutorService.html) |
| `jpa-state` | [Hibernate User Guide — Persistence Context](https://docs.hibernate.org/orm/6.6/userguide/html_single/#pc) · [Jakarta Persistence specification](https://jakarta.ee/specifications/persistence/3.1/) |
| `tx-proxy` | [Spring — Using @Transactional, proxy mode](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html) · [Spring — Rolling Back a Declarative Transaction](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/rolling-back.html) |
| `security-csrf` | [Spring Security — CSRF](https://docs.spring.io/spring-security/reference/6.5/servlet/exploits/csrf.html) · [Spring Security — Authorize HttpServletRequests](https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/authorize-http-requests.html) |
| `jwt-validation` | [Spring Security — JWT Resource Server validation](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html) · [RFC 7519 — JSON Web Token claims](https://www.rfc-editor.org/rfc/rfc7519) · [Spring Security API — NimbusJwtDecoder default typ validation](https://docs.spring.io/spring-security/reference/6.5/api/java/org/springframework/security/oauth2/jwt/NimbusJwtDecoder.PublicKeyJwtDecoderBuilder.html#validateType(boolean)) |
| `kafka-idempotency` | [KafkaConsumer — Manual Offset Control and delivery semantics](https://kafka.apache.org/39/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html) · [Java API — JDBC Connection transactions](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/Connection.html) |

## 수용 기준과 검증 범위

데이터 수용 기준은 34개 현재 수업과 ID 정합성, 12개 도식의 고유 ID, 유효한 이론 삽입 위치, 패널 내부 노드·간선 참조, 비어 있지 않은 설명·한계·공식 출처다. 구조가 맞아도 설명과 예제 계약이 다르면 내용 검토에서 실패로 판정한다.

화면 수용 기준은 320/360/390 CSS px의 세로 배치, 태블릿·데스크톱의 비교 가독성, 작은 높이와 가로 화면, 200% 글자 확대에서 내용·연결 이름·출처의 잘림과 겹침이 없는 것이다. DOM 읽기 순서와 화면 순서가 일치하고 키보드로 공식 출처에 접근할 수 있어야 한다. 전체 화면을 보며 밀도·대비·여백을 판단한다. 브라우저 에뮬레이션과 실제 기기 검증을 구분한다.

2026-10-12 저자 검사 결과:

- `node --check dist/data/lesson-visuals.js` 실행: PASS.
- Node의 실제 모듈 import와 assertion 검사: 34개 수업, 12개 도식, 25개 패널, 80개 노드, 54개 연결, 26개 공식 출처 참조의 필수 필드·ID·삽입 위치·참조·HTTPS 정책 검사 PASS.
- 문서 평가 표와 현재 코어 12개·실무 22개 수업 ID 대조: 34개를 중복 없이 포함, 채택 12개·비채택 22개가 데이터와 일치하여 PASS.
- Java String API의 명세상 계산을 별도 JavaScript 계산으로 대조: `Aa`와 `BB` 모두 2112, 문자열은 서로 달라 PASS. Java 프로그램을 새로 실행한 결과로 표현하지 않았다.
- 원본 교재·실습·검증 메타데이터 170개 파일의 작업 전후 SHA-256 대조: 170개 모두 일치, 추가·삭제·변경 0개로 PASS. 이 작업의 쓰기 대상은 새 자료 파일과 이 문서뿐이다.
- Java/Maven 실행이나 실제 화면·스크린리더·물리 기기 검사를 이 콘텐츠 작업에서 수행하지 않았다. 기존 실행 검증 결과를 도식 추가의 근거로 재작성하지 않는다.

독립 내용 검토에서 제기된 JWT 디코더의 기본 `typ` 검사 전제 누락을 수정했고, 해당 공식 API 출처를 보강했다. 별도 조사 담당자가 수정본 12개 도식·34개 선정 판단·26개 고유 공식 URL의 원문을 검토하여 정확성·교육 기여 검수 PASS를 보고했다. 이 검토는 실제 화면·학습자 효과 측정 승인을 포함하지 않는다. 화면 검수 결과는 실제 수행한 담당자가 보고한다. 위 PASS는 데이터·문서·내용 검토 범위이며 화면·실제 기기 승인을 뜻하지 않는다.

