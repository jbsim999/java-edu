# 실행 아키텍처와 공개 범위

기준일 2026-10-12. Windows 설치형 앱과 owner-private Sites의 웹 교재가 같은 UI·교육 데이터를 공유한다. 설치형은 로컬 JDK/Maven으로 학습자 코드를 실행한다. 웹 코어 실행은 Cloudflare Worker API에서 Wandbox로 연결한다. 공개 GitHub와 개인 전용 호스팅의 접근 범위는 별개다.

## Java 실행 계약

브라우저→같은 origin의 실행 API→외부 Wandbox 컴파일/실행 API로 연결한다. 제공자 endpoint·compiler·옵션은 서버가 고정한다. 교육 콘텐츠가 가진 과제 ID·버전·trusted checks를 서버가 결정하며 클라이언트의 기대값·컴파일 옵션을 신뢰하지 않는다.

웹 실행의 실제 JVM은 21(`openjdk-jdk-21+35`). `--release`로 8/11/17/21의 언어/API 대상 컴파일을 검사해도 실행 JVM은 21이다. 설치형 v0.3은 포함된 실제 JDK21을 자동 등록하며, 다른 실제 JDK8/11/17/21 등록은 선택 기능이다. CI에서는 네 실제 런타임을 분리한다. [번들 계약](bundled-runtime.md)을 따른다. 2026-10-12 웹 확인용 코드는 `--release\n8`과 package-private `class Main`으로 컴파일하고 `JAVA_EDU_OK`·`21-internal`을 출력했다. Java8 obsolete 경고와 종료 0을 함께 확인했다. 이 결과는 전체 과제 검증을 대신하지 않는다.

주 파일은 prog.java이므로 template의 Solution과 Main은 package-private다. 사용자 Solution과 trusted Main harness를 합쳐 실행한다. 호출·반환 타입·컴파일 대상·샘플/제출 검사는 배포 소스에서 고정한다. 결과는 실행 ID·작성 코드 snapshot에 연결한다. 단순 stdout 문구만으로 정답을 판정하지 않는다. 교육용 행동 검증은 악의적 제출에 대한 완전한 부정행위 방지 시스템을 뜻하지 않는다.

초판의 완료 기록에는 과제 ID와 코드 snapshot을 사용하고 개정판을 별도 연결하지 않는다. 같은 ID의 검사·계약을 바꾸면 이전 성취가 복원될 수 있다. 후속 콘텐츠 개정 전에 revision 또는 계약 fingerprint를 추가하고 과거 성취를 재검증해야 한다.

## 데이터와 접근

진도·작성 코드·설계 메모는 브라우저에 저장한다. 전 기기 동기화로 표시하지 않는다. 실행 버튼을 누르면 코드가 외부 Wandbox에 전송된다. save:false는 공개 permalink 생성을 막을 뿐 제공자 운영 로그에 저장되지 않음을 보장하지 않는다. UI에서 제3자 전송·로그 가능성·민감정보 입력 금지를 설명한다.

Sites private gateway가 접근을 제한하고 인증된 방문자의 `oai-authenticated-user-id`를 제공한다. 배포 API는 이 trusted ingress 이후 identity를 요구한다. 로컬 preview만 identity 없이 실행한다. 공개 서비스로 전환하려면 계정·쿼터·비용·부정 사용을 별도로 설계한다.

## 제한과 실패

서버에서 요청·소스·응답 크기와 대기시간을 제한하고 동일 origin·과제 ID·JSON 구조를 검사한다. 제공자별 429·장애·컴파일 오류·실행 오류·검사 실패를 구분한다. POST 실행을 자동 재시도하지 않는다. 제공자의 IP 쿼터는 shared proxy 요청이 합산될 수 있으며 운영 상한은 미확인이다. 브라우저 취소는 결과 대기를 중단하는 것이며 원격 프로세스 종료를 보장하지 않는다.

## Windows 설치형 실행 기반

사용자가 Windows 설치형 + 웹 교재 구성을 선택했다. Electron 앱의 격리된 렌더러가 세션·Origin·Host·CSRF로 보호된 loopback API와 통신한다. 등록한 실제 JDK8/11/17/21을 검사하고 선택한 JVM으로 실행한다. 전용 실행 디렉터리, 고정된 POM·테스트·편집 파일 목록, 출력·시간·Job Object 프로세스 한도로 실행과 정리를 관리한다. 학습 코드 자체가 학습자 OS 권한으로 동작하는 개인 IDE이므로 보안 샌드박스로 표현하지 않는다.

Maven 의존성은 명시적인 환경 준비에서 내려받고 과제 실행은 오프라인이다. 기본 DB·웹 요청 실습은 H2·MockMvc를 사용하며 별도 호스팅 컨테이너 서버가 필요하지 않다. Redis/Kafka 단원의 실제 연동은 선택적인 고정 loopback 자원이 필요하다. 상세 계약과 제한은 [로컬 실행 계약](local-execution.md)을 따른다.

설치형의 진도·초안·테마는 앱 userData에 보존하며 실행 서버의 임의 포트 변경과 무관하다. 웹과 설치형 사이 자동 동기화는 제공하지 않는다. 웹은 실무 22단원의 정적 교재·다중 파일 예제·퀴즈·프로젝트 ZIP을 제공하고 해당 실행은 설치형에서 진행한다. 다운로드에는 상대 경로가 유지된 부모 POM·starter·reference·공개 grader를 함께 넣는다.

## 공식 근거

- [Wandbox 공식 API 목록](https://wandbox.org/api/list.json)
- [Wandbox FAQ](https://github.com/melpon/wandbox#faq)
- [Wandbox 실행 처리·로그](https://github.com/melpon/wandbox/blob/develop/feline/src/api_compile_json.rs)
- [Wandbox 요청·응답](https://github.com/melpon/wandbox/blob/develop/feline/src/types.rs)
- [javac 공식 설명](https://docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html)

Piston은 확인한 공개 Java 목록15.0.2 및 실행키 정책 때문에 이번 무키 프로토타입에서 선택하지 않았다. [공식 정책](https://github.com/engineer-man/piston#public-api)
