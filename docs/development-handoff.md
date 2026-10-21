# Java Edu 개발 인계 — v0.3.1 교재·화면 개선

최신 앱·릴리스 소스는 `6ce0428a802be7a8a757a27a40853996a5b7fa04`다. [v0.3.1 프리뷰](https://github.com/jbsim999/java-edu/releases/tag/v0.3.1)는 2026-10-13 03:14:44UTC에 공개했다. 34수업에 상황·용어·실제 코드·값 추적·예측 해설을 넣고, 반복 안내를 펼침 항목으로 정리했다. 1440px 화면의 본문 폭은 약 762px에서 1092px로 넓어졌다. CI38338837092의12작업과 독립 정적5/5·읽기24/24·기존49/49·도식19/19 PASS, 새 EXE·ZIP 전체 payload 및 도구604파일 대조 PASS다. 사용 중인 기존 앱과 데이터를 보존하여 새 설치·기동 검사는 미실행이다. [이번 QA](readability-release-qa-report.md)·[설치 안내](installation.md)를 따른다. 문서 후속 커밋은 앱 패키징 소스와 구분한다.

웹은 같은 소유자 전용 URL에 34수업의 새 읽기 안내와 넓은 본문을 배포했다. 원본 275파일의 Git blob을 대조한 후 같은 소스로 빌드·Worker·Node40 PASS/1 SKIP를 확인했다. 저장 버전5의 source SHA는 `24cd85352707112c5875a120169a9e61e3108331`, 배포 `appgdep_6acda3692ce48191840e4117a0011131`은 2026-10-13 03:20:24UTC succeeded다. main에는 README와 미리보기 이미지의 문서 커밋 `39ad4a8d`만 반영했으며 PR1은 미병합이다. 이후 기록 문서 커밋은 배포된 앱·웹 소스와 구분한다.

## 이전 v0.3.0 통합 패키지 기록

당시 앱 소스는 `0e1ff5eb38484d1594d4fd1c231d4dbe229b44e8`, 원격은 jbsim999/java-edu, 구현 브랜치는 feat/java-learning-mvp이며 PR1은 미병합이다. [v0.3 통합 프리뷰](https://github.com/jbsim999/java-edu/releases/tag/v0.3.0)는 Windows x64 EXE·전체 ZIP에 Temurin21.0.12.1+1·Maven3.10.0·Electron/Node를 포함한다. 학습자의 별도 도구 설치·폴더 등록은 필요 없다. 기본 실제 JVM은 21이며 컴파일 대상 8·11·17·21과 구분한다. 다른 실제 JDK 등록은 고급 설정의 선택 기능이고 기존 외부 설정을 보존한다. 기본 20실무의 첫 준비에는 인터넷이 필요하며 Redis/Kafka 서버는 포함하지 않는다.

CI38223955175의12작업, 최종 실제 ZIP10/10·NSIS10/10, 도구604개 전체 무결성·원본197+생성2파일 대조, 코드·기능·시각 독립 검수 PASS. package.json은 builder가 제거한 개발 필드를 제외한 런타임 필드를 비교한다. 첫7z NSIS의2파일 누락은 내부 ZIP으로 수정해 한글 설치 경로에서 재검증했다. 설치 제거·학습 데이터 보존·원래 AppData 부재 복원 PASS. 검사 자료는 work/bundled-desktop-qa에 보존하며 Git에 넣지 않는다. [통합 QA](bundled-desktop-qa-report.md)·[번들 계약](bundled-runtime.md)·[설치 안내](installation.md)·[배포 기록](deployment.md)을 먼저 읽는다.

웹은 기존 소유자 전용 URL에서 통합 설치 안내를 배포했다. 웹 관련 GitHub 소스ffb77751, Sites199443b5e185acdcd83bb3d4ca0a4ca43eefc3d8, 배포appgdep_6acc996c9de48191a896c90d291afd9f, 2026-10-12 08:25:24UTC succeeded. 후속0e1ff5는 desktop 압축 설정만 수정했으며 웹 UI·Worker는 동일하다. 공개 접근 전환·PR 병합·강제 푸시·유료 자원 구매·자체 라이선스 지정은 승인되지 않았다.

개발자는 공식 ZIP 체크섬과 대응 소스를 검증한 뒤 scripts/bundle-runtime.mjs로 work/desktop-bundle을 생성한다. 빌드 전후 604개 전체의 SHA를 확인한다. NSIS differentialPackage:false/useZip:true를 유지한다. 새 빌드는 기존 릴리스와 별도로 검증한다. 학습자 코드의 명시적 동의·개인 IDE 권한·로컬 프로세스 계약을 유지한다. 기존v0.2 검증도 최신 통합 패키지 검증과 구분한다.

아래는 v0.2 당시 개발 인계의 역사 기록이다. 도구 외부 등록과 이전 배포 표시는 현재v0.3 기본 설정을 대신하지 않는다.

# Java Edu 개발 인계 — 2026-10-12

프로젝트 루트는 이 문서의 상위 저장소 java-learning-lab이다. 원격은 https://github.com/jbsim999/java-edu, 구현 브랜치는 `feat/java-learning-mvp`, PR은 https://github.com/jbsim999/java-edu/pull/1 이다. main에는 README와 소개 이미지가 반영돼 있고, 구현 PR은 병합하지 않았다. 새 대화는 AGENTS.md·CONTRIBUTING.md·이 문서를 먼저 읽는다.

## 승인된 목표와 현재 결과

다른 언어 경험자·현직자를 대상으로 공식 Java8/11/17/21, 깊은 OOP·타입·동시성 및 실무를 제공한다. 이론 → 예시 → 문제풀이 → 실무 심화 → 직접 코딩의 34수업·68문항·34과제다. Spring/REST/Lombok/MyBatis/JPA/트랜잭션/Security/OIDC/JWT/관측/빌드·운영과 선택 Redis/Kafka를 포함한다.

Windows 설치형+웹 교재를 제공한다. 기본 실무 20프로젝트는 학습자 JDK17/21·Maven·H2로 실행하며 별도 호스팅 컨테이너가 필요하지 않다. Java 코어는 등록한 실제 JDK8/11/17/21을 사용한다. 문법 색상·3테마·다중 파일 편집·진도와 초안 저장을 구현했다. 웹 코어는 Wandbox JVM21이며 교재 기준·컴파일 대상·실행 JVM을 구분한다. 앱은 Wandbox를 호출하지 않는다.

## 출시와 검증

Windows [v0.2.0 프리뷰](https://github.com/jbsim999/java-edu/releases/tag/v0.2.0)는 검증 소스 `6ba4b8aa124f5ce78e79240253946c9fdac3e770`을 대상으로 게시했다. [CI38213755330](https://github.com/jbsim999/java-edu/actions/runs/38213755330) 12작업 모두 성공: 콘텐츠·브라우저, Java4JDK, Windows 로컬4JDK, 실무17/21. Windows 관리자·코드페이지1252에서 로컬16/16과 각 실제 JVM56/61/67/73검사·한글 진단 PASS. 기본20프로젝트54JUnit PASS와 미완성 starter20개 실패 확인.

설치 파일 `desktop-release/Java-Edu-Setup-0.2.0-x64.exe`, 111753633바이트, SHA256 `6d4354e0b4a5c8b471591f0ee29c106f9ec65c2561847416555c38e623fd2f74`. 서명되지 않은 Windows x64 NSIS다. 실제 현재 사용자 설치 → 설치된 앱8/8(JDK21 코어·Spring/H2 제출·재시작 저장) → 제거 및 독립 시각 검수 PASS. 설치 ASAR/helper/exe는 빌드본과 동일하다. 검토 파일 195개+생성 2개를 대조했으며 package.json은 builder가 개발 필드를 제거한 뒤의 런타임 필드로 비교했다. [설치 QA](installed-desktop-qa-report.md)와 [검증 기록](verification.md)을 따른다.

테스트 설치는 제거했다. 테스트 이전에 없던 AppData 경로도 원래 부재 상태로 복원했다. 검사 데이터는 저장소 내부 work/installed-desktop-qa/app-data-first-run 및 app-data-final-run에 보관한다. 해당 작업 자료는 Git에 포함하지 않는다. 설치 파일을 재빌드하면 해시와 검증이 달라지므로 기존 릴리스 파일을 교체하지 않는다.

웹 https://java-edu-lab-jbsim999.junbo1218.chatgpt.site 는 소유자 전용이며34수업·12도식·테마가 배포됐다. GitHub 웹 소스 `a0d12571dcca5574d19b6ffdc35cd1a1093790d4`, Sites source `88e92c4a6889c621f710027f924450d540040460`, 배포 `appgdep_6acc7e4ad0c88191a5c9c2e721d984a1`, 2026-10-12 06:29:47 UTC succeeded. 후속 Windows 감독 helper 수정은 웹 UI·교재를 변경하지 않았다. [배포 기록](deployment.md)을 따른다.

34수업의 시각 자료를 평가해 12개 채택·22개 보류했다. 공식 출처 26개를 실제 대조했고 내용·코드·시각 검수 PASS, 도식19/19·기존 브라우저49/49 PASS다. [선정 근거](theory-visuals.md)를 따른다. 테스트의 기본 산출물은 저장소 내부 work/로 정리했고 경로 영향 브라우저1/1·실무 웹4/4 PASS다.

## 남은 범위와 제약

Redis/Kafka 실제 서비스 연동, 실제 모바일·스크린리더·OS IME/클립보드·SmartScreen 다운로드 흐름, 장기 부하, 호스팅 인증 세션의 실제 Java 제출은 미검증이다. 앱과 웹 진도는 자동 동기화하지 않는다. 학습 코드는 사용자 PC 권한으로 실행하며 OS 보안 샌드박스가 아니다. Windows helper의 OS 기본 TEMP는 현재 ANSI 코드페이지로 표현 가능해야 한다. 강제 부모 종료 시 helper 임시 폴더가 남을 수 있다. [로컬 실행 계약](local-execution.md)에 정확한 경계를 기록했다.

마일스톤 커밋·푸시 및 검증된 배포는 승인됐지만 강제 푸시·PR 병합·유료 구매·사이트 공개 전환·라이선스 지정은 승인되지 않았다. 문서 후속 커밋과 실제 검증·패키징 소스를 구분한다.

## 개발 환경

Node22+, Windows, npm ci 후 npm run dev 또는 npm run desktop. 생성 번들·실무 데이터·ZIP은 빌드로 재생성한다. npm run build:desktop은 별도 신규 설치 파일을 만든다.

이 작업 환경의 상속 NODE_TLS_REJECT_UNAUTHORIZED=0은 사용하지 않는다. 네트워크/빌드에서는 1로 설정하며 Node22.17은 NODE_OPTIONS=--use-system-ca를 사용한다. 인증서 검사를 해제하지 않는다.

현재 검증 도구는 프로젝트 이동 전의 읽기 전용 폴더 C:/Users/USER/Documents/Codex/2026-10-12/new-chat/work/toolchains/jdk21/jdk-21.0.12.1+1 및 같은 toolchains/maven/apache-maven-3.10.0이다. JDK8은 C:/Program Files/Java/java-1.8.0-openjdk-1.8.0.265-1이다. CI의 실제 JDK11/17 검사와 이 로컬 도구 경로를 구분한다. 일반 학습자는 앱의 폴더 선택으로 자신의 도구를 등록한다.
