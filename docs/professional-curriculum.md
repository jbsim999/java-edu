# 실무 교육 과정: 주문·재고·취소

기준일: 2026-10-12. 이 문서는 기존 Java 코어 12단원 뒤에 연결하는 실무 22단원의 교육·소스 계약입니다. 전체 교육 지도의 단계는 [교육 로드맵](education-roadmap.md)을 따릅니다. 완전 초보자의 첫 프로그래밍 과정이나 모든 운영 환경을 보장하는 인증 과정으로 소개하지 않습니다.

## 학습자와 선수 진단

다른 언어 경험자는 Java의 값 전달·타입·객체 불변식·동등성·제네릭·예외 소유권을 진단한 뒤 부족한 공통 코어를 학습합니다. 현직자는 같은 진단과 실행 과제로 공통 코어를 건너뛸 수 있습니다. 두 경로를 별도 교재로 복제하지 않습니다.

진단은 용어 암기만으로 통과시키지 않습니다. 실패 후 상태가 보존되는 이유, equals/hashCode와 컬렉션의 관계, checked 예외의 소유권, 한 스레드의 관찰과 JMM의 차이, 프록시와 실제 객체의 호출 경로를 코드와 반례로 설명해야 합니다. 다형성·LSP·상속과 합성·책임 배분이 부족하면 코어 OOP로 돌아갑니다.

이 실무 묶음의 컴파일 대상은 Java 17, 실행 요구는 Java 17 이상이고 기본 권장 JVM은 21입니다. Java 8·11·17·21의 언어·API 변화는 코어 수업에서 버전별로 학습합니다. 이 묶음에 Java 8/11용 Spring Boot 3 프로젝트가 있다고 표시하지 않습니다. Boot 2.7 유지보수와 8→11→17→21 마이그레이션은 별도 후속 단원으로 분리합니다. 날짜나 고정 학습 기간으로 숙련을 약속하지 않으며 lesson의 duration은 미실측 편집 추정치입니다.

## 모든 단원의 다섯 단계

1. **이론**: 단원이 해결할 질문과 객체·트랜잭션·전송 경계를 읽습니다.
2. **예시**: 하나의 Java 파일뿐 아니라 POM·SQL·XML·설정까지 함께 읽고 기준 구현의 선택 이유를 추적합니다.
3. **문제풀이**: 정상 사례 암기보다 개념 오해와 실제로 혼동할 대안을 구분하는 객관식 2문항을 풉니다.
4. **실무 심화**: 부분 실패·중복 요청·동시성·권한·운영 비용의 반례를 설명하고 대안의 비용을 비교합니다.
5. **직접 코딩**: 설치형 앱에서 지정된 파일을 편집하고 실제 JDK/Maven 및 필요한 학습 자원으로 실행합니다. 웹은 교재·예제·퀴즈·해설·공개 정답 비교·프로젝트 다운로드를 제공합니다.

코어의 클래스 골격형과 메서드 몸체형을 실무의 고정 멀티파일 프로젝트로 확장합니다. Java 과제는 클래스와 의존 관계를 읽으며 메서드 구현을 완성하고, MyBatis/Flyway는 SQL/XML 계약을 직접 수정합니다. POM·채점 테스트·일부 보조 파일은 실행 조건을 보존하기 위해 편집 대상에서 제외합니다. 공개 정답과 테스트는 학습용이며 부정행위를 막는 경쟁 채점 자료가 아닙니다.

## 22개 단원 지도

아래 순서는 안내 순서이며 실제 진입은 prerequisites를 따릅니다. 특히 JDBC 이후 MyBatis와 JPA는 비교 가능한 독립 선택 경로입니다. 두 기술을 반드시 차례대로 모두 익혀야 다음 단계로 갈 수 있다고 강제하지 않습니다. 트랜잭션 공통 경계에서 다시 만나며 낙관적 잠금 단원은 JPA 경로에 속합니다.

