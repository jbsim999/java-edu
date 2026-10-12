# Java Edu

공식 Java 문서 기반으로 다른 언어 경험자의 Java 전환 학습과 현직자의 심화를 연결하는 한국어 교육 서비스입니다. OOP·타입·동시성을 깊게 다루고, 수업 끝에서 Java 코드를 직접 작성·실행·검증합니다.

현재 구성: **Windows 설치형 + 웹 교재 v0.2**. Java 코어12수업과 실무22수업, 총68문항과34코딩 과제를 연결합니다. Spring·Lombok·MyBatis·JPA·트랜잭션·Security·OAuth2/OIDC·JWT·Redis·Kafka·관측·빌드/운영 과정을 포함합니다. 기본20개 실무 프로젝트는 별도 DB 서버 없이 실행하며 Redis/Kafka 두 단원은 선택 환경입니다. 설치형과34단원 웹의 최종 출시 검증을 진행 중입니다.

- [기획안](docs/product-plan.md)
- [교육 로드맵](docs/education-roadmap.md)
- [마일스톤](docs/milestones.md)
- [실행 아키텍처](docs/architecture.md)
- [실행 API 계약과 제한](docs/execution-contract.md)
- [공식 Java 호환 기준](docs/java-version-matrix.md)
- [채용 근거](docs/job-evidence.md)
- [구현된 코어 과정](docs/curriculum.md)
- [실무22단원](docs/professional-curriculum.md)
- [Windows 설치와 사용](docs/installation.md)
- [로컬 실행 계약](docs/local-execution.md)
- [협업 규칙](CONTRIBUTING.md)
- [실제 검증과 미확인 범위](docs/verification.md)
- [배포 소스·버전 기록](docs/deployment.md)
- [독립 브라우저 QA](docs/qa-report.md)
- [문법 강조·테마 QA](docs/editor-qa-report.md)
- [Windows 앱·실무 통합 QA](docs/desktop-qa-report.md)

수업은 이론 → 예시 → 문제풀이 → 실무 심화 → 웹 IDE 직접 코딩의 5단계입니다. 객관식 성취·코드 행동 검증·설계 평가를 구분합니다.

교재는 Java8·11·17·21 기준입니다. 설치형은 등록한 실제 JDK로 코드를 실행하며 작성 코드를 Wandbox로 전송하지 않습니다. 현대 Spring 프로젝트의 컴파일 대상은17이고 실행 JDK는17/21입니다. 웹 Java 코어 실행은 Wandbox의 실제 JVM21을 사용하며8·11·17 컴파일 대상과 해당 JVM 실행을 혼동하지 않습니다. 웹 실행·제출 버튼을 누를 때 코드가 Wandbox로 전송되며 운영 로그에 남을 수 있습니다.

학습자는 Windows 설치 파일과 JDK를 준비하며 실무 프로젝트에는 Maven도 등록합니다. 앱의 진도·코드·메모·테마는 앱 재시작 뒤에도 보존됩니다. 웹과 앱 사이 자동 동기화는 제공하지 않습니다. 편집기는 Java 문법에 따라 클래스·타입·변수·메서드 색상을 구분하고 다크·라이트·고대비 테마, 줄 번호·들여쓰기·괄호 표시를 제공합니다. 의미 분석 기반 IDE나 자동 완성 엔진은 포함하지 않습니다.

개발자는 Node22+로 `npm ci`, `npm run dev`를 실행하면 `http://127.0.0.1:4173`에서 학습실을 사용할 수 있습니다. `npm run desktop`으로 개발 앱, `npm run build:desktop`으로 Windows x64 NSIS 설치 파일을 생성합니다. JDK/Maven은 앱 설정의 폴더 선택으로 등록하므로 시스템 PATH를 변경하지 않습니다.

`npm run check`는 콘텐츠와 실행 API 검사, `npm run test:java`는 설치된 JDK의 예제·기준 답안 검증입니다. `npm run test:browser`는 서버가 실행 중일 때 모의 API로 기능을 검사합니다. 로컬 Edge는 `PLAYWRIGHT_CHANNEL=msedge`를 지정하고 CI는 Chromium을 사용합니다. 검사 정의와 실제 결과를 구분해 기록합니다.

`npm run build`는 정적 UI와 실행 API를 하나의 Worker로 묶습니다. `npm run test:worker`는 빌드 산출물의 경로·CSP·개인 파일 제외·인증 필수 동작을 검사합니다. 네트워크 실행 테스트는 별도 명시적 모드에서만 호출하며 기본 테스트는 외부로 코드를 보내지 않습니다.

`npm run test:local`은 로컬 실행·Windows 프로세스 종료 계약, `npm run test:professional`은 JAVA_HOME/MAVEN_HOME에서 기준 프로젝트 통과와 미완성 과제 실패를 검사합니다. Redis/Kafka 두 단원은 기본 검증에서 명시적으로 제외하며 `--compile-only`로 의존성과 컴파일만 따로 확인할 수 있습니다. `tests/desktop.mjs`는 실제 개발 Electron·로컬 JDK/Maven 흐름과 모의 API 웹 검사를 구분합니다.

[웹 교재](https://java-edu-lab-jbsim999.junbo1218.chatgpt.site)는 현재 소유자 전용 접근을 유지하며 배포된 버전은 코어12수업과 편집기 테마입니다. Windows 설치 파일은 로컬 빌드가 완료됐고, 설치·제거와 최종 시각 검수 후 공개 저장소의 [Releases](https://github.com/jbsim999/java-edu/releases)에 게시할 예정입니다. 새 프로젝트에서 이어갈 상태는 [개발 인계](docs/development-handoff.md)를 먼저 확인합니다.
