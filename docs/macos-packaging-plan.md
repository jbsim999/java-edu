# macOS 통합 패키징 계획 — 2026-10-13

사용자 요청: 기존 Windows 학습 앱을 macOS에서도 설치하고 실행하도록 추가 패키징한다. 기준 소스는 `f9d1a51f862f29c4350dd2bc8768da80064d0acd`이며 기존 교재·Windows 패키징·학습 기록 계약을 보존한다.

## 구현 기준

- Intel x64와 Apple Silicon arm64를 각각 해당 CPU의 macOS CI에서 빌드한다. universal/Rosetta 의존 패키지는 만들지 않는다.
- 각 DMG와 ZIP에 Electron, 정확히 고정한 Temurin JDK21 macOS 배포본 전체, Maven3.10.0을 포함한다. 학습자에게 별도 JDK/Maven 설치를 요구하지 않는다.
- macOS JDK의 전체 `.jdk/Contents` 구조와 원본 서명·라이선스·상대 링크를 보존한다. Java home은 `Contents/Home`이다. 링크는 같은 배포본 내부에서만 해석되며 파일 SHA256·링크 문자열·실행 비트를 검증한다.
- 기존 Windows schema1 번들은 계속 지원한다. Mac schema2는 OS·CPU 불일치를 거절한다. 빌드 도구만 명시적으로 대상 플랫폼을 전달한다.
- 기존 로컬 엔진의 동의·loopback 인증·고정 Maven 호출·파일 편집 제한·학습 저장을 유지한다. macOS는 프로세스 그룹 취소·시간·출력 제한 및 JVM heap 제한을 사용한다. Windows Job Object의 전체 메모리/프로세스 수 제한이나 강제 앱 종료 후 자손 종료를 macOS에서도 보장한다고 주장하지 않는다.
- 앱에는 ad-hoc 서명을 적용하며 포함된 공급자 JDK 서명을 변경하지 않는다. Apple Developer ID 인증서와 공증 자격증명이 없는 상태에서 공증 완료라고 표시하지 않는다. Gatekeeper 최초 다운로드 흐름은 CI 실행과 별도 확인 범위다.

## 완료 조건과 근거

1. Windows 회귀와 Mac 번들/경로/링크/CPU 계약 검사 성공.
2. 두 네이티브 Mac CI에서 공식 아카이브 SHA256 확인 → 스테이징 → DMG/ZIP 빌드.
3. 최종 DMG를 읽기 전용으로 마운트하여 격리된 Applications 폴더에 복사, 최종 ZIP은 별도 한글·공백·특수문자 경로에 해제. 각 실제 앱의 전체 파일/링크·번들 무결성과 소스 ASAR 대조.
4. 호스트 도구를 등록하지 않은 실제 패키지 실행, 명시적 동의, Java8/21 컴파일 대상 제출, Spring/H2 준비·정답 제출·미완성 실패, 재시작 후 저장 복원, 실제 화면 캡처.
5. 구현과 다른 읽기 전용 문맥에서 독립 검수. CI·패키지 해시·미검증을 출시 기록에 구분.

빌드/실행/패키징은 이번 요청 범위다. 기존 앱과 개인 학습 데이터·저장소 history는 보존한다. 실제 검증이 실패하면 해결하거나 미완료로 기록한다.