| 순서 | 단원 | 필수 선수 | 행동 기준 |
| --- | --- | --- | --- |
| 1 | [Maven으로 재현 가능한 주문 계산 빌드](../curriculum/professional/lessons/build-maven/lesson.json) | 코어:oop, 코어:testing-design | 정상 곱셈 / 0원 상품 / 잘못된 수량 거절 / 정수 오버플로 거절 |
| 2 | [JUnit·AssertJ로 경계와 상태 전이 검증](../curriculum/professional/lessons/test-contracts/lesson.json) | build-maven | 전량 예약 / 실패 후 상태 보존 / 생성 불변식 |
| 3 | [Mockito로 외부 협력의 실패를 통제](../curriculum/professional/lessons/test-collaborators/lesson.json) | test-contracts, 코어:polymorphism | 결제 한 번 호출 / 잘못된 입력에서 미호출 / 협력 오류 전파 |
| 4 | [Lombok 생성 코드와 동등성의 범위](../curriculum/professional/lessons/lombok-values/lesson.json) | test-contracts, 코어:collections | 같은 ID 동등성 / 가변 표시 값 제외 / HashSet 조회 유지 |
| 5 | [Spring IoC·DI와 객체 수명](../curriculum/professional/lessons/spring-di/lesson.json) | test-collaborators | 컨테이너 조립 / 정책 계약 / 기본 singleton 확인 |
| 6 | [프록시·AOP 호출 경로의 반례](../curriculum/professional/lessons/spring-aop/lesson.json) | spring-di | 외부 호출 advice / 자기 호출 우회 반례 |
| 7 | [MVC·REST의 상태 코드와 자원 계약](../curriculum/professional/lessons/mvc-rest/lesson.json) | spring-di | 기존 주문 조회 200 / 부재 주문 404 / 반복 조회 상태 보존 |
| 8 | [Jackson·Validation의 입력 경계](../curriculum/professional/lessons/json-validation/lesson.json) | mvc-rest | 정상 생성 201 / 0 수량·공백 sku 400 / 깨진 JSON·미지 필드 400 |
| 9 | [SQL·JDBC로 재고 변경과 롤백](../curriculum/professional/lessons/sql-jdbc/lesson.json) | test-contracts, 코어:exceptions | 성공 시 두 변경 커밋 / 재고 부족 상태 보존 / 중복 키 실패 재고 롤백 / 잘못된 입력 거절 |
| 10 | [MyBatis 파라미터 바인딩과 XML 매핑](../curriculum/professional/lessons/mybatis-mapping/lesson.json) | sql-jdbc | 명시적 열·속성 매핑 / 정확한 SKU 조회 / SQL 조각 입력을 값으로 취급 |
| 11 | [JPA·Hibernate의 상태와 변경 감지](../curriculum/professional/lessons/jpa-state/lesson.json) | sql-jdbc, lombok-values | 관리 엔티티 변경 감지 / 분리 객체 변경 비반영 / 실패 시 객체 수량 보존 |
| 12 | [Flyway로 스키마 변경을 기록](../curriculum/professional/lessons/flyway-migrations/lesson.json) | sql-jdbc | 두 버전 적용 / 재실행 시 0개 적용 / 중복 요청 키 거절 |
| 13 | [Spring 트랜잭션 프록시와 롤백 경계](../curriculum/professional/lessons/tx-proxy/lesson.json) | spring-aop, sql-jdbc | 외부 프록시 호출 롤백 / 자기 호출 반례 재현 / 호출 경로 설명 |
| 14 | [낙관적 잠금과 중복 취소의 의미](../curriculum/professional/lessons/optimistic-cancel/lesson.json) | jpa-state, tx-proxy | 취소 상태 전이 / 반복 취소 복원량 0 / 오래된 버전 커밋 거절 |
| 15 | [Spring Security의 인증·권한·CSRF](../curriculum/professional/lessons/security-csrf/lesson.json) | json-validation | 미인증 401 / 역할 부족 403 / CSRF 누락 403 / 허용된 요청 200 |
| 16 | [OAuth2·OIDC의 역할과 계정 식별 경계](../curriculum/professional/lessons/oidc-identity/lesson.json) | security-csrf | 미인증 401 / 신뢰한 issuer·subject 전달 / 비신뢰 issuer 403 / 이메일로 신원 병합하지 않음 |
| 17 | [JWT 서명·발급자·대상·만료 검증](../curriculum/professional/lessons/jwt-validation/lesson.json) | security-csrf | 정상 토큰 수용 / issuer·audience 불일치 거절 / 만료·미래 nbf 거절 / 다른 키 서명 거절 / 필수 claim 누락 거절 |
| 18 | [Redis TTL·무효화·키 소유권](../curriculum/professional/lessons/redis-cache/lesson.json) | tx-proxy | 문자열 수량 저장·조회 / 양수 TTL 설정 / 지정 키만 무효화 / 잘못된 캐시 입력 거절 |
| 19 | [Kafka 재전달과 DB 멱등 처리](../curriculum/professional/lessons/kafka-idempotency/lesson.json) | tx-proxy, flyway-migrations | 중복 이벤트 효과 한 번 / DB 실패 시 이벤트 기록 롤백 / 다른 payload 중복 ID 거절 / Kafka 전송 후 수동 오프셋 커밋 |
| 20 | [Micrometer 지표와 관측 실패 신호](../curriculum/professional/lessons/observability/lesson.json) | spring-di, test-collaborators | 성공·실패 계수 / 성공·실패 타이머 기록 / 예외 보존과 Observation 종료 / 주문 ID 태그 제외 |
| 21 | [Gradle·Docker·CI의 재현 조건](../curriculum/professional/lessons/build-gradle-ci/lesson.json) | build-maven, test-contracts | 동일 업무 합계 계약 / 잘못된 수량·오버플로 거절 / 두 빌드의 테스트 경로 설명 |
| 22 | [주문·예약·취소 통합 계약](../curriculum/professional/lessons/orders-capstone/lesson.json) | json-validation, tx-proxy, security-csrf, flyway-migrations | 입력·미인증 거절 / 동일 요청 멱등 처리 / payload 충돌과 재고 부족 롤백 / 다른 사용자 취소 거절 / 반복 취소 재고 한 번 복원 |

