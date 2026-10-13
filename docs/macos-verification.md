# macOS 패키지 검증 — v0.4.0

2026-10-13. 기준 소스 `f9d1a51`에 macOS Intel x64·Apple Silicon arm64 패키징을 추가한다. 기존 Windows v0.3.1 릴리스는 변경하지 않는다.

현재 구현과 실제 실행의 상태를 분리한다.

| 검사 | 현재 근거 |
| --- | --- |
| Windows 로컬 계약 | 최종 Node24.19 검사 24 PASS / macOS·Unix 4 SKIP; `work/macos-local-review/windows-local.log`, 실패 없음 |
| 콘텐츠·API·편집기 정합성 | Node40 PASS / 실제 원격 제공자1 SKIP |
| 웹 Worker | 빌드 및 CSP·인증·정적 파일 검사 PASS |
| electron-builder26 설정 | 실제 설치된26.15.3의 설정 schema 검사 PASS |
| macOS 네이티브 모드·링크·실행 | CI에서 확인 예정 |
| 최종 DMG·ZIP 앱 실행 | CI에서 확인 예정 |
| 독립 코드 검토 | 최종 소스 PASS, 남은 정적 차단 없음. 별도 검수 문맥에서 loader8 PASS/3 SKIP·Windows 감독1 PASS/1 SKIP·서명 제외 helper 정적 확인 |
| Apple Developer ID·공증 | 자격증명 미확인, 적용하지 않음 |
| 실제 사용자 다운로드/Gatekeeper | 미검증 |

`.github/workflows/package-macos.yml`은 네이티브 macos-15-intel / macos-15에서 공식 아카이브 확인, 포함 도구 실행, DMG·ZIP 빌드, 실제 최종 앱 검사와 화면 캡처를 수행한다. 정답 제출과 미완성 실패를 분리하고, 실제 실행하지 않은 검사를 성공으로 표시하지 않는다. ephemeral CI의 기본 사용자 데이터만 새로 생성하고 소유권을 확인한 검사 데이터는 증거 폴더로 보존한다. 기존 사용자 데이터가 있으면 실행을 중단한다.

실제 CI ID·소스 SHA·패키지 SHA256·독립 검토 결과는 실행 후 이 문서에 추가한다. 소스/설정이 존재하는 것과 설치 파일 제공·실제 Mac 실행 성공은 별개다.

독립 검수에서 Unix 정상 종료 후 자손이 stdout/stderr를 상속하면 `close`가 늦어져 timeout으로 오인될 수 있음을 발견했다. `exit` 시점에 남은 프로세스 그룹을 정리하고 상속 파이프 회귀 검사를 추가했다. Windows 실제 감독 회귀와 최종 로컬 검사는 PASS이며 Unix 실제 실행은 Mac CI에서 확인한다. 개발자 빌드 안내의 CI 전용 QA 명령도 별도 단락으로 정정했다.

현재 사용자는 검증용 `codex/macos-packaging` 브랜치의 선행 커밋·푸시와 GitHub Actions의 Intel·Apple Silicon 검증을 명시적으로 승인했다. 이전 선행 푸시 보류는 해제됐다. 두 환경의 실제 최종 패키지 실행 검증을 확인한 뒤 README에 결과와 근거를 반영한다. README 설치 위치·기존 Windows 다운로드 안내 회귀 검사는 1 PASS, 문서 diff 검사 PASS다. 병합·릴리스 게시는 이 승인에 포함되지 않는다.

