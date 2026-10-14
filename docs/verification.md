# 프로토타입 검증 기록

기준일: 2026-10-12. 아래 코어 프로토타입 기록은 M4 당시12수업 대상의 이력이다. 현재34수업 설치형 검증 상태는 마지막 M5–M7 절과 개발 인계를 따른다. 전체 교육 로드맵 수료 가능성이나 실제 학습 효과는 아직 검증하지 않았다.

## 소스와 마일스톤

| 마일스톤 | GitHub 커밋 | 근거 |
| --- | --- | --- |
| M1 기획·계약 | `796b4cf48504d18822fa77c0cd2e9b5437e851f9` | 독립 문서 리뷰 PASS, 원격 ref 일치 |
| M2 12수업·학습실 | `731b4a2cb44f00d107ad29cda7918739114e9428` | 독립 교육·코드 리뷰, 기능 QA, [CI 성공](https://github.com/jbsim999/java-edu/actions/runs/38199412067) |
| M3 실행 API·Worker | `fe68aefb190bd4ae52262e4d8458e3f964038b95` | API 단위 검사, 실제 제공자 실행, 독립 코드 리뷰, [CI 성공](https://github.com/jbsim999/java-edu/actions/runs/38199510214) |
| M4 출시 프로토타입 | `165e113cc77bb56f0bfab78cf28f94de47f022cd` | 최종 독립 코드·QA·시각 PASS, [CI 성공](https://github.com/jbsim999/java-edu/actions/runs/38200134013), private 배포 성공 |

작업 브랜치는 `feat/java-learning-mvp`, 검토 PR은 [#1](https://github.com/jbsim999/java-edu/pull/1)이다. GitHub 공개 저장소와 Sites 개인 전용 호스팅을 구분한다. Sites에는 동일 GitHub 소스를 별도 체크아웃으로 전송하며 GitHub origin을 교체하지 않는다. 배포 소스 SHA와 배포 ID는 성공 응답 이후 배포 기록에 남긴다.

## 실제 실행한 검사

- `npm run check`: 콘텐츠 연결·출력 일치 등 5개와 실행 API 22개, 총 27 PASS. 네트워크 live 모드 1개는 기본 실행에서 SKIP.
- 로컬 JDK 8u265: 독립 예제 9개 + 기준 답안 9개, 행동 검사 56개 PASS. 이후 버전 예제·답안 6개는 로컬에서 SKIP.
- CI의 실제 Temurin JDK 8/11/17/21: 각각 18/20/22/24개 예제·답안 PASS, 상위 버전 6/4/2/0개 SKIP. JDK 21에서는 12예제와 12기준 답안, 전체 행동 검사 73개를 실행했다.
- 외부 Wandbox 실제 JVM 21: `--release` 8·11·17·21 대표 과제 각각 통과, 컴파일 오류와 오답을 구분. TLS 인증서 검증을 켠 `node --use-system-ca` 환경에서 확인했다. 전체 12과제를 외부 제공자로 실행한 검사는 아니다.
- 브라우저 기능·반응형·글자 확대는 [독립 QA 기록](qa-report.md)을 따른다. API 응답은 모의 처리하며 실제 휴대전화 테스트가 아니다.
- `npm run build` 및 `npm run test:worker`: 빌드된 Worker 경로·HEAD·CSP·비공개 파일 제외·인증 필수 동작 PASS. 배포 환경에서 `REQUIRE_IDENTITY=false`가 전달돼도 실행 API 인증을 해제하지 않는다.

독립 리뷰에서 경계값 0/30001 채점 누락, 제네릭 저장소 공유 전제, 같은 코드 재제출 실패 후 성취 유지 문제를 발견하고 수정했다. 경계값 생략 결함 3종의 거절을 Java 8에서 확인했고 재제출 실패 회귀는 브라우저 QA로 확인했다. 확대·대비·활성 탭 시각 검수 결과는 QA 기록에 남긴다.

## 제한과 미확인

- 실제 웹 IDE JVM은 21이다. 네 개 JVM의 선택 실행은 M5 이후 범위이며 CI의 네 JDK 실행과 다르다.
- 실제 외부 제공자 실행과 브라우저 모의 통합은 각각 검증했다. 자동 승인 검토가 기준 답안을 외부 제공자로 전송하는 추가 로컬 HTTP 통합 검사를 거절해 해당 호출은 실행하지 않았다. 배포된 인증 세션에서의 종단 간 Java 제출도 별도 미확인 범위다.
- 제공자 쿼터·중단·로그 보존은 제3자 운영 정책에 의존한다. 취소는 원격 JVM 종료를 보장하지 않는다. 한 isolate의 호출 제한은 다중 isolate 전체의 분산 쿼터가 아니다.
- 교육용 자동 행동 검사는 설계 품질이나 완전한 부정행위 방지 판정을 대신하지 않는다. 설계 메모와 루브릭을 함께 사용한다.
- 현재 성취 기록은 과제 개정판과 연결하지 않는다. 계약을 변경하기 전에 revision/fingerprint와 재검증을 도입해야 한다.
- 실제 모바일 기기·스크린리더·장기 부하·서비스 장애 훈련·기기 간 진도 동기화는 미검증이다.
- Spring·Lombok·MyBatis·OAuth2/OIDC·JPA·Redis·Kafka·DB/HTTP 실행은 후속 M5–M7 범위다.

로컬 UI 시각 판정: 독립 시각 검수 PASS. 320/360/390/768/1440px, 1280×600·844×390, 100/200% 글자 확대의 합성 화면에서 로고·버전 라벨·안내 대비·활성 탭·절 번호 개선을 재검증했다. 성공/오류 화면은 모의 API 상태다.

최종 출시 CI는 Content integrity, Java examples (8/11/17/21), Browser QA 모두 성공했다. Chromium 브라우저 35개 시나리오를 한 번의 전체 실행에서 35 PASS/0 FAIL로 확인했다. 로컬 Edge QA 기록의 선택 재검사와 구분한다.

출시 판정: **PASS — 코어 프로토타입 범위**. private Sites 배포가 `succeeded`와 운영 URL을 반환했다. 모든 GitHub 출시 파일과 Sites source tree의 Git blob을 비교해 호스팅 manifest/ignore 설정 외 동일함을 확인했다. [배포 기록](deployment.md)에 소스·버전·배포 ID를 기록했다. 배포된 인증 세션에서의 Java 제출은 미검증이며 위 제한은 유지한다.

## M5–M7 구현·검증 기록

코어12+실무22, 총34수업의 Windows 앱·웹 공용 교재를 구현했다. 독립 기능 QA의 개발 Electron9/9, 모의API 웹4/4, 기존 브라우저49개 PASS. Node35 PASS/제공자1 SKIP, Worker 정적 모듈·ZIP 검사 PASS, 로컬 계약16/16 PASS. 실제 JDK8/21 core와 Spring/H2 UI 실행은 [설치형 QA 기록](desktop-qa-report.md)을 따른다.

JDK21·컴파일 대상17·Maven3.10.0에서 기본20실무프로젝트를 실제 실행해 reference54개 JUnit PASS와20개 미완성 starter 실패를 확인했다. 독립 리뷰는129소스 및 부모POM 해시·Surefire XML·메타데이터를 대조했다. Redis/Kafka는 reference/starter 컴파일만 확인했으며 실제 서비스 실행은 미검증이다. 독립 코드·교재 리뷰에는 미해결 P1/P2가 없다.

최초 통합 당시에는 설치·제거 및 최종 시각 게이트가 서비스 한도로 미완료였다. 이후 실제 설치 QA와 CI 수정 결과는 아래 Windows v0.2 게이트 기록을 따른다. [개발 인계](development-handoff.md)는 최신 작업 상태를 제공한다.

## M7.1 이론 시각 자료

34수업을 평가해 12개 도식·25패널·80노드·54관계·26개 공식 출처를 채택하고 22수업은 중복·범위·설명 이점 기준으로 보류했다. 독립 내용·코드·시각 검수 PASS, Edge 도식19/19·기존 회귀49/49·산출물 기본 경로 영향1/1 PASS. 320/360/390/768/1440px와 100/200%의 120개 조합에서 넘침을 확인했다. Worker 경로/JavaScript MIME 및 Node35 PASS/제공자1 SKIP도 확인했다. [선정 근거](theory-visuals.md)와 [독립 QA·한계](theory-visual-qa-report.md)를 따른다. 교육 효과 측정·실기기·스크린리더 음성·설치 패키지 검증은 이 판정에 포함하지 않는다.

## Windows v0.2 출시 게이트

검증 소스 `6ba4b8aa124f5ce78e79240253946c9fdac3e770`, [CI38213755330](https://github.com/jbsim999/java-edu/actions/runs/38213755330) **12작업 모두 성공**. 관리자·코드페이지1252의 Windows8/11/17/21에서 각각 로컬16/16, 실제 JVM56/61/67/73검사 및 한글 컴파일 진단 PASS. 실무17/21의 기본20프로젝트·54JUnit 및 미완성 starter 실패 확인도 성공했다. 감독 모듈 탐색·CodeDom 임시 경로 문제를 수정했고 경계 제약은 [로컬 실행](local-execution.md)에 기록했다.

최종 NSIS 설치 파일 SHA256 `6d4354e0b4a5c8b471591f0ee29c106f9ec65c2561847416555c38e623fd2f74`. 실제 사용자용 설치·설치 앱8/8·제거·Windows 시각 PASS. ASAR에 포함된 검토 파일195개+생성2개 및 unpacked helper를 비교했다. package.json은 builder가 개발 명령·개발 의존성을 제거하므로 나머지 런타임 필드로 비교하고, 다른 소스는 원본 바이트로 비교했다. 설치된 ASAR/helper/exe는 빌드 산출물과 동일하다. 첫 검사 스크립트의 Maven 제공자 기대값 오류는 고친 후 전체8개를 재실행했으며 실패 기록을 보존했다. 기존 사용자 데이터 부재를 사전 확인한 뒤 테스트 데이터는 작업 폴더에 보관하고 환경을 복원했다. [설치 QA](installed-desktop-qa-report.md)를 따른다. 출시 게이트 판정은 **PASS — 프리뷰 범위**다. 실제 릴리스 게시 결과는 [배포 기록](deployment.md)에 기록한다.

프로젝트 이동 후 브라우저·개발 앱 검사의 기본 산출물 경로를 저장소 내부 work/로 정리했다. 경로 영향 검사 브라우저1/1·웹 실무4/4 PASS. 제한 환경의 최초 브라우저 시작 실패 후 허용된 실행 환경에서 재검사한 결과이며, 설치 앱8/8 검증과는 별개다.

## M8 통합 Windows 패키지 v0.3

출시 소스 `0e1ff5eb38484d1594d4fd1c231d4dbe229b44e8`, [CI38223955175](https://github.com/jbsim999/java-edu/actions/runs/38223955175) 전체12작업 PASS. 같은 소스의38223948625도 전체12작업 PASS. 이전ffb 소스의38220565678 첫실무21 작업 실패는 검사기가 상세로그를 제공하지 않아 원인이 미확인이고, failed-job 재실행에서는 PASS였다. 이 이력을 최종 소스의 성공과 혼합하지 않는다.

Temurin21·Maven3.10.0의 공식 ZIP 체크섬, 새해제본 전체, stage604파일355610126바이트를 검증했다. 실제 실행하지 않는 시작 자동등록과 코드 실행 동의를 분리했다. Node35 PASS/실제제공자1 SKIP, 로컬23/23 PASS, 작성자UI6/6·웹회귀4/4와 독립 코드/시각 PASS. 번들 실제 JVM21의12코어/73검사 및 새전용 Maven캐시에서 Spring/H2 준비2/2·오프라인제출2/2 PASS. 이는 설치제품 QA와 별도 검사다.

최종 ZIP과 실제 NSIS 설치앱 각각10/10 PASS. 네컴파일대상8/11/17/21의 코어6/5/6/6, 실제 Maven 준비2/2와 오프라인제출2/2, 재시작저장, 최소창704×521·글자200%를 확인했다. 외부도구환경 없이 포함 resources의 java/javac·Maven만 사용하고 폴더선택은0회였다. API/Java/Maven/클립보드 응답을 모의하지 않았다. NSIS200%중간도구카드와닫기추가확인, 최종 실제합성화면 독립검수 PASS. [독립 QA](bundled-desktop-qa-report.md)를 따른다.

빌드·실제ZIP·NSIS에서 원본197개·생성2개·vendor604개를 대조했다. package.json은 builder제거개발필드를 제외한 런타임필드로 비교하고 다른소스는 바이트로 비교했다. 최종 ASAR `8ee1c5df3de2472ff18a31e45cb6054cedd17b89389db8e579aea87c8c7c51e2`, exe `d7e0bfab510476dc433b175624a10dd4753c725c4d72949f6870a2af7b09c043`, helper `a5f0ae67ef016c916a92dc0f1afb2c1ed4a9c744798694536a241a5f861a9721`가 제품별로 일치한다.

첫7z NSIS는604중602로 무결성FAIL이었다. 원본ARM64필터2파일이 압축에는 있지만19.00 NSIS해제기에서 누락됨을 독립진단·직접추출SHA로 확인했다. differentialPackage:false/useZip:true 최소수정독립리뷰 후 새빌드·한글/공백/&/%JAVA_HOME% 경로실제설치와604전체를 재검증했다. 미검증 파일을 누락허용하지 않았다. 첫ZIP10/10·환경guard중단2개·첫NSISFAIL 근거는보존했다. 수정전산출물은 출시하지 않는다.

최종NSIS제거exit0,등록0·바로가기0·학습데이터보존PASS. 새테스트AppData를 work로보관하고 작업전두경로부재로복원했다. userData우회나기존개인설정삭제는하지않았다. Windows11 실제제품 검사이며 Windows10·SmartScreen·OS배율·실기기·스크린리더·Redis/Kafka실제연동은 미검증이다. 기본실무 최초준비는인터넷이필요하고 실제JVM21만기본포함한다. 판정 PASS — 통합프리뷰범위. 대응JDK/Temurin빌드/Maven/제3자소스와원본고지를같은릴리스에서제공한다.

## v0.3.1 교재·화면 개선 (2026-10-13)

앱 소스 `6ce0428`의 CI12작업 PASS. 독립 정적5/5·읽기24/24·기존49/49·도식19/19, EXE·ZIP 전체 payload·604도구 파일·릴리스 첨부5개 무결성 PASS. 새 설치·기동은 사용자 앱과 기록을 보존하여 미실행이다. [교재 QA](readability-qa-report.md)·[패키지와 검증 경계](readability-release-qa-report.md)를 따른다.
