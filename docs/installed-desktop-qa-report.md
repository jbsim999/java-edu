# 실제 Windows 설치 패키지 QA

판정: **PASS**. 2026-10-12 06:57:04–06:58:08 UTC에 실제 NSIS 설치 앱으로 실행한 기능 검사는 8/8 PASS였고 앱을 정상 종료했다. 총괄이 실제 설치 제거를 확인했고 독립 시각 담당도 두 보완 화면을 직접 확인하여 Windows 앱 시각 검수를 PASS로 완료했다.

## 실제 실행 결과

| 검사 | 실제 결과 |
| --- | --- |
| 설치 ASAR 실행 코드 및 unpacked helper 8개 원본 바이트 대조 | PASS; 모든 파일 길이·SHA-256 일치 |
| 실제 packaged 앱·기본 사용자 데이터·보안 설정 | PASS; 설치 exe/ASAR, contextIsolation=true, nodeIntegration=false, sandbox=true, webSecurity=true, allowRunningInsecureContent=false |
| 첫 실행 안내·실제 JDK 21/Maven 등록·명시적 동의 | PASS; 미등록 실행 차단, 등록만으로 코드 실행 없음 |
| 실제 JVM 21의 코어 제출 | Java 8 대상 6/6, Java 21 대상 6/6 PASS |
| Spring/H2 tx-proxy 환경 준비 | 실제 Maven 2/2 PASS; 기존 소스 유지, 객관식·코드 성취 모두 미완료 |
| Spring/H2 tx-proxy 학습자 제출 | 실제 Maven 2/2 PASS; 편집 파일 원문만 제출, 읽기 전용 POM 제외, 성취 기록 |
| 앱 종료·재시작 | 포트 57164→59278; 진도·테마·코어 및 파일별 초안 보존, 준비 상태 재검증 필요, 완료 성취 유지 |
| 최소 창·200% 설정 끝 | 외곽 720×560, renderer 704×521, 문서 글꼴 32px; 닫기 버튼 전체 표시와 닫기 동작 PASS |

오류 이벤트는 없었다. 기록된 앱 API 요청은 앱의 `127.0.0.1` 엔드포인트뿐이며 외부 Java 실행 제공자는 호출하지 않았다. 최초 Maven 환경 준비에는 정상 라이브러리 다운로드가 포함된다.

