# 0.3 번들 Windows 앱 독립 QA

상태: **PASS — 최신 ZIP 10/10·NSIS 10/10 기능, 설치·제거, 독립 시각 검수**. 2026-10-12에 같은 최종 제품으로 캡처 안정화 조건을 추가해 ZIP은 08:53:27.461–08:54:38.767 UTC, NSIS는 08:57:30.366–08:58:39.164 UTC에 실제 검증하고 각각 정상 종료했다. 총괄은 08:59:47 UTC에 제거·테스트 데이터 보관을 마쳤다. 아래 판정은 각 제품의 최신 10개 검사에 근거하며 이전 실행이나 0.2 결과를 합산하지 않는다. 초기 환경 검사·이전 ZIP·첫 NSIS 무결성 실패 이력은 따로 보존한다.

실행한 테스트 SHA-256은 두 제품 모두 `1b3cede082f77048135e87537c97cedef5b87bcce73644f040aa66dbd9f62969`다. 최신 결과는 `work/bundled-desktop-qa/zip/bundled-results-1791795278768.json`과 `work/bundled-desktop-qa/nsis/bundled-results-1791795519165.json`이다. 실제 Electron 패키지·번들 JVM/Maven을 사용했으며 API·실행 결과를 모의 처리하지 않았다.

독립 시각 검수에서 이전 재시작 화면의 상단 빈 띠를 발견해 추가 검증했다. 기존 helper는 toast 숨김만 기다렸지만, 새 helper는 실제 scrollX/Y·viewport·문서 크기·주요 영역 bounds·내부 scrollTop의 600ms 연속 안정과 캡처 전후 일치를 확인한다. ZIP은 scrollY가 923→1185→1201로 이동한 뒤 332–945ms 동안, NSIS는 923→1178→1201로 이동한 뒤 293–906ms 동안 동일하게 유지됐다. 안정 시 두 제품 모두 사이드바 y=24px·편집기 y=429.63px였다. 재시작 기본·확인 PNG 네 장의 SHA-256은 모두 `04fc6d5a3c960b5c3febbc26c2a90c659fbfa770b5248fdf16bf7c40918c20aa`이며 직접 확인한 네 이미지에 이전 211/248px의 상단 빈 띠가 없다. 같은 제품에서 지속적인 레이아웃 결함은 재현되지 않았고, 기존 캡처의 이동 완료 대기 누락으로 판단한다. 화면을 맞추는 스크롤·스타일·초점 조작이나 제품 변경은 추가하지 않았다. 각 결과 JSON의 `captures`에 샘플을 보존했다.

## 실제 결과

| 검사 | ZIP | NSIS |
| --- | --- | --- |
| 외부 도구 경로 없이 번들 자동 등록 | PASS; JVM 21·Maven 3.10.0, source bundled | 동일 PASS |
| 동의 전 실행·폴더 선택 없음 | PASS; 학습자 요청 0회, 폴더 선택 0회 | 동일 PASS |
| Java 8 대상 제출 | 실제 JVM 21에서 6/6 | 실제 JVM 21에서 6/6 |
| Java 11 대상 제출 | 실제 JVM 21에서 5/5 | 실제 JVM 21에서 5/5 |
| Java 17 대상 제출 | 실제 JVM 21에서 6/6 | 실제 JVM 21에서 6/6 |
| Java 21 대상 제출 | 실제 JVM 21에서 6/6 | 실제 JVM 21에서 6/6 |
| Spring/H2 환경 준비 | 실제 Maven 2/2; 초안·미완료 성취 유지 | 동일 PASS |
| Spring/H2 학생 제출 | 실제 Maven 2/2; --offline 확인 | 동일 PASS |
| 실제 앱 재시작 | 포트 52415→61427; 등록 경로·동의·진도·초안·테마 보존 | 포트 63593→60542; 동일 보존 PASS |
| 최소 창·문서 글꼴 200% | 704×521 viewport; 상단·도구 카드·닫기 버튼 전체 가시성, 가로 넘침 없음·닫기 PASS | 동일 PASS |

