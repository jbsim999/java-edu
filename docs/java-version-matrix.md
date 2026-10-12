# Java 버전 기준

Oracle 공식 본문 확인일 2026-10-12. 언어는 JLS, 표준 API는 해당 판본의 계약·Since, 런타임은 JVMS·공식 가이드를 사용한다. 문헌 대조와 코드 컴파일/실행 결과를 구분한다.

| 기능 | 최초 정식 버전 | 이 과정 대상 중 최소 버전 |
| --- | --- | --- |
| 람다·Stream·Optional·java.time | 8 | 8 |
| List.of | 9 | 11 |
| 지역 변수 var | 10 | 11 |
| 람다 매개변수 var·HttpClient·String.isBlank/strip/lines/repeat·Files.readString/writeString·Optional.isEmpty | 11 | 11 |
| switch 표현식 | 14 | 17 |
| text block | 15 | 17 |
| record·instanceof 패턴·Stream.toList | 16 | 17 |
| sealed | 17 | 17 |
| record pattern·pattern switch·virtual thread·SequencedCollection | 21 | 21 |

Java17 pattern switch는 preview이므로 정식 예제에서 제외한다. record의 컴포넌트 필드는final이지만 참조하는 객체까지 깊은 불변성을 보장하지 않는다. 가상 스레드는 CPU 속도·모든 요청 지연 감소를 보장하지 않는다. Java8의Stream예제에는toList()/List.of()를 섞지 않는다.

공식 근거: [JLS8](https://docs.oracle.com/javase/specs/jls/se8/html/index.html), [공식 언어 변경표](https://docs.oracle.com/en/java/javase/21/language/java-language-changes-release.html), [Stream8](https://docs.oracle.com/javase/8/docs/api/java/util/stream/Stream.html), [HttpClient11](https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpClient.html), [String11](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/String.html), [Stream17](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Stream.html), [record17](https://docs.oracle.com/en/java/javase/17/language/records.html), [가상 스레드21](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html).

Spring Boot2.7/Framework5.3과 Boot3/Framework6 및 Boot4/Framework7을 분리한다. 후자 두 세대는Java17이상이다. Boot2.7.18은Java21까지 호환한다고 명시하므로 레거시=높은JDK실행불가로 가르치지 않는다. 유지보수 지원과 실행 호환성은 별개다. [2.7 요구사항](https://docs.spring.io/spring-boot/docs/2.7.18/reference/html/getting-started.html), [3.5 요구사항](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [현재 요구사항](https://docs.spring.io/spring-boot/system-requirements.html).

MyBatis-Spring2.1→Framework5/Java8+,3.0→Framework6/Java17+,4.0→Framework7/Java17+를 구분한다. [공식 표](https://mybatis.org/spring/). JUnit5는Java8+,JUnit6은Java17+,Mockito5는Java11+로 테스트 도구를 일괄 최신화하지 않는다. [JUnit5](https://docs.junit.org/5.14.4/overview.html), [JUnit current](https://docs.junit.org/current/user-guide/), [Mockito](https://github.com/mockito/mockito).

직접JEP본문 접근은 조사 도구에서403이었으므로 검증 완료로 세지 않았다. 동일 기능의 Oracle 공식 설명을 확인했다. 이 문서는 전체 예제 실제실행 PASS나 최종patch선정을 주장하지 않는다.