소스 `e6a8479afe1fbb19c2164467e9c61b0852b7fabb`의 [첫 Mac CI](https://github.com/jbsim999/java-edu/actions/runs/38405962108)는 Windows 회귀 PASS, Intel·Apple Silicon의 콘텐츠/로컬 검사 PASS 후 공급자 아카이브 구조 확인 단계에서 FAIL이었다. SHA256 다운로드 검사는 통과했으며 패키징·최종 앱 실행은 이 실행에서 미실행이다. 실제 공식 JDK 아카이브의 최상위 폴더는 `.jdk` 확장자 없는 `jdk-21.0.12.1+1`이었다. 세 아카이브를 직접 내려받아 전체 목록·고정 SHA256을 확인한 근거는 `work/archive-layout-inspection/observed-layout.json`이다. 준비 스크립트를 정확한 공급자 폴더명·필수 Contents 구조 검사로 수정했으며 파일 이름·내용은 변경하지 않는다. 구조 회귀 검사는 Windows Node24에서 3/3 PASS다. 다운로드 직후부터 단계별 검증 자료를 보존하여 준비 단계 실패도 CI 산출물에 남긴다.

## JDK 서명과 매니페스트 불일치 점검

사용자는 별도 Mac이 없음을 확인하고 `distribution integrity mismatch` 사례의 발생 가능성을 점검하도록 요청했다. 첨부 문구의 570개 중 72개 파일 불일치 수치는 실제 설치 파일·매니페스트·검사 로그를 제공받지 않았으므로 확인된 재현 결과가 아니다. JDK 네이티브 실행 파일과 dylib만 크기가 달라지고 Maven이 정상인 패턴은 재서명 가설과 부합하지만 원인 확정 근거는 아니다. [Apple 코드 서명 문서](https://developer.apple.com/library/archive/technotes/tn2206/)에 따르면 서명은 실행 파일을 변경한다.

현재 설정은 전체 `Contents/Resources/toolchains`를 `mac.signIgnore`로 제외한다. 실제 고정된 electron-builder26.15.3의 `MacTargetHelper.buildSignOptions()`와 설치된 `@electron/osx-sign.signApp()`를 실행한 회귀 검사에서 JDK Java·javac·dylib 및 Maven 경로는 서명 명령에서 제외되고 Electron과 앱 본체는 서명 대상으로 유지됐다. 제외 설정을 제거한 대조 조건에서는 JDK도 서명 대상이었다. 서명 명령에는 `--deep`이 없으며 `--deep`은 검증 명령에만 있다. 이 검사는 네이티브 파일 탐색과 외부 명령을 대체한 **명령 선택 검사**이며 실제 Mac 서명 성공 근거가 아니다.

빌드 도구의 실제 호출 순서는 리소스 복사 → `afterPack` → 서명 → `afterSign` → DMG/ZIP 생성이다. 두 훅에서 포함 도구의 전체 크기·SHA256·모드·링크를 검사한다. 변경을 발견하면 빌드를 중단하며 매니페스트를 다시 작성하지 않는다. signer의 디렉터리 탐색은 제외 적용 전에 `.cstemp` 임시 파일을 지울 수 있으므로 `signIgnore`만으로 모든 파일 변경이 불가능하다고 주장하지 않는다. 이런 변경도 후속 무결성 검사 대상이다. 최종 패키지 QA는 DMG·ZIP에서 추출한 도구 전체를 원본 스테이징과 다시 비교한다.

Node24.19 Windows의 관련 검사 결과는 **9 PASS / 4 SKIP / 0 FAIL**이다. `tests/local/mac-signing.test.mjs`, `tests/local/mac-bundled-runtime.test.mjs`, `tests/local/bundled-runtime.test.mjs`를 실행했다. 파일 크기가 달라지는 변조뿐 아니라 크기가 같은 변조도 공유 로더에서 거부함을 확인했다. Mac 스키마의 `afterSign` 훅에 대한 실제 파일 변조 회귀 검사는 추가했지만 Windows에는 Unix 실행 권한이 없어 SKIP이며 native CI에서 실행해야 한다. 실제 macOS 코드 서명·설치·실행은 여전히 미검증이다.

추가 검사에 대한 별도 읽기 전용 검토에서도 수정이 필요한 결함은 없었고 독립 실행 결과는 9 PASS / 4 SKIP / 0 FAIL이었다. 명령 선택 검사에서 provisioning·자동 entitlement 처리는 비활성화했으므로 그 단계까지 실제 검증한 것으로 해석하지 않는다.
