# macOS 설치와 패키징

## 지원 환경

macOS 13 Ventura 이상, Intel x64 또는 Apple Silicon arm64. Electron44는 macOS12를 지원하지 않는다. Apple 메뉴 → 이 Mac에 관하여에서 **칩**이 Apple M 계열이면 arm64, **프로세서**가 Intel이면 x64를 선택한다. 두 CPU의 JDK를 섞거나 Windows EXE를 Mac에서 실행하지 않는다.

패키지는 `Java-Edu-0.4.0-mac-arm64.dmg` / `Java-Edu-0.4.0-mac-x64.dmg`와 같은 CPU별 DMG·ZIP이다. 현재 실제 출시 여부와 검사 결과는 [Mac 검증 기록](macos-verification.md)을 따른다. 빌드 명령이 존재하는 것만으로 다운로드 가능·설치 성공을 뜻하지 않는다.

## 설치와 첫 실행

1. 자신의 CPU에 맞는 DMG를 열고 **Java Edu**를 **Applications**로 끌어 놓는다. 복사가 끝나면 디스크 이미지를 추출한다.
2. 응용 프로그램에서 **Java Edu**를 연다. ZIP을 선택했다면 전체 `Java Edu.app`을 해제해 응용 프로그램으로 옮긴다. `.app` 내부의 실행 파일·JDK만 분리하지 않는다.
3. 처음 코드 실습에서 실행 동의 내용을 읽고 동의한다. Java21·Maven3.10.0은 앱에 포함되어 있어 별도로 설치하거나 시스템 PATH를 바꾸지 않는다. Spring 실습은 처음 **환경 준비**할 때 인터넷이 필요하다.

프리뷰는 ad-hoc 서명이며 Apple Developer ID 서명·공증은 제공하지 않는다. 인터넷에서 내려받은 앱의 첫 실행이 차단되면 출처와 체크섬을 확인한 후 **시스템 설정 → 개인정보 보호 및 보안 → 그래도 열기**로 해당 앱을 허용할 수 있다. macOS 보안 기능 전체를 끄거나 quarantine을 일괄 제거하지 않는다. 조직 관리 정책에 따라 허용되지 않을 수 있다. CI의 실행 검증과 사용자의 실제 다운로드/Gatekeeper 흐름은 별개다.

학습 기록은 해당 Mac의 `~/Library/Application Support/java-edu`에 저장한다. Windows·웹과 자동 동기화하지 않는다. 앱을 지워도 사용자 기록을 자동 삭제하는 제거 스크립트는 제공하지 않는다. 기존 앱 교체 전에는 앱을 정상 종료한다.

## Mac에서 직접 빌드

Node22.12 이상에서 저장소 의존성을 설치한 후 해당 CPU의 Mac에서 아래 순서로 실행한다. 원본 아카이브·스테이징이 이미 존재하면 덮어쓰지 않고 중단한다. 재빌드는 기존 결과를 먼저 별도로 보존한다.

```sh
npm ci
npm run prepare:mac
npm run check:bundle
npm run build:desktop:mac -- --arm64
# Intel에서는 마지막 인수를 --x64로 선택한다.
```

최종 패키지 자동 검사는 개인 Mac의 기본 학습 기록을 보호하기 위해 **GitHub Actions의 일회용 macOS 러너에서만** 실행한다. 로컬 빌드 뒤 기존 개인 데이터로 검사 스크립트를 실행하거나 CI 전용 보호 조건을 우회하지 않는다. CI에서는 `node scripts/verify-macos-packages.mjs --arch arm64` 또는 `--arch x64`를 사용한다.

`prepare:mac`은 공식 Temurin21.0.12.1+1 macOS 아카이브와 Maven3.10.0 ZIP의 고정 SHA256을 대조한다. `.jdk/Contents` 전체와 원본 공급자 서명을 보존한다. 런타임 경로는 앱 내부 `Contents/Resources/toolchains/jdks/21/Contents/Home`이다. 공급자 고지·대응 소스 위치는 포함된 `THIRD-PARTY-NOTICES.txt`와 기존 [번들 계약](bundled-runtime.md)을 따른다.

macOS 프로세스 취소는 프로세스 그룹·시간·출력 한도와 JVM heap 제한을 사용한다. Windows Job Object의 전체 메모리·프로세스 수 제한 또는 강제 앱 종료 뒤 정리를 macOS에도 보장하지 않는다. 개인 학습 IDE이며 OS 보안 샌드박스가 아니다.

## 공식 근거

- [Electron44의 macOS 최소 버전](https://www.electronjs.org/blog/electron-44-0)
- [electron-builder26 macOS 빌드](https://www.electron.build/v26/docs/mac/)
- [GitHub의 Intel·Apple Silicon macOS 러너](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [Apple의 미공증 앱 실행 안내](https://support.apple.com/102445)