tx-proxy는 mybatis-mapping 또는 jpa-state 경험을 권장하지만 실제 필수 선수는 Spring AOP와 JDBC입니다. orders-capstone은 JDBC·Spring 트랜잭션 경로로 구현되어 JPA 선택자에게 JPA 엔티티 구현을 강제하지 않습니다. 보안·캐시·메시징은 주문의 기능 경계와 실패 의미가 준비된 뒤 학습합니다.

## 라이브러리를 배우는 깊이

- **JUnit·AssertJ·Mockito**: 상태와 반환값, 경계, 필수 협력 계약을 검증합니다. mock 호출 횟수만 통과했다고 업무 규칙이 완성됐다고 보지 않습니다. 테스트에서는 인터페이스 mock용 subclass mock maker를 명시합니다.
- **Lombok**: 줄 수 축소를 넘어 생성된 equals/hashCode·생성자·toString·setter의 실제 의미를 검토합니다. 가변 필드와 엔티티 연관관계에 모든 메서드를 기계적으로 생성하지 않습니다.
- **Spring IoC·DI·AOP**: 컨테이너별 수명, 공유 상태, 생성자 의존성, 외부 프록시 호출과 자기 호출을 구분합니다. SOLID를 클래스와 인터페이스 개수를 늘리는 규칙으로 적용하지 않습니다.
- **MVC·Jackson·Validation**: JSON 파싱·타입 변환·필드 검증·업무 불변식과 HTTP 상태의 책임을 구분합니다. 알 수 없는 필드 처리도 호환성 정책입니다.
- **SQL·JDBC·MyBatis·JPA·Flyway**: SQL 영향 행 수와 트랜잭션, 매핑, 영속 상태, 스키마 이력을 학습합니다. H2에서 통과한 결과를 PostgreSQL·MySQL·Oracle의 잠금·격리·DDL 호환성 검증으로 확대하지 않습니다.
- **Security·OAuth2·OIDC·JWT**: 인증과 URL 역할 권한, 자원 소유권, CSRF, issuer/subject 식별, 토큰 수용 정책을 분리합니다. 예제의 계정·키는 테스트 전용이며 실제 자격증명을 요구하지 않습니다.
- **Redis·Kafka**: 조회 캐시와 원본 DB, 만료와 일관성, 전달과 업무 효과를 구분합니다. Redis 분산 락이나 Kafka와 임의 DB의 자동 exactly-once를 구현했다고 표기하지 않습니다.
- **Micrometer·Gradle·Docker·CI**: 지표 태그 비용, 실패 신호, 검증한 커밋과 산출물의 연결을 학습합니다. 원격 exporter·운영 배포·이미지 보안·실제 Gradle 실행은 이 Maven 자동 검사에서 인증하지 않습니다.