각 제품에서 실제 관측한 코어 java/javac 명령 8개와 Maven 명령 2개 모두 해당 제품의 `resources/toolchains` 내부 파일을 사용했다. 각 javac의 `--release` 값은 8/11/17/21에 일치했다. 준비 시 실제 Maven 명령에는 `--offline`이 없고 학생 제출에는 있었다. 두 앱 자식의 PATH/JAVA_HOME/MAVEN_HOME은 실제로 모두 부재였고 기본 사용자 데이터는 `C:/Users/USER/AppData/Roaming/java-edu`였다. 기록된 브라우저 오류는 각각 0건이며 앱 API 요청은 해당 앱의 loopback origin뿐이었다.

각 제품의 최신 폴더에 `bundled-first-launch-settings.png`, `bundled-settings-minimum200-{top,tools,close}.png`, 코어 대상별 제출, Spring/H2 준비·제출, `bundled-restarted-achievement.png`와 `bundled-restarted-achievement-confirmation.png`를 저장했다. 재시작 캡처는 자연스럽게 스크롤된 편집기 위치이며, 저장된 객관식·실습 성취 자체는 UI의 실제 data-complete 및 저장값으로 별도 검증했다. 모든 최신 원본을 독립 시각 담당에게 전달했다.

총괄의 최신 `work/bundled-desktop-qa/package-zip.json`은 검토 커밋 `0e1ff5eb38484d1594d4fd1c231d4dbe229b44e8`의 원본 197개·생성 2개·번들 604개(355,610,126 bytes)가 빌드 및 최종 ZIP과 일치함을 기록한다. 번들 ID는 `548c060050b821dbcb99fd90e3f9e992e47e6ab3899d12551c9d7fb965581760`, 최종 ASAR SHA-256은 `8ee1c5df3de2472ff18a31e45cb6054cedd17b89389db8e579aea87c8c7c51e2`, 앱 exe SHA-256은 `d7e0bfab510476dc433b175624a10dd4753c725c4d72949f6870a2af7b09c043`다. 패키지 전체 바이트 대조는 총괄 수행이며 이 보고서의 실제 앱 실행과 구분한다.

총괄의 최신 `installation.json`은 08:56:18 UTC에 최종 NSIS가 지정 특수문자 경로에 exit 0으로 설치되었음을 기록한다. 설치 EXE SHA-256은 `b3e0a56b339fc3946cd80c194b9b5a544fdb3d5044277fc00acd6a9a11e8eeb8`이다. `package-nsis.json`도 같은 소스 197개·생성 2개·번들 604개 및 동일 ASAR/exe/helper 바이트 일치를 확인한다. QA는 실제 앱을 종료했으며 설치·제거·레지스트리 변경·AppData 보관을 직접 수행하지 않았다.

총괄의 최신 `uninstallation.json`은 08:59:47 UTC에 NSIS exit 0, 전용 설치 경로 없음, 제거 등록 0개, 설치 바로가기 0개, 학습 데이터 보존을 확인한다. 이후 총괄은 사전 부재·실제 실행 결과의 userData·생성 시점·종료 상태를 대조해 이번 ZIP 데이터를 `app-data-zip-stability`, NSIS 데이터를 `app-data-nsis-stability`로 보관했다. 각 `-archive.json`은 해당 최신 실행 JSON과 정확한 원래 userData를 연결한다. 원래 사용자 AppData 두 경로가 없던 상태를 복원했다는 총괄 확인을 받았다. 이 보관·제거는 총괄 수행이다.

## 패키징 수정 이력

같은 최종 소스의 안정화 전 검사는 ZIP 08:35:21–08:36:23 UTC, NSIS 08:39:30–08:40:31 UTC에 각각 10/10 PASS였다. ZIP 결과 `bundled-results-1791794183707.json`의 테스트 SHA는 `8d82e6512ef70728b726d0ff6c4560db24bc887fa48b0510e5782ed3c0ba70f8`, NSIS 결과 `bundled-results-1791794431439.json`의 테스트 SHA는 `f6eab97f0ab4e86ce5910cd6e4550b91347463ec0e2af3ac4f70114aa258ebe6`이다. 당시 PNG·JSON은 `{zip,nsis}-source-0e1ff5-before-stability`에 별도 보존했다. 당시 NSIS에는 최소 창·200% 도구 카드 중간 검사와 정확한 설치 경로 guard를 추가했다. 총괄의 당시 설치 시각은 08:37:45, 제거 시각은 08:41:27 UTC였다. 데이터는 `app-data-zip-source-0e1ff5`·`app-data-nsis-final`에 보존했고 과거 제거 근거도 총괄이 별도 보존했다. 이 초기 재시작 PNG는 최종 안정 화면의 근거로 사용하지 않는다.

