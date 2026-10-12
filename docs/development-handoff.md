# Java Edu 개발 인계 — 2026-10-12

프로젝트 폴더는 이 문서의 상위 저장소 루트 `java-learning-lab`이다. 원격은 https://github.com/jbsim999/java-edu, 브랜치는 `feat/java-learning-mvp`, PR은 https://github.com/jbsim999/java-edu/pull/1 이다. 파일 이동이나 새 clone 없이 현재 폴더를 로컬 프로젝트의 주 폴더로 등록하면 된다. 새 대화는 AGENTS.md, CONTRIBUTING.md, 이 문서를 먼저 읽는다.

## 승인된 목표

- 다른 언어 경험자·현직자 대상. OOP·타입·동시성 심화와 공식 Java8/11/17/21 기준.
- 이론 → 예시 → 문제풀이 → 실무 심화 → 직접 코딩. 클래스 전체·메서드·로직과 다중 파일 과제.
- Windows 설치형 + 같은 웹 교재. 기본 실행은 학습자 PC의 JDK/Maven/H2이며 호스팅 컨테이너 서버가 필요하지 않다.
- 마일스톤 커밋·푸시 및 검증된 앱·웹의 배포는 사용자 승인됨. 강제 푸시·PR 병합·유료 구매·사이트 공개 범위 변경은 승인되지 않음.

## 구현과 실제 검증

Java 코어12수업 + 실무22수업 = 총34수업·68문항·34코딩 과제. Spring/REST/Lombok/MyBatis/JPA/트랜잭션/Security/OIDC/JWT/Redis/Kafka/관측/빌드·운영을 포함한다. Java 코드 문법 색상, 다크·라이트·고대비 테마, 읽기 전용 보조 파일과 파일별 초안, 진도·테마의 재시작 저장을 구현했다.

실무 기본20프로젝트를 JDK21/컴파일 대상17/Maven3.10.0에서 실제 실행해 기준 답안54개 JUnit 검사가 통과하고 미완성 starter20개가 실패했다. 독립 리뷰가 현재129소스 파일·부모 POM과 실제 실행 복사본의 해시 및 보고서를 대조했다. Redis/Kafka2개는 컴파일만 확인했고 실제 서비스 연동은 미검증이다.

독립 기능 QA: 실제 개발 Electron9/9, 웹 실무 모의API4/4, 기존 브라우저49개 회귀 PASS. 로컬 계약16/16, 공용 Node35 PASS/실제 외부 제공자1 SKIP. 독립 코드 리뷰의 미해결 P1/P2는 없다. 새 링크 정책은 실제 교재 출처90개·공고5개·UI/설치 링크를 검사했다. 정확한 검사 구분과 이미지 경로는 docs/desktop-qa-report.md 및 docs/local-execution.md를 따른다.

최종 NSIS 빌드는 성공했고 `desktop-release/Java-Edu-Setup-0.2.0-x64.exe`가 있다. 크기111738936바이트, SHA256 `4e437a43afba366bab838b05ef0911acdbe8e95c2d5fec6461fb9fa409d02a21`. 서명되지 않은 Windows x64 설치 파일이다. 설치·제거 및 설치된 바이너리 실행은 아직 수행하지 않았다. `win-unpacked/Java Edu.exe` 역시 별도 패키지 실행 검증이 남는다.

## 배포 상태와 남은 작업

현재 웹은 https://java-edu-lab-jbsim999.junbo1218.chatgpt.site 에 M4.1 편집기 테마까지 배포돼 있다. 마지막 기존 GitHub 출시 커밋은 `a4d277e10f6c9e03b6a14f4fb6a11a2672987b54`, 기존 CI38204310833 전부 성공. 새34수업 웹과 Windows v0.2.0 릴리스는 아직 게시하지 않았다.

독립 시각 검수 및 설치 검증 에이전트가 실제 서비스 사용량 한도 응답으로 마지막 게이트를 끝내지 못했다. 완료된 기능 검사를 설치 파일·최종 시각 승인으로 바꾸지 않는다. 한도 해제 후 다음을 수행한다.

1. `git status`와 이 문서 이후 커밋·CI 결과를 확인한다. 사용자 변경을 보존한다.
2. docs/desktop-qa-report.md의 실제 Electron 및 Edge 화면을 독립 시각 담당자가 검토한다. 최초 실패 이미지를 최종 정상 근거로 사용하지 않는다.
3. 별도 설치 검증: workspace/work/installed-java-edu-test 에 현재 사용자 NSIS 설치 → 설치된 앱 실제 core JDK21 제출·Spring/H2 tx-proxy → 종료/재시작 저장 → 해당 테스트 설치만 제거. 기존 AppData/바로가기/제거 정보가 있으면 보존한다. 설치 전 APPDATA/java-edu와 APPDATA/Java Edu는 존재하지 않았으나 현재 상태를 다시 확인한다. production은 JAVA_EDU_QA_DATA 우회를 허용하지 않는다.
4. 새 CI: 콘텐츠/Worker/브라우저, Java8/11/17/21, Windows 로컬8/11/17/21, 실무17/21을 확인한다. 새 CI는 정의만 완료됐으며 결과를 따로 확인해야 한다.
5. 같은 검증 커밋으로 Sites 공식 source helper를 통해34수업을 빌드·패키징·배포한다. 프로젝트 ID `appgprj_6acc4fec8bb48191a296197d2d55c1e3`, 기존 소유자 전용 접근을 유지한다. Sites source SHA와 GitHub SHA는 별개다. Sites 체크아웃은 workspace/work/java-edu-site-source. 토큰을 파일·출력·명령 인수에 기록하지 않는다.
6. 같은 검증 커밋을 v0.2.0으로 GitHub Release에 게시하고 설치 EXE 및 SHA256 파일을 첨부한다. PR 본문·README·milestones·verification·deployment를 실제 결과로 갱신한다. PR은 병합하지 않는다.

## 개발 환경

Node22+, Windows, `npm ci` 후 `npm run dev` 또는 `npm run desktop`. 생성된 editor.bundle/professional.js/ZIP은 Git에 포함하지 않으며 빌드 스크립트로 재생성한다. `npm run build:desktop`은 최종 소스에서 설치 파일을 재빌드한다.

이 작업 환경은 상속된 NODE_TLS_REJECT_UNAUTHORIZED=0 값이 있었다. 네트워크/빌드 실행에서는 반드시1로 설정하고 Node22.17은 NODE_OPTIONS=--use-system-ca 또는 node --use-system-ca로 시스템 CA를 사용한다. 인증서 검사 해제를 오류 해결책으로 사용하지 않는다.

로컬 도구 경로는 시스템 변경 없이 workspace/work/toolchains/jdk21/jdk-21.0.12.1+1 및 workspace/work/toolchains/maven/apache-maven-3.10.0 이다. JDK8은 C:/Program Files/Java/java-1.8.0-openjdk-1.8.0.265-1. 앱 등록은 폴더 선택 방식이다. 설치 앱·실제 JDK11/17·실제 Redis/Kafka·실제 모바일·IME·기기 간 동기화의 미검증 범위를 유지한다.