## 완료 조건과 설명 루브릭

컴파일 성공, 테스트 통과, 설계 숙련은 서로 다른 상태로 표시합니다. 실행 성공만으로 수업을 완료하지 않습니다.

| 단계 | 확인할 증거 | 자동화 범위 |
| --- | --- | --- |
| 준비 | 컴파일 대상·실제 JVM·빌드 도구·의존성·자원 확인 | 설치형 환경 검사 |
| 실행 | 지정 파일이 컴파일되고 실제 프로세스가 종료됨 | 프로세스 결과 |
| 행동 | 정상·경계·실패 후 상태·권한 계약 검사를 통과 | 공개 ContractTest |
| 설명 | 실패 경계와 책임, 대안의 비용, 검증하지 못한 범위를 설명 | 학습자 기록 또는 별도 검토 |
| 통합 | 같은 업무 불변식이 HTTP·DB·보안 경계에서 유지됨 | capstone 검사와 설계 설명 |

설명 루브릭은 각 항목을 미제시 / 일부 근거 / 반례와 대안까지 설명으로 구분합니다. (1) 객체의 책임·상태 불변식, (2) 실패 후 남는 상태와 트랜잭션 소유권, (3) 의존 관계와 테스트 가능성, (4) 구현 대안의 비용, (5) 실제 실행 증거의 범위가 대상입니다. 이 루브릭을 자동 객관식 점수로 환산해 설계 능력을 보증하지 않습니다.

간단한 알고리즘 문제는 입력과 반환의 수학적 계약을 검사할 수 있지만 객체 설계는 협력·상태·실패·변경 비용까지 설명해야 합니다. capstone의 정답 구조를 그대로 복사한 경우도 대안 비교와 실패 설명이 남습니다.

## 소스와 실행 프로필 계약

정식 원본은 [catalog.json](../curriculum/professional/catalog.json), [profiles.json](../curriculum/professional/profiles.json), 각 lesson.json입니다. catalog의 exerciseId는 수업 ID에 -project를 붙인 값이고 모든 파일 경로는 curriculum/professional 기준 상대경로입니다.

```text
curriculum/professional/
  pom.xml                         공통 고정 빌드와 BOM
  profiles.json                   Java·의존성·자원 요구
  catalog.json                    수업 순서·선수·허용 파일
  lessons/<lesson-id>/
    lesson.json                   교재·퀴즈·과제 메타데이터
    reference/                    공개 기준 구현과 읽기 전용 설정
    starter/                      학습자의 출발 파일
    grader/src/test/java/         같은 계약을 검사하는 테스트
    grader/src/test/resources/    필요한 고정 테스트 설정
```

프로젝트 다운로드와 설치형 준비는 공통 parent pom.xml과 해당 단원의 reference 또는 starter 및 grader를 함께 보존해야 합니다. reference/pom.xml의 parent 경로는 ../../../pom.xml이고 테스트 경로는 ../grader/src/test/java입니다. Java 파일만 분리하면 이 빌드 계약이 유지되지 않습니다.

lesson의 example.files는 여러 기준 파일을 보여 주며 professionalExercise.files는 path·templatePath·referencePath·editable을 제공합니다. testFiles는 path·sourcePath를 갖습니다. editableFiles에 없는 파일을 임의로 편집하는 기능은 이 계약에 없습니다. 출판용 웹 코드와 실제 설치형 파일 로더는 별도 구현 담당자가 통합합니다.

