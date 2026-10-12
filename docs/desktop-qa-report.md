# M5·M6 독립 기능 QA

검증일: 2026-10-12. 기능 판정: **PASS**. 독립 시각 검수는 별도 담당자의 최종 판정을 기다린다. 이 보고서의 앱 검증 대상은 개발 모드 Electron이며, 설치 프로그램 검증과 배포 환경 검증은 포함하지 않는다.

## 환경과 실행 경계

- Windows, Node.js 22.17.0, Playwright 1.62.1, Edge 155.0.4283.45, Electron 44.7.0.
- 웹은 `http://127.0.0.1:4173`의 동결된 공용 UI를 격리된 Edge 컨텍스트에서 검사했다. `/api/**`는 모의 응답으로 처리했으며 외부 실행 제공자에 코드를 전송하지 않았다.
- 앱은 프로젝트의 실제 Electron 실행 파일, preload, 인증된 임시 포트의 로컬 서버와 로컬 실행기를 사용했다. `JAVA_EDU_QA_DATA`로 별도의 `user-data-한글 & 25%-…` 폴더를 만들었다. 기존 사용자 설정·진도는 변경하지 않았다.
- JDK는 OpenJDK 8u265와 Eclipse Temurin 21.0.12.1+1, Maven은 3.10.0을 등록했다. 파일 선택 대화상자의 반환 경로만 모의 처리했고, JDK·Maven 검사, 동의 저장, IPC, HTTP, 컴파일, JVM 실행 및 Maven 테스트는 실제 수행했다.
- 웹의 320/360/390/768/1440 CSS px, 낮은 높이와 방향 전환은 브라우저 에뮬레이션이다. 실제 휴대전화 검증이 아니다. 앱은 기본 창과 최소 외곽 크기 720×560에서 확인했다. 이 환경의 최소 창 내부는 704×521 CSS px였다.
- 글자 확대는 문서 기본 글꼴을 200%로 설정해 검사했다. Windows 시스템 배율·브라우저 페이지 확대·실제 OS IME 검증으로 간주하지 않는다.

## 실행 결과

| 검사 | 실제 결과 | 범위 |
| --- | --- | --- |
| `node --test tests/professional.test.mjs` | 최종 4/4 PASS | 34단원 계약, 22실무 선행학습 관계, 원본·예제·편집 가능 파일, 전체 ZIP의 POM·starter·reference·grader 일치 |
| `JAVA_EDU_QA_MODE=web node tests/desktop.mjs` | 4/4 PASS | 실무 전체 단계·퀴즈, 웹 실행 차단, 파일별 초안과 읽기 전용 파일, ZIP 다운로드, 반응형 |
| `JAVA_EDU_QA_MODE=desktop node tests/desktop.mjs` | 9/9 PASS | 최초 설정, 실제 도구 등록·동의, 실제 JDK 실행·실패·취소, Spring/H2 준비·제출, 재시작 영속성 |
| `node tests/browser.mjs` | 48 PASS, 기대값 정정 후 영향받은 1개 PASS | 기존 49개 시나리오를 유지하고 34단원 기준으로 검사. 한 번의 최종 49/49 실행으로 기록하지 않음 |

실행 예시(PowerShell, 의존성·번들·실무 자료·웹 서버는 총괄 담당자가 미리 준비):

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = '1'
$env:NODE_OPTIONS = '--use-system-ca'
$env:PLAYWRIGHT_CHANNEL = 'msedge'
$env:QA_ARTIFACT_DIR = '<workspace>/work/java-edu-desktop-qa'
node --test tests/professional.test.mjs
$env:JAVA_EDU_QA_MODE = 'web'
node tests/desktop.mjs
node tests/browser.mjs