이전 소스 `ffb77751b45d360804090a46fe7efa2e105ab81d`의 ZIP은 08:15:00–08:16:02 UTC에 10/10 PASS였다. 결과 `bundled-results-1791792962539.json`과 모든 당시 화면은 `work/bundled-desktop-qa/zip-source-ffb77751`에도 별도 보존했다. 당시 ASAR는 `a8c775223188330b4f2e9afee77513b6629fbdab50b611841ce5b37fdacbd8cb`, exe는 `f8dfdcd01c5dcef6a8b0769a394c86f0ba0b1e07d594fbabc01a230799e32b70`이었다.

그 뒤 총괄이 첫 NSIS 설치 산출물의 번들 파일 604개 중 602개만 존재함을 발견해 무결성 FAIL로 중단했다. 해당 NSIS의 앱 기능 QA는 실행하지 않았다. 총괄이 NSIS 압축 옵션 `differentialPackage:false`, `useZip:true`를 적용해 새 소스로 재빌드했고 전체 바이트 대조를 통과한 최종 ZIP을 위와 같이 재검증했다. 이전 기능 PASS를 새 패키지 검증으로 대체하지 않았다. 첫 NSIS 실패와 새로운 설치·무결성 검증은 총괄 근거에 따라 구분한다.

## 실행 조건과 소유권

총괄이 실제 사용자 AppData 부재를 `work/bundled-desktop-qa/preflight.json`에 확인하고 ZIP 해제·NSIS 설치를 수행한다. QA는 총괄이 지정한 실행 파일만 시작하며 사용자 데이터 경로를 우회하지 않는다. 앱 정상 종료 뒤 생성된 QA 데이터 보관과 설치 제거도 총괄 담당이다. 기존 사용자 AppData가 발견되면 앱 실행 전 중단한다.