실행 명령은 승인된 도구 경로와 정상 TLS 설정을 적용한 `node tests/installed-desktop.mjs`다.

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='1'
$env:NODE_OPTIONS='--use-system-ca'
$env:JAVA_EDU_JDK_21='<approved-toolchains>/jdk21/jdk-21.0.12.1+1'
$env:JAVA_EDU_MAVEN_HOME='<approved-toolchains>/maven/apache-maven-3.10.0'
node tests/installed-desktop.mjs
```

실제 도구는 이전에 승인된 작업 폴더의 Temurin JDK 21.0.12.1+1, Maven 3.10.0이다. 앱 자식 프로세스에는 `JAVA_EDU_QA_DATA`, `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`를 전달하지 않았고 기본 사용자 데이터를 사용했다.

## 설치·산출물 근거

총괄이 실제 NSIS를 사용자 범위의 전용 경로에 설치했다. `installation.json`은 06:50:28 UTC 설치 exit 0을 기록한다. 총괄의 `package-installed.json`은 검토 커밋 `6ba4b8aa124f5ce78e79240253946c9fdac3e770`의 원본 195개와 생성 파일 2개가 설치 ASAR·helper와 일치함을 기록하며, 이 QA는 추가로 핵심 실행 파일 8개를 직접 바이트 대조했다.

- 설치 EXE SHA-256: `6d4354e0b4a5c8b471591f0ee29c106f9ec65c2561847416555c38e623fd2f74`
- 설치된 앱 exe SHA-256: `31e0610596ea65191bb964dd4f20426bad6da72eb6eca0cb06200900d2b9e636`
- 설치 ASAR SHA-256: `e14c590d6415db74250a293271c97cf1ad8a910e880cd426ef67f3b4a71cbf6b`
- 실행한 테스트 SHA-256: `66db3afc4b719203a958d4efa8705f6f597c54e62bee1078976e95c7b27124cf`
- 최종 실제 결과: `work/installed-desktop-qa/installed-results-1791788288577.json`
- 설정 끝 캡처: `installed-settings-minimum200-close-button.png`
- 준비와 성취 분리 캡처: `installed-prepare-complete-still-incomplete.png`

모든 근거는 저장소 `work/installed-desktop-qa`에 있다. 두 번째 캡처는 준비 결과 카드와 상단 미완료 성취를 동시에 보여주기 위해 실제 창 content viewport를 1424×1794로 설정했다. 전체 페이지 합성이나 DOM 이동은 하지 않았다. 요청한 설정·준비 상태를 QA가 직접 이미지로 확인했고 독립 시각 담당에게도 전달했다.

총괄이 수행한 실제 제거는 07:01:27 UTC의 `uninstallation.json`에 기록되어 있다. NSIS exit 0, 전용 설치 폴더 없음, 제거 등록 0개, 설치 소유 바로가기 0개, 학습 데이터 보존을 확인했다. 최초 제거 후 확인은 무관한 바탕 화면 하위 폴더의 접근 거부로 중단되었으나 제거 자체는 완료되었고, 설치 소유 바로가기 5개의 정확한 경로만 확인하는 후속 검사로 보완했다. 이 설치·제거 사실은 총괄의 실행 근거이며 QA가 제거 명령을 실행한 것으로 기록하지 않는다.

독립 시각 담당은 최소 창·글자 200%의 설정 닫기 버튼과 준비 완료/학생 미완료 상태가 함께 보이는 캡처를 직접 확인하여 기존 두 검증 공백이 해소되었다고 판정했다. 해당 Windows 앱 화면에 대한 시각 판정은 PASS다.

## 사전 검사

2026-10-12 06:25:27 UTC에 실제 사용자 환경에서 다음을 읽기 전용으로 확인했다.

| 대상 | 결과 |
| --- | --- |
| `%APPDATA%/java-edu`, `%APPDATA%/Java Edu` | 모두 없음 |
| 실제 `%USERPROFILE%/AppData/Local/java-edu`, `Java Edu` | 모두 없음 |
| 실제 Local/Programs/java-edu | 없음 |
| 사용자·공용 바탕 화면 및 시작 메뉴의 Java Edu 바로가기 | 없음 |
| HKCU·HKLM·WOW6432Node의 Java Edu 제거 등록 | 없음 |
| 저장소 `work/installed-java-edu-test` | 없음 |

샌드박스 프로세스의 `LOCALAPPDATA`가 컨테이너 경로로 바뀌는 것을 확인해 실제 사용자 Local 경로로 다시 검사했다. 기존 사용자 파일·레지스트리를 수정하지 않았고 사전 검사 결과만 저장소 `work/installed-desktop-qa/preflight.json`에 기록했다.

## 검사 범위와 모의 처리

`tests/installed-desktop.mjs`는 설치를 자동 수행하지 않는다. 총괄이 확정한 NSIS를 작업 전용 경로에 설치한 이후 실행했다. 준비된 실행 파일과 JDK·Maven이 없거나 기존 사용자 앱 데이터가 발견되면 앱을 시작하지 않는다.

검사 계약:

1. 앱 실행 전에 설치된 `app.asar`의 `server/local/{process,engine,http,settings}.mjs`와 `desktop/{main,preload,reference-policy}.cjs`를 `@electron/asar.extractFile`로 읽어 저장소 원본과 바이트 단위 대조. 실제 실행되는 `app.asar.unpacked/desktop/job-runner.ps1`도 원본과 대조하며 파일별 길이·SHA-256·일치 여부 기록. 불일치는 FAIL로 처리하고 앱 실행 중단.
2. 실제 `app.isPackaged`, 설치 경로의 exe·ASAR, 일반 사용자 AppData 경로와 `contextIsolation`, `nodeIntegration`, `sandbox`, `webSecurity`, `allowRunningInsecureContent` 보안 설정 확인. `JAVA_EDU_QA_DATA` 우회 없음. 설치 앱이 제공하는 `app.js`, `styles.css`, `lesson-visuals.js`도 원본 대조.
3. 실제 JDK 21·Maven 검사, 명시적 실행 동의. 모의 처리는 OS 폴더 선택 대화상자의 반환값과 편집기 전체 원문 대조용 `navigator.clipboard.writeText` 수집 두 가지다. 실제 OS 클립보드 읽기·쓰기는 검증하지 않는다. 앱 API·JDK·Maven 실행은 모의 처리하지 않는다.
4. 실제 JVM 21에서 코어 Java 8 대상 및 Java 21 대상 제출.
5. Spring/H2 `tx-proxy` 실제 준비와 제출. 준비만으로 학생 성취가 생기지 않음 확인.
6. 앱 종료·재시작 후 다른 로컬 포트에서 진도·테마·코어 및 프로젝트 초안 보존.
7. 최소 외곽 창 720×560·문서 글꼴 200%에서 설정 마지막 닫기 버튼 전체 표시와 실제 닫기.
8. 준비 완료의 결과 카드 제목·안내와 학생 미완료 상태가 함께 보이는 실제 viewport 캡처.
9. 설치·제거는 총괄이 별도 기록한다. QA 스크립트는 앱을 정상 종료하며 레지스트리 변경·데이터 삭제·앱 제거를 수행하지 않는다.

`node --check tests/installed-desktop.mjs`는 PASS다. 이는 실제 앱 검증 결과가 아니다.

2026-10-12 06:50:57 UTC의 읽기 전용 API 점검에서 빌드 폴더 `desktop-release/win-unpacked`의 위 8개 파일과 원본의 바이트 일치가 모두 PASS였다. 이 점검은 `extractFile`의 Windows 경로 정규화까지 확인했으며 설치본 검증을 대체하지 않는다. 근거는 `work/installed-desktop-qa/build-api-proof.json`이다. 설치 EXE의 SHA-256도 총괄이 전달한 `6d4354e0b4a5c8b471591f0ee29c106f9ec65c2561847416555c38e623fd2f74`와 일치했다.

설치 위치: `<repository>/work/installed-java-edu-test`. 산출물: `<repository>/work/installed-desktop-qa`. 공개 교재의 기준 코드와 이전에 승인된 JDK 21·Maven 경로만 사용한다. 외부 Java 제공자에 학습 코드를 보내지 않는다.

## 첫 실행 오류와 재검증

첫 실행에서 설치 ASAR/helper 8개 대조, packaged/default userData·보안 설정, 실제 도구 등록은 PASS였다. JVM 21의 Java 8 대상 제출 6/6, Java 21 대상 제출 6/6 및 Spring/H2 준비 2/2도 실제 실행했다. 준비 응답의 정상 제공자는 `Local Maven`인데 검사 코드가 `Local JDK`만 기대하여 중단했다. 이는 검사 기대값 오류이며 제품 실패로 판정하지 않는다. 수정 전 근거 `installed-results-1791787998728.json`은 보존한다.

앱은 정상 종료했으며 이 검사로 생성한 사용자 데이터는 `C:/Users/USER/AppData/Roaming/java-edu`다. 사전 검사에서 없던 경로임을 확인했고 QA가 삭제하거나 생산 데이터 경로를 우회하지 않았다. 총괄은 첫 검사 데이터의 원래 경로·사전 부재·프로세스 종료를 확인하고 `work/installed-desktop-qa/app-data-first-run`에 보관했다. 보호 guard를 유지한 재실행은 8/8 PASS였고 새로 생성된 같은 사용자 데이터 경로를 결과에 기록했다. 총괄이 제거 후 보존된 최종 QA 데이터도 동일한 경로·사전 부재·종료·reparse 여부를 확인하여 `work/installed-desktop-qa/app-data-final-run`에 보관했고, 원래 AppData 경로가 없던 상태로 복원했다. 두 검사 데이터 백업과 첫 실패 로그는 보존했다.

## 미확인 및 판정 경계

이 결과는 실제 Windows 설치 앱의 위 8개 시나리오에 대한 **PASS**다. 앱 API·JDK·Maven 응답은 모의 처리하지 않았다. 모의 폴더 선택은 실제 Windows 파일 대화상자 조작 검증을 뜻하지 않으며, 모의 복사 원문 수집은 OS 클립보드 작동 검증을 뜻하지 않는다.

실제 모바일 기기, 인터넷에서 내려받은 unsigned 설치 파일의 SmartScreen 흐름, 다른 Windows 사용자·OS 환경, 설치본의 실제 JDK 8/11/17, Redis/Kafka 실행은 이 검사에서 수행하지 않았다. 문서 글꼴 확대는 시스템 배율·보조기술 검사와 구분한다. 이전 개발 Electron·웹 검증은 별도 보고서의 범위이며 이번 설치 앱 PASS 수에 합산하지 않았다.
