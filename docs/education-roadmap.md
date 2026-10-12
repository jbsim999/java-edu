# Java Edu 교육 로드맵 v0.3

기준일 2026-10-12. 전환 경로는 진단→Java 코어→테스트·빌드→Spring·DB→인증·운영→통합 프로젝트, 현직자 경로는 진단→부족한 코어→설계·동시성·정합성→버전 전환→개선 프로젝트다. 경력·객관식 총점만으로 단원을 면제하지 않는다.

| 단계 | 학습 내용 | 직접 코딩·성취 조건 |
| --- | --- | --- |
| 1 객체·타입 | 값 전달·참조·boxing·동등성·오버로딩/오버라이딩 | 실행 결과 설명·결함 수정 |
| 2 깊은 OOP | 책임·협력·캡슐화·불변식·다형성·LSP·상속/합성·SOLID의 비용 | 예약·재고 모델의 행동과 설계 근거 |
| 3 제네릭·컬렉션 | 소거·variance·PECS·equals/hashCode·변경 가능성·자료구조 계약 | 타입 안전한 API·가변 키 오류 수정 |
| 4 실패·자원·함수형 | 예외 처리 책임·원인 보존·자원 해제·람다·Stream·Optional·java.time | 누수·예외 은폐·부수 효과·경계 검사 |
| 5 빌드·테스트·라이브러리 | Maven·Gradle·JUnit·Mockito·AssertJ·Lombok | 재현 빌드·행동 테스트·생성 코드 해석 |
| 6 동시성·JVM | JMM·원자성·가시성·순서·happens-before·락·취소·GC·관측 | 경쟁 조건 반례·수정 근거·종료/취소 검증 |
| 7 웹·DB 기반 | HTTP·SQL·제약조건·인덱스·실행계획·JDBC·연결 풀 | 요청 계약·SQL·자원·롤백 |
| 8 Spring Core | IoC·DI·빈 생명주기·스코프·설정·AOP·프록시·자동 설정 | 객체 조립 전환·호출 경계 설명 |
| 9 MVC·REST | 계층 책임·Jackson·Validation·예외 응답·API 문서화 | 정상·잘못된 입력·오류 HTTP 검사 |
| 10 영속성 | MyBatis SQL/XML/매핑, JPA/Hibernate 상태/조회, Spring Data | 같은 도메인 두 구현 비교·선택한 방식 심화 |
| 11 트랜잭션·정합성 | 전파·격리·롤백·프록시·락·재시도·Flyway | 부분 실패·경쟁 요청 통합 검증 |
| 12 인증·인가 | Security·세션·OAuth2·OIDC·JWT·CSRF/CORS | 준비된 인증 환경·만료/권한 부족 거부 |
| 13 Redis·Kafka | 만료·무효화·중복·순서·재처리·장애 | 캐시·이벤트 정합성 |
| 14 관측·배포 | 로그·지표·추적·Actuator·Micrometer·OpenTelemetry·Docker·CI·통합 테스트 환경 | 실패 추적·깨끗한 빌드·출시 검증 |
| 15 버전 전환 | 8→11→17→21 문법/API/빌드/의존성/Spring 변화 | 실제 JDK별 회귀·이행 근거 |
| 16 통합 프로젝트 | 설계·DB·보안·정합성·운영·변경 대응 | 실패 시나리오·테스트·설계 결정·관측 증거 |

OOP·타입→컬렉션·실패→테스트→Spring 실행 모델→영속성→정합성의 선수 관계를 유지한다. HTTP·SQL/JDBC는 해당 Spring·영속성 실습의 공통 기반이다. MyBatis를 JPA 선수 조건으로 강제하지 않는다. SQL/JDBC 기반에서 두 방식 비교→선택 심화→트랜잭션으로 합류한다.

버전 차이는 각 수업에서 설명하고15단계에서 종합한다. 8은 공통 기반·람다/Stream/time,11은 표준 HTTP와 문자열/파일 API,17은 switch 표현식/text block/record/sealed,21은 record pattern/pattern switch/virtual thread를 다룬다. 최초 도입 버전은 별도 표시한다.

공통 프로젝트는 주문·재고 예약·취소다. 도메인 모델→테스트→HTTP API→영속화/트랜잭션→권한/중복/동시 요청→캐시/이벤트/관측→버전 상향을 연결한다. 모든 도구를 한 프로젝트에 무조건 끼워 넣지 않는다.

선택 심화는 Batch·스케줄링, QueryDSL·검색, WebFlux, Kubernetes·분산 설계로 분기한다. 수료는 원리 설명·반례·코드 수정·행동 검증·설계 대안과 비용 설명으로 판정한다. 학습 효과는 실제 학습자 검토 전까지 미확인이다.

## 웹·설치형 학습 순서

1. Java 코어12단원에서 버전별 API, OOP, 타입·컬렉션·실패·동시성·설계 검증을 학습한다.
2. Maven → JUnit·AssertJ → Mockito → Lombok → Spring DI·AOP → MVC·Validation으로 진행한다.
3. SQL/JDBC 뒤 MyBatis와 JPA를 비교하고 Flyway·트랜잭션·낙관적 잠금으로 정합성을 검증한다.
4. Security·CSRF → OAuth2/OIDC → JWT의 역할·검증 경계를 학습한다.
5. Redis/Kafka 선택 실습, Micrometer 관측, Gradle/Docker/CI 비교를 거쳐 주문·재고·취소 통합 과제를 수행한다.

실무22단원의 선수 관계·공식 근거·실습 파일은 [실무 과정 명세](professional-curriculum.md)와 curriculum/professional/catalog.json에 연결한다. 현대 Spring 실습은 Java17 대상으로 컴파일하고 JDK17/21 실행을 검증한다. Java8/11은 코어·레거시 이행 교재에 사용한다. 웹에서 읽고 프로젝트 ZIP을 내려받거나, Windows 앱에서 같은 코드와 고정 테스트를 직접 실행한다. 기본20개 실무 단원에는 별도 DB 서버가 필요하지 않다. Redis/Kafka 두 단원은 선택 자원을 별도로 준비한다.