순서는 ZIP → 총괄 데이터 보관 → NSIS다. ZIP은 `work/bundled-zip/한글 학습 & %JAVA_HOME%`를 포함한 실제 경로에서 실행한다. 최종 NSIS는 총괄이 지정한 `work/한글 설치 & %JAVA_HOME%/Java Edu.exe`를 실행한다. 검사 파일은 `tests/bundled-desktop.mjs`, 근거는 `work/bundled-desktop-qa/{zip,nsis}`에 둔다.

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='1'
$env:NODE_OPTIONS='--use-system-ca'
node tests/bundled-desktop.mjs --kind zip --executable '<approved-absolute-zip-exe>'
node tests/bundled-desktop.mjs --kind nsis --executable '<approved-absolute-nsis-exe>'
```

두 명령 사이에는 총괄의 사용자 데이터 보관·다음 제품 준비 확인이 필요하다. 환경변수 `BUNDLED_PACKAGE_KIND`, `BUNDLED_APP_EXE`로 같은 입력을 전달할 수도 있다.

## 수용 조건

| 영역 | 각 제품에서 확인할 실제 행동 |
| --- | --- |
| 자동 등록 | JDK 21 및 Maven `source: bundled`; 리소스 경로가 해당 제품 내부이며 `bundledRuntime.id/javaVersions/mavenVersion` 일치 |
| 외부 도구 불필요 | 앱 자식 환경에서 PATH 명시적 빈 값, JAVA_HOME/MAVEN_HOME 제거, JDK/Maven 폴더 선택 호출 0회 |
| 동의 경계 | 최초 동의 false, 실행/제출 비활성; 앱·설정 진입과 동의 체크만으로 코드·환경 준비 요청 없음 |
| 코어 | Java 8/11/17/21 대상 기준 답안을 모두 실제 번들 JVM 21로 제출; 결과뿐 아니라 실행 명령의 번들 java/javac 경로 및 --release 대상 확인 |
| 실무 | tx-proxy의 실제 Spring/H2 환경 준비와 제출; 준비 시 학생 초안과 미완료 성취 보존; POM 제외한 학생 파일만 제출 |
| Maven 모드 | UI가 만든 일시적 command JSON을 읽기 전용 관찰; 번들 Maven launcher/home 사용, 준비에는 --offline 없음, 학생 제출에는 --offline 있음 |
| 재시작 | 실제 종료·다른 포트 재시작; 번들 경로/source, 동의, 진도, 테마, 코어·파일별 초안 보존; 실제 편집기 끝의 초안 주석 확인 |
| 화면 | 기본 설정의 번들 표시, 최소 창 720×560·문서 글꼴 200%의 설정 상단·도구 카드·닫기 버튼; 가로 넘침과 실제 닫기; scroll/bounds 안정 캡처 |

폴더 선택 API는 호출 사실을 기록하고 실패시키는 감시만 사용하며 경로 값을 주입하지 않는다. 앱 API·Java·Maven 응답은 모의 처리하지 않는다. 클립보드도 대체하지 않고 실행 요청 원문·실제 저장값·편집기의 표시를 대조한다. 실제 OS 폴더 대화상자 조작과 클립보드 작동은 검사 범위가 아니다.

실행 중인 이 앱의 command JSON은 읽기만 하며 AppData 파일을 직접 작성·삭제하지 않는다. 최초 Maven 환경 준비의 의존성 다운로드에는 정상 네트워크가 필요하다. 준비 후 학생 제출의 Maven 오프라인 옵션을 확인하는 것은 모든 Java 코드의 네트워크 차단을 의미하지 않는다.

## 현재 실제 결과와 미확인

최신 ZIP·NSIS의 실제 번들 JVM/Maven 제출과 데이터 보존은 모두 위와 같이 통과했고 총괄의 제거·데이터 보관도 완료했다. 재시작 화면의 빈 띠는 안정화 후 두 제품에서 재현되지 않았다. 독립 시각 담당도 최신 재시작 원본·확인 화면과 최소 창·200% 도구 카드·닫기 버튼을 직접 검토하여 양쪽 제품 PASS를 전달했다. 기존 0.2 검사와 제품 소스는 수정하지 않았다. 각 제품의 실무 패키지 검증은 대표 Spring/H2 tx-proxy를 대상으로 하며 기본 20개 실무 프로젝트 전부를 이 검사에서 다시 실행하는 것은 아니다.

첫 ZIP 앱 시작은 환경 확인에서 BLOCKED되었다. 자식 환경 객체에서 PATH를 삭제해도 Node/Windows가 부모 PATH를 복원하는 동작을 관찰했으며, 별도 무해한 Node 자식 프로세스에서도 shell:false 조건으로 재현했다. PATH 생략 시 기존 경로가 남고 명시적 빈 문자열일 때 길이 0이었다. 제품 실행 실패로 판정하지 않으며 학습자 코드는 실행하지 않았다. 테스트는 PATH를 명시적 빈 값으로 전달하고 실제 Electron 자식의 빈 값을 확인하도록 보완했다. JAVA_HOME/MAVEN_HOME와 QA_DATA 등은 계속 제거한다. 최초 근거 `zip/bundled-results-1791792262438.json`은 보존한다.

두 번째 환경 검사는 PATH 키가 반드시 존재하면서 빈 값이어야 한다는 과도한 기대값으로 중단됐다. Playwright가 사용하는 Windows shell:true 조건을 별도 Node 자식으로 재현하니 빈 PATH 키 자체가 제거됐으며, shell:false에서는 빈 키가 유지됐다. 검사 조건을 ‘PATH 부재 또는 빈 값’으로 고쳤고 실제 환경값을 실패 여부와 무관하게 먼저 기록한다. 두 번째 실행도 학습자 요청 전 중단·정상 종료되었으며 `zip/bundled-results-1791792702100.json`과 기본 사용자 데이터 출처를 보존한다.

화면 근거는 실제 Windows 패키지 앱의 Electron viewport 캡처이며 물리적 모바일 기기 검사가 아니다. SmartScreen의 인터넷 다운로드 경고 흐름, OS 클립보드, 번들 밖 JDK 및 Redis/Kafka 외부 서비스 실행은 이 검사에 포함하지 않는다.
