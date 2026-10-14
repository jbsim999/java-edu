# macOS 패키지 검증 — v0.4.0

2026-10-13. 기준 소스 `f9d1a51`에 macOS Intel x64·Apple Silicon arm64 패키징을 추가했다. 실제 검증 소스는 `1f93d9ef3a6f089c59e13778ff2b7ce9c6ea243c`이며 [Mac CI 38406992540](https://github.com/jbsim999/java-edu/actions/runs/38406992540)의 Intel·Apple Silicon·Windows 회귀 3작업이 모두 PASS다. 기존 Windows v0.3.1 릴리스는 변경하지 않는다.

현재 구현과 실제 실행의 상태를 분리한다.

| 검사 | 현재 근거 |
| --- | --- |
| Windows 실행 회귀 | 실제 Windows CI 작업 PASS; 이전 Node24.19 로컬 검사 24 PASS / macOS·Unix 4 SKIP, `work/macos-local-review/windows-local.log` |
| 콘텐츠·API·편집기 정합성 | Node40 PASS / 실제 원격 제공자1 SKIP |
| 웹 Worker | 빌드 및 CSP·인증·정적 파일 검사 PASS |
| electron-builder26 설정 | 실제 설치된26.15.3의 설정 schema 검사 PASS |
| macOS 네이티브 모드·링크·실행 | macOS 15 Intel·Apple Silicon 각각 로컬32 PASS / Windows 전용1 SKIP; 공급자 아카이브 SHA256·포함 도구 실행 PASS |
| 최종 DMG·ZIP 앱 실행 | CPU별 DMG·ZIP 총4개 PASS, 앱별 실제 실행7검사로 총28 PASS |
| 독립 코드 검토 | 최종 소스 PASS, 남은 정적 차단 없음. 별도 검수 문맥에서 loader8 PASS/3 SKIP·Windows 감독1 PASS/1 SKIP·서명 제외 helper 정적 확인 |
| 최종 독립 수용 | 실제 CI 보고서·전체 인벤토리·네 패키지 실행 기록·대표 화면4종 대조 PASS; 남은 차단 결함 없음 |
| Apple Developer ID·공증 | 자격증명 미확인, 적용하지 않음 |
| 실제 사용자 다운로드/Gatekeeper | 미검증 |

`.github/workflows/package-macos.yml`은 네이티브 macos-15-intel / macos-15에서 공식 아카이브 확인, 포함 도구 실행, DMG·ZIP 빌드, 실제 최종 앱 검사와 화면 캡처를 수행한다. 정답 제출과 미완성 실패를 분리하고, 실제 실행하지 않은 검사를 성공으로 표시하지 않는다. ephemeral CI의 기본 사용자 데이터만 새로 생성하고 소유권을 확인한 검사 데이터는 증거 폴더로 보존한다. 기존 사용자 데이터가 있으면 실행을 중단한다.

2026-10-14 사용자가 main 반영과 실제 사용자 검증용 배포를 승인했다. 공통 소스는 main 통합 커밋 `d6e3422`이며, [v0.4.0 사전 릴리스](https://github.com/jbsim999/java-edu/releases/tag/v0.4.0)의 DMG·ZIP 네 파일은 기존 실제 검증 소스 `1f93d9e`에서 생성한 파일을 변경 없이 제공한다. 아래 파일 크기·SHA256과 총28 PASS는 이 배포 파일에 대한 근거다. 태그가 가리키는 main 커밋과 패키지 생성 소스를 구분한다. 원본 CI 산출물은 14일 보존되는 보조 자료이며 제품 다운로드는 GitHub Release를 사용한다.

릴리스 부속 자료: [SHA256SUMS-0.4.0](https://github.com/jbsim999/java-edu/releases/download/v0.4.0/SHA256SUMS-0.4.0) · [MACOS-QA-0.4.0.json](https://github.com/jbsim999/java-edu/releases/download/v0.4.0/MACOS-QA-0.4.0.json) · [RELEASE-PROVENANCE-0.4.0.json](https://github.com/jbsim999/java-edu/releases/download/v0.4.0/RELEASE-PROVENANCE-0.4.0.json). main 통합 검증 기록은 [공통 회귀 CI(12작업)](https://github.com/jbsim999/java-edu/actions/runs/38489210020)와 [Mac 패키지 CI(3작업)](https://github.com/jbsim999/java-edu/actions/runs/38489209878)다. main CI에서 새로 생성한 패키지를 기존 릴리스 파일과 혼동하지 않는다.

독립 검수에서 Unix 정상 종료 후 자손이 stdout/stderr를 상속하면 `close`가 늦어져 timeout으로 오인될 수 있음을 발견했다. `exit` 시점에 남은 프로세스 그룹을 정리하고 상속 파이프 회귀 검사를 추가했다. Windows 실제 감독 회귀와 두 Mac의 Unix 실제 검사에서 PASS를 확인했다. 개발자 빌드 안내의 CI 전용 QA 명령도 별도 단락으로 정정했다.

이전 검증 단계에서는 사용자가 `codex/macos-packaging` 브랜치의 선행 커밋·푸시와 GitHub Actions의 Intel·Apple Silicon 검증을 승인했으며 당시 승인에는 병합·릴리스 게시가 포함되지 않았다. 이후 실제 최종 패키지 실행 근거를 README에 반영했고 README 설치 위치·기존 Windows 다운로드 안내 회귀 1검사와 문서 diff 검사가 PASS했다. 2026-10-14의 main 반영·사용자 검증용 배포 승인은 별도 후속 단계이며 앞선 CI 검증과 이력은 그대로 보존한다.

소스 `e6a8479afe1fbb19c2164467e9c61b0852b7fabb`의 [첫 Mac CI](https://github.com/jbsim999/java-edu/actions/runs/38405962108)는 Windows 회귀 PASS, Intel·Apple Silicon의 콘텐츠/로컬 검사 PASS 후 공급자 아카이브 구조 확인 단계에서 FAIL이었다. SHA256 다운로드 검사는 통과했으며 패키징·최종 앱 실행은 이 실행에서 미실행이다. 실제 공식 JDK 아카이브의 최상위 폴더는 `.jdk` 확장자 없는 `jdk-21.0.12.1+1`이었다. 세 아카이브를 직접 내려받아 전체 목록·고정 SHA256을 확인한 근거는 `work/archive-layout-inspection/observed-layout.json`이다. 준비 스크립트를 정확한 공급자 폴더명·필수 Contents 구조 검사로 수정했으며 파일 이름·내용은 변경하지 않는다. 구조 회귀 검사는 Windows Node24에서 3/3 PASS다. 다운로드 직후부터 단계별 검증 자료를 보존하여 준비 단계 실패도 CI 산출물에 남긴다.

## JDK 서명과 매니페스트 불일치 점검

사용자는 별도 Mac이 없음을 확인하고 `distribution integrity mismatch` 사례의 발생 가능성을 점검하도록 요청했다. 첨부 문구의 570개 중 72개 파일 불일치 수치는 실제 설치 파일·매니페스트·검사 로그를 제공받지 않았으므로 확인된 재현 결과가 아니다. JDK 네이티브 실행 파일과 dylib만 크기가 달라지고 Maven이 정상인 패턴은 재서명 가설과 부합하지만 원인 확정 근거는 아니다. [Apple 코드 서명 문서](https://developer.apple.com/library/archive/technotes/tn2206/)에 따르면 서명은 실행 파일을 변경한다.

현재 설정은 전체 `Contents/Resources/toolchains`를 `mac.signIgnore`로 제외한다. 실제 고정된 electron-builder26.15.3의 `MacTargetHelper.buildSignOptions()`와 설치된 `@electron/osx-sign.signApp()`를 실행한 회귀 검사에서 JDK Java·javac·dylib 및 Maven 경로는 서명 명령에서 제외되고 Electron과 앱 본체는 서명 대상으로 유지됐다. 제외 설정을 제거한 대조 조건에서는 JDK도 서명 대상이었다. 서명 명령에는 `--deep`이 없으며 `--deep`은 검증 명령에만 있다. 이 검사는 네이티브 파일 탐색과 외부 명령을 대체한 **명령 선택 검사**이며 실제 Mac 서명 성공 근거가 아니다.

빌드 도구의 실제 호출 순서는 리소스 복사 → `afterPack` → 서명 → `afterSign` → DMG/ZIP 생성이다. 두 훅에서 포함 도구의 전체 크기·SHA256·모드·링크를 검사한다. 변경을 발견하면 빌드를 중단하며 매니페스트를 다시 작성하지 않는다. signer의 디렉터리 탐색은 제외 적용 전에 `.cstemp` 임시 파일을 지울 수 있으므로 `signIgnore`만으로 모든 파일 변경이 불가능하다고 주장하지 않는다. 이런 변경도 후속 무결성 검사 대상이다. 최종 패키지 QA는 DMG·ZIP에서 추출한 도구 전체를 원본 스테이징과 다시 비교한다.

Node24.19 Windows의 관련 검사 결과는 **9 PASS / 4 SKIP / 0 FAIL**이었다. `tests/local/mac-signing.test.mjs`, `tests/local/mac-bundled-runtime.test.mjs`, `tests/local/bundled-runtime.test.mjs`를 실행했다. 파일 크기가 달라지는 변조뿐 아니라 크기가 같은 변조도 공유 로더에서 거부함을 확인했다. Windows에서 SKIP했던 Mac 스키마 `afterSign` 훅의 실제 파일 변조 회귀 검사는 이후 두 native Mac CI에서 PASS했다.

추가 검사에 대한 별도 읽기 전용 검토에서도 수정이 필요한 결함은 없었고 독립 실행 결과는 9 PASS / 4 SKIP / 0 FAIL이었다. 명령 선택 검사에서 provisioning·자동 entitlement 처리는 비활성화했으므로 그 단계까지 실제 검증한 것으로 해석하지 않는다.

## 실제 최종 패키지 검증 결과

| 환경 | DMG | ZIP | 포함 도구 파일·링크 | 앱 실행 검사 |
| --- | --- | --- | --- | --- |
| macOS 15 Intel x64 | PASS | PASS | 571개, 공급자 스테이징과 전체 일치 | 각7/7 PASS |
| macOS 15 Apple Silicon arm64 | PASS | PASS | 573개, 공급자 스테이징과 전체 일치 | 각7/7 PASS |

네 파일 모두 앱 전체 스테이징 인벤토리와 파일 내용·모드·링크를 대조했다. 패키지별 ASAR 소스222개가 빌드 소스와 일치하고 앱·JDK의 네이티브 CPU를 확인했다. 앱의 ad-hoc 서명과 JDK의 공급자 서명을 실제 `codesign --verify --deep --strict`로 검사했으며 모두 exit0이다. 서명 후 JDK/Maven 전체 바이트가 공급자 스테이징과 일치해 `distribution integrity mismatch`는 발생하지 않았다. Intel·Apple Silicon의 파일 수 차이는 각 공급자 배포본의 목록 차이이며 두 CPU 목록을 서로 같은 것으로 취급하지 않는다.

DMG는 실제 마운트·앱 복사·마운트 해제 후 실행했고 ZIP은 별도 경로에 해제 후 실행했다. 경로에는 한글·공백·`&`·`%JAVA_HOME%`가 포함됐다. 앱은 `packaged:true`이고 기본 `~/Library/Application Support/java-edu`를 사용했다. 호스트 Java/Maven 환경변수와 PATH를 제외한 상태에서 포함 JVM21·Maven3.10.0을 실제 실행했다. 모의 API·가짜 출력·개발 Electron 실행으로 대체하지 않았다.

각 앱의 실제7검사: 첫 실행의 도구 자동 등록·동의 전 실행 불가, JVM21에서 컴파일 대상8 제출, 대상21 제출, Spring/H2 온라인 준비와 초안 보존, 미완성 제출0/2 실패·성취 없음, 정답의 오프라인 제출2/2 성공, 종료·재실행 후 진도·테마·코어/프로젝트 초안 복원. 총28검사 PASS, 페이지 오류0, 검사 앱의 정상 종료 확인 후 소유한 테스트 데이터를 증거 폴더에 보관했다. 패키징 전에는 코어12과제와 Spring/H2 `tx-proxy`의 실제 포함 도구 smoke 검사도 두 CPU에서 PASS했다.

| 파일 | 바이트 | SHA256 |
| --- | ---: | --- |
| `Java-Edu-0.4.0-mac-x64.dmg` | 339571139 | `c04e0199b3e797c8427efd52028f10fd4ea62b19d6142af97a9310b3d0cc7560` |
| `Java-Edu-0.4.0-mac-x64.zip` | 342834111 | `6a78e216df3bd5850fcaca2bf9b33562dd5d9d33114377c2fb70bb4cf7f8b51d` |
| `Java-Edu-0.4.0-mac-arm64.dmg` | 339633464 | `82c079d4116e915321d900947b68c87c0d2b8d74f1136426539e3f17b62cb561` |
| `Java-Edu-0.4.0-mac-arm64.zip` | 343050074 | `da266cbdc525db73e02c4b738ac39e9ffbebdc2ea6f6c77d3ae02303b4f98359` |

[Intel 산출물](https://github.com/jbsim999/java-edu/actions/runs/38406992540/artifacts/11819915823) · [Apple Silicon 산출물](https://github.com/jbsim999/java-edu/actions/runs/38406992540/artifacts/11818354876). 두 산출물을 로컬 `work/macos-ci-38406992540/{x64,arm64}`로 내려받아 실제 네 파일의 크기와 SHA256을 CI 기록과 대조했고 모두 일치했다. 대조 기록은 `work/macos-ci-38406992540/downloaded-package-verification.json`이다. 원본 기록은 각 산출물의 `work/macos-qa/<arch>/run-*/package-qa-results.json`·`dmg-runtime/runtime-results.json`·`zip-runtime/runtime-results.json`·화면 PNG이며, 공급자 아카이브 검증은 `work/macos-vendor-<arch>/download-verification.json`이다.

실제 다운로드 후 Gatekeeper 승인, Apple Developer ID 서명·공증, macOS13/14 등 다른 OS 버전, 개인 Mac 사용자 테스트, macOS 최종 앱의 실행 취소는 이 CI에서 검사하지 않았다. 코어의 대상8 컴파일·실행을 실제 JDK8 실행이라고 해석하지 않는다. 기본 실무20개 전체의 Mac 통합 실행 승인으로 확대하지 않으며 이번 실제 프레임워크 검사는 `tx-proxy`의 Spring/H2 대표 흐름이다.

별도 읽기 전용 검수 문맥에서 원본 CI 보고서·서명/파일 인벤토리·설정/코어 성공/Spring 미완성 실패/재시작의 대표 실제 화면4종과 최종 문서를 확인했다. 네 패키지의 실제7검사씩 총28 PASS, 파일 수·ASAR222개·공급자 서명·기본 사용자 데이터·페이지 오류0·정상 종료를 독립 대조했으며 최종 수용 PASS다. 다운로드 후 로컬 패키지 해시 대조 기록도 CI 값과 일치했다. 이는 실제 Mac CI 증거의 독립 검토이며 검수자의 Windows에서 Mac 앱을 다시 실행한 것으로 표현하지 않는다. README의 기존 Windows 설치 안내 회귀1검사와 문서 공백 검사도 PASS다.

## 실제 사용자 검증 단계 — 2026-10-14

사용자는 main 통합과 v0.4.0 사전 릴리스를 통한 실제 사용자 검증을 승인했다. 게시 대상은 위에서 Intel·Apple Silicon별 DMG·ZIP의 파일 크기·SHA256과 실제 실행을 확인한 네 파일이다. 문서와 CI 통합만으로 새로 패키징한 파일을 동일하게 검증한 것으로 취급하지 않는다. 기존 Windows v0.3.1 다운로드는 유지한다.

main 통합 커밋 `d6e34226aa49c859e0cf7a9c5bb7a78c4f8838f7`의 공통 CI12작업과 Mac CI3작업이 모두 PASS한 뒤 2026-10-14 00:29:07 UTC에 [v0.4.0 프리뷰](https://github.com/jbsim999/java-edu/releases/tag/v0.4.0)를 게시했다. 릴리스 ID412217306은 `draft:false`, `prerelease:true`이며 실제 태그도 이 main 통합 커밋을 가리킨다. 기존 검증 패키지4개·동일 버전 대응 소스2개·체크섬/QA/출처 기록3개로 총9첨부를 제공한다. 9개 모두 원본 크기·SHA256이 GitHub의 `uploaded` 첨부 값과 일치하고 로그인 없는 공개 다운로드 HEAD 요청은 모두 HTTP200·정확한 크기를 반환했다. 기존 릴리스 파일을 교체하지 않았다.

게시 증거는 `work/macos-release-0.4.0/main-ci-publication-gate.json`, `published-release-verification.json`, `public-download-access.json`이며 핵심 QA·출처·체크섬은 영구 릴리스에도 첨부했다. 독립 검수는 패킷9개 해시와 문서17개 첨부 링크의 정합성을 확인했다. 공개 후 접근 확인은 다운로드 가능성 검사이며 실제 Mac의 quarantine/Gatekeeper 승인 검사는 아니다.

개인 Mac의 설치·첫 실행·코어 제출·Spring 환경 준비와 제출·재시작 후 학습 기록 복원을 확인받는 단계다. 제보 경로는 [Issues](https://github.com/jbsim999/java-edu/issues)이며 필수 정보는 **macOS 버전·CPU·다운로드한 파일명·재현 순서·오류 메시지**다. Apple Developer ID·공증, 실제 다운로드 후 Gatekeeper, 개인 Mac 사용자 검증은 여전히 미검증이며 CI의 총28 PASS와 구분한다.