$env:JAVA_EDU_QA_MODE = 'desktop'
$env:JAVA_EDU_JDK_8 = '<registered JDK 8 directory>'
$env:JAVA_EDU_JDK_21 = '<registered JDK 21 directory>'
$env:JAVA_EDU_MAVEN_HOME = '<registered Maven distribution>'
node tests/desktop.mjs
```

수정된 단일 브라우저 검사에는 `QA_FILTER=all-lessons-render-five-learning-steps`를 사용했다. Electron 실행 파일이 없으면 테스트는 실패하며 자동으로 다운로드하지 않는다. `JAVA_EDU_ELECTRON_PATH`로 준비된 실행 파일을 지정할 수 있다.

## 수용 조건별 근거

| 수용 조건 | 확인한 행동과 결과 |
| --- | --- |
| 34단원·버전 선택 | 코어 12+실무 22의 고유 ID 확인. 8/11/17/21 필터 결과를 각 단원의 최소 버전과 대조. 실무 필터에서 Java 8을 고르면 빈 결과와 안내가 나오며 본문은 유지됨 |
| 실무 학습 내용 | 22개 실무 수업의 공식 자료 링크, 예제의 모든 파일 원문, 퀴즈 전체 정답, 실무 단계, 코드 실습을 방문. 퀴즈만 통과해도 실습 배지는 완료되지 않음 |
| 웹 실행 차단 | 실무의 실행·제출 버튼이 비활성이고 설치 안내·ZIP이 표시됨. 준비 버튼 없음. 웹 검사에서 runtime 조회 외의 실행·로컬 API 요청은 0건 |
| 파일별 상태 | Java 초안→읽기 전용 POM→Java 복귀, 다른 수업 왕복, 새로고침 후 초안 보존. 읽기 전용 POM에 키보드 입력을 시도해도 원문 불변. ZIP은 초안이 섞이지 않은 공식 starter임 |
| 최초 실행·도구 등록 | JDK 미등록·동의 없음 상태에서 실행 불가. 폴더 선택 취소로 등록되지 않음. Java 8 등록에 JDK 21 경로를 선택하면 거부. 실제 8·21 및 Maven을 등록해도 자동 코드 실행 없음 |
| 실제 코어 실행 | `java-basics-lab` JDK 8 샘플 1/1, 제출 6/6. JDK 21 제출 6/6. `oop-lab` JDK 21 클래스 제출 5/5. 실제 런타임과 언어 대상 버전을 응답에서 구분 |
| 실제 오류 | 한글 미정의 식별자 컴파일 오류가 실제 출력에 유지됨. 틀린 답은 3/6 실패. 종료 코드 7은 실행 오류. 실패·초안 편집으로 실습 완료를 얻지 않음 |
| 실행 취소 | 테스트 코드가 작업 폴더에 marker를 쓴 뒤 무한 반복하는 것을 확인하고 UI에서 취소. 취소 표시, 작업 폴더 정리, 초안 보존, 미완료 배지를 확인 |
| 동의 철회 | 철회 후 실행·제출 비활성, 초안 유지. 다시 동의해도 자동 실행하지 않음. 실행 중 동의 철회로 자식 프로세스가 종료되는 경우는 본 앱 UI 시나리오에서 별도 수행하지 않음 |
| Maven 준비 구분 | `tx-proxy` Spring/H2 실습은 준비 전 실행 불가. 실제 준비 2/2 통과 후 실행 가능. 준비 요청에 학생 source/files 없음. 준비만으로 학습 완료되지 않으며 초안 보존 |
| 실제 실무 제출 | 준비 이후 편집 가능한 reference 파일을 UI에 입력하고 실제 Maven 제출 2/2 통과. 제출 요청은 편집 가능한 파일만 포함하고 POM을 포함하지 않음. 퀴즈+실습 완료가 함께 표시됨 |
| 앱 재시작 | 실제 창·프로세스 종료 후 같은 QA 데이터로 재실행, 다른 로컬 포트 확인. 코어 초안, 프로젝트 파일 초안, 퀴즈 진도, 테마가 보존됨. 새 앱 세션은 실무 준비를 다시 요구 |
| UI·입력 회귀 | 기존 49개 시나리오의 검색·잘못된 링크·키보드·포커스·오류·취소·stale 응답·불일치 성공 차단·저장소 손상·편집기 fallback·3테마·선택 대비·긴 한글 코드·확대·레이아웃 확인 |

기존 49개 검사의 실행 응답은 모의 응답이다. 해당 통과를 실제 JVM 또는 외부 실행 제공자 검증으로 확장하지 않는다. 한글 composition은 DOM 이벤트 기반 시뮬레이션이며 실제 Windows IME의 입력 후보 창 검증은 아니다.

## 발견 사항과 처리

1. **동결 전 ZIP 불일치:** 캡스톤 원본 grader가 변경됐는데 생성된 ZIP에는 이전 내용이 남아 정적 검사가 실패했다. 총괄·교재 담당자에게 알렸고 자료 재생성 후 전체 22개 ZIP 내용 검사 PASS. 빌드가 필요한 생성물이라는 점을 유지한다.
2. **테스트 기대값 정정:** MyBatis 수업은 편집 가능한 XML을 처음 보여주고 Java는 읽기 전용이다. 기존 단일 파일 검사에서 Java `template`을 첫 본문으로 기대해 1건 실패했다. 새 프로젝트 계약에 따라 최초 편집 가능 파일 원문과 대조하도록 정정한 뒤, 전체 34단원을 도는 해당 시나리오 PASS. 앱 결함으로 분류하지 않는다.
3. **최초 Electron 시작 환경:** 처음에는 패키지의 실행 파일 조회 과정에서 자동 다운로드가 시작됐고 상속된 TLS 검사 해제 변수의 경고와 45초 launch 시간 초과가 발생했다. 부모에게 즉시 보고했다. 준비된 바이너리의 절대 경로를 명시하고 실행 환경을 정리한 재시도는 9/9 PASS. 첫 시도의 정확한 지연 원인을 확정하지 않으며, 최종 테스트는 실행 파일이 없으면 다운로드 없이 중단한다. 종료된 최초 PID와 최종 앱의 정상 종료를 확인했다.
4. **독립 코드 검토의 링크 정책 P2:** 앱 검사 종료 후 별도 리뷰에서 일부 공식 문서 호스트가 앱의 외부 링크 허용목록에 빠진 문제가 확인됐다. 백엔드 담당자가 `reference-policy.cjs`로 정책을 분리·보완하고 로컬 계약 16/16 및 독립 재리뷰 PASS를 보고했다. 이 결과는 본 QA 담당자가 외부 브라우저를 실제 열어 재검증한 결과와 구분한다. 실행 엔진·IPC·초기화의 변경은 없다고 담당자가 확인했으며, 수정 후 설치 패키지 검증은 총괄 담당자의 범위다.

현재 수행한 기능 범위에 미해결 주요 결함은 없다. 시각 검수 및 설치 패키지의 판정은 독립 기록으로 확인한다.

## 산출물과 화면

실제 산출물 디렉터리: `<workspace>/work/java-edu-desktop-qa/`.

- 웹 4개 결과: `results-web-1791781255008.json`.
- 실제 앱 9개 결과: `results-desktop-1791781614522.json`.
- 최초 앱 환경 실패: `results-desktop-1791781284948.json` — 최종 PASS 근거가 아님.
- Edge 공용 실무 UI: `web-professional-theory.png`, `web-project-editor.png`, `web-project-readonly-pom.png`, `web-project-{dark,light,contrast}-{java,xml,sql}.png`.
- Edge 반응형: `web-project-320x720.png`, `web-project-390x844.png`, `web-project-768x1024.png`, `web-project-1440x900.png`, `web-project-844x390.png`, `web-project-320-200.png`, `web-project-mobile-200-{files,runtime}.png`, `web-install-dialog-320-200.png`.
- 실제 앱 설정: `desktop-first-settings.png`, `desktop-configured-settings.png`, `desktop-settings-200.png`, `desktop-settings-minimum-200.png`, `desktop-settings-minimum-200-consent.png`.
- 실제 JVM: `desktop-core-running.png`, `desktop-core-passed-jvm21.png`, `desktop-korean-compiler-error.png`, `desktop-cancelled.png`.
- 실제 Spring/H2: `desktop-spring-h2-preparing.png`, `desktop-spring-h2-prepared.png`, `desktop-spring-h2-submitted.png`, `desktop-restarted-project.png`, `desktop-project-200.png`.

`failure-…` 이미지는 당시의 실패 증거로 남겨 두며 최종 정상 화면 근거로 사용하지 않는다. 이름이 `desktop-…`인 기존 웹 회귀 이미지는 Edge 화면일 수 있다. 위에서 **실제 앱**으로 구체적으로 열거한 파일만 Electron 캡처다.

## 남은 범위

- 실제 JDK 11·17 실행, ARM·macOS·Linux, Safari·Firefox, 실제 모바일 기기, OS 화면 배율 및 실제 IME는 이 검증에서 수행하지 않았다.
- 실제 NSIS 설치·제거, 설치된 바이너리에서의 동작, 코드 서명·SmartScreen, 릴리스 다운로드 및 배포 웹의 결과는 총괄 담당자의 별도 검증이다.
- 실제 실행을 수행한 실무 UI 대표는 `tx-proxy` Spring/H2이다. 모든 22개 실무 프로젝트, 실제 Redis/Kafka 컨테이너, 외부 네트워크 장애·프록시·기업 인증서는 본 독립 앱 시나리오 범위에 포함되지 않는다.
- 실행 중 앱 강제 종료, 악의적 코드의 보안 경계, 디스크 가득 참 등 OS 장애는 이 UI 검사로 검증했다고 주장하지 않는다. 별도 백엔드·보안 검토가 필요하다.
- ZIP과 링크 원문은 검사했으나 이번 검사에서 모든 외부 링크를 실제 방문하거나 채용 공고의 현재 유효성을 다시 조사하지 않았다.

수정한 파일: `tests/browser.mjs`, `tests/desktop.mjs`, `tests/professional.test.mjs`, 이 보고서. 앱 구현 파일은 QA 담당자가 수정하지 않았다.