프로필은 19종이며 compilerTarget=17, runtimeRequirement.minimumJava=17, recommendedJava=21을 분리합니다. Spring Boot BOM은 3.5.16으로 고정합니다. 실제 해석된 라이브러리 버전과 실제 JVM은 실행 증거에서 확인합니다. 공식 Boot 3.5 요구 사항은 Java 17 이상을 명시합니다. [Spring Boot 시스템 요구 사항](https://docs.spring.io/spring-boot/3.5/system-requirements.html)

dependencyDownload=explicit-toolchain-setup-only는 설치형의 명시적 환경 준비 단계에만 의존성 다운로드가 필요하다는 계약입니다. reference 테스트를 실행해 필요한 의존성·테스트 공급자를 준비한 뒤 학습자 테스트는 offline Maven 경로를 사용합니다. offline Maven은 Java 프로그램의 네트워크·파일 접근을 OS 차원에서 차단하는 샌드박스가 아닙니다. profiles.execution.network는 required와 enforcement=not-os-sandboxed를 구분합니다.

## 외부 자원과 검증 범위

| 단원/능력 | 준비된 범위 | 별도 검증 또는 미지원 상태 |
| --- | --- | --- |
| 일반 Java·JUnit·Spring/H2 | 고정 멀티파일 reference·starter·grader | 실제 JDK/Maven 실행 기록과 설치형 통합 승인 필요 |
| MVC·Security | MockMvc 요청·응답·보안 필터 검사 | 실제 소켓·TLS·역방향 프록시·운영 인증 저장소 |
| OIDC | 이미 인증된 테스트 principal의 issuer/subject 처리 | redirect·state·nonce·PKCE·code 교환·JWKS 등 전체 프로토콜 |
| JWT | 실행 중 생성한 테스트 RSA 키와 고정 Clock | 운영 키 보관·회전·폐기·원격 키 서버 |
| Redis | TTL·키별 무효화, 전용 loopback 인스턴스 계약 | Docker 설치·이미지 실행·공유 서비스 접근은 자동 보장하지 않음 |
| Kafka | 전용 토픽, 중복 payload 전송, DB 멱등 효과 | 실제 장애 복구·고부하·다중 파티션·운영 브로커 |
| Observability | 메모리 지표·Observation 생명주기 | exporter·대시보드·분산 추적 인프라 |
| Gradle·Docker·CI | 비교용 설정 파일과 설명 과제 | 해당 도구 실행·CI 도입·배포 검증 |

Redis 환경변수는 JAVA_EDU_REDIS_HOST와 JAVA_EDU_REDIS_PORT이며 예시 포트는 127.0.0.1:16379입니다. Kafka는 JAVA_EDU_KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:19092 형식의 단일 학습 브로커를 전제로 합니다. 실제 설치형이 자원을 지원하지 않으면 unsupported_resources로 알려야 하며 단위 테스트만 수행한 결과를 단원 통합 성공으로 바꾸지 않습니다. 외부 주소를 입력하는 범용 실행 서비스를 제공하지 않습니다.

## 편집·출판 정책과 현재 상태

Java 언어·표준 라이브러리는 Oracle/OpenJDK 문서, 프레임워크·라이브러리는 해당 프로젝트 공식 문서를 기준으로 합니다. 버전이 있는 Spring 6.2·Security 6.5·Redis 3.5 문서를 사용하고, 변경 가능한 문서는 edition과 확인일을 기록합니다. checkedAt은 출처를 확인한 날짜이며 모든 예제의 실행 완료 일자가 아닙니다.

jobTags는 수업 주제를 연결하는 태그입니다. 태그가 있다는 이유로 해당 기술이 실제 공고에서 조사되었다거나 요구 빈도가 높다고 주장하지 않습니다. 실제 공고 근거·조사 날짜·표본 한계는 별도의 채용 조사 자료와 연결합니다.

현재 22개 수업·44개 개념 문항·22개 reference/starter/grader를 소스로 준비했습니다. 작성 담당자는 학습 Java/Maven 코드를 호스트에서 실행하거나 외부 실행기에 전송하지 않았습니다. 통합 담당자는 추가 서버가 없는20개 기준 프로젝트를 JDK21·Java17 컴파일 대상·Maven3.10.0에서 실제 실행해 JUnit54개 PASS와 미완성 starter 실패를 확인했습니다. 원본과 실행 복사본의 해시를 대조해 sourceFingerprint 및 executionVerified를20개에만 등록했습니다. Redis/Kafka 두 단원은 실제 서비스 연동 미검증이며 false를 유지합니다. 설치형의 실제 UI·출시 검증은 별도 보고서를 따릅니다.

출판 게이트는 (1) 출처와 계약 검토, (2) JSON/경로/선수 관계 정합성, (3) 준비된 reference가 실제 테스트를 통과, (4) starter가 행동 기준을 아직 만족하지 않음, (5) 관련 잘못된 구현을 검사가 거절, (6) 설치형 파일 편집·실행·오류·중단과 웹의 실제 화면 검토입니다. 소스만 제공한 단계에서는 고정 교재와 다운로드를 표시하고 실제 실행 결과를 꾸며 내지 않습니다.
