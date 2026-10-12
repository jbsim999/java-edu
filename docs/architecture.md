# 실행 아키텍처와 공개 범위

기준일 2026-10-12. 프로토타입은 정적 교육 UI와 Cloudflare Worker API를 owner-private Sites에 배포한다. 사용자 기기에 임의 Java 코드를 직접 실행하지 않는다. 공개 GitHub와 개인 전용 호스팅의 접근 범위는 별개다.

## Java 실행 계약

브라우저→같은 origin의 실행 API→외부 Wandbox 컴파일/실행 API로 연결한다. 제공자 endpoint·compiler·옵션은 서버가 고정한다. 교육 콘텐츠가 가진 과제 ID·버전·trusted checks를 서버가 결정하며 클라이언트의 기대값·컴파일 옵션을 신뢰하지 않는다.

실제 JVM은21(`openjdk-jdk-21+35`). `--release`로8/11/17/21의 언어/API 대상 컴파일을 검사해도 실행 JVM은21이다. 8/11/17의 실제 런타임 검증은 별도 CI와 후속 실행 서버에서 분리한다. 2026-10-12 실제 확인용 코드는 `--release\n8`과 package-private `class Main`으로 컴파일하고 `JAVA_EDU_OK`·`21-internal`을 출력했다. Java8 obsolete 경고와 종료0을 함께 확인했다. 이 결과는 전체 과제 검증을 대신하지 않는다.

주 파일은prog.java이므로 template의 Solution과 Main은 package-private다. 사용자 Solution과 trusted Main harness를 합쳐 실행한다. 호출·반환 타입·과제 개정판·컴파일 대상·샘플/제출 검사를 고정한다. 결과는 실행ID·작성 코드 snapshot에 연결한다. 단순 stdout 문구만으로 정답을 판정하지 않는다. 교육용 행동 검증은 악의적 제출에 대한 완전한 부정행위 방지 시스템을 뜻하지 않는다.

## 데이터와 접근

진도·작성 코드·설계 메모는 브라우저에 저장한다. 전 기기 동기화로 표시하지 않는다. 실행 버튼을 누르면 코드가 외부 Wandbox에 전송된다. save:false는 공개 permalink 생성을 막을 뿐 제공자 운영 로그에 저장되지 않음을 보장하지 않는다. UI에서 제3자 전송·로그 가능성·민감정보 입력 금지를 설명한다.

Sites private gateway가 접근을 제한하고 인증된 방문자의 `oai-authenticated-user-id`를 제공한다. 배포 API는 이 trusted ingress 이후 identity를 요구한다. 로컬 preview만 identity 없이 실행한다. 공개 서비스로 전환하려면 계정·쿼터·비용·부정 사용을 별도로 설계한다.

## 제한과 실패

서버에서 요청·소스·응답 크기와 대기시간을 제한하고 동일 origin·과제 ID·JSON 구조를 검사한다. 제공자별429·장애·컴파일 오류·실행 오류·검사 실패를 구분한다. POST 실행을 자동 재시도하지 않는다. 제공자의 IP 쿼터는 shared proxy 요청이 합산될 수 있으며 운영 상한은 미확인이다. 브라우저 취소는 결과 대기를 중단하는 것이며 원격 프로세스 종료를 보장하지 않는다.

## 후속 실행 기반

네 실제 JDK, 승인 의존성, 다중 Java/XML/SQL 파일, 임시 DB, HTTP 앱·준비된 외부 시스템을 실행별 격리한다. 컴파일·annotation processing부터 제한한다. 데이터 초기화·하위 프로세스 종료·임시 파일 정리·네트워크 범위를 검사한다. 교육 코드에 호스트 Docker 권한을 제공하지 않는다. 배포 계정·비용·실행 자원은 현재 확보하지 않았다.

## 공식 근거

- [Wandbox 공식 API 목록](https://wandbox.org/api/list.json)
- [Wandbox FAQ](https://github.com/melpon/wandbox#faq)
- [Wandbox 실행 처리·로그](https://github.com/melpon/wandbox/blob/develop/feline/src/api_compile_json.rs)
- [Wandbox 요청·응답](https://github.com/melpon/wandbox/blob/develop/feline/src/types.rs)
- [javac 공식 설명](https://docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html)

Piston은 확인한 공개 Java 목록15.0.2 및 실행키 정책 때문에 이번 무키 프로토타입에서 선택하지 않았다. [공식 정책](https://github.com/engineer-man/piston#public-api)
