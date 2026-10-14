# 현재 프로젝트 상태

2026-10-14. Windows·macOS 공통 소스를 `main`에 반영하고 Mac 사용자 검증용 v0.4.0 프리뷰를 게시하는 단계다. 기존 개발 브랜치의 Mac 변경과 `b8cc781`의 main CI 트리거·Windows 의존성 설치 보완을 함께 보존한다.

- 승인: 사용자가 main 병합·커밋·푸시와 실제 이용자 검증용 Mac 프리뷰 배포를 요청했다. PR 생성·강제 푸시·기존 릴리스 첨부 교체·사이트 공개 전환·유료 구매는 수행하지 않는다.
- 패키지 생성 소스: `1f93d9ef3a6f089c59e13778ff2b7ce9c6ea243c`. [실제 Mac CI](https://github.com/jbsim999/java-edu/actions/runs/38406992540)의 Intel·Apple Silicon·Windows 회귀 3작업 PASS. DMG·ZIP 4개의 실제 앱 실행 총28검사와 독립 수용 PASS.
- 게시할 파일: 위 CI의 네 파일을 재빌드하지 않고 그대로 사용한다. SHA256은 [Mac 검증 기록](macos-verification.md)에 있다. 내려받은 네 파일의 크기·SHA256도 원본 CI 기록과 모두 일치했다.
- main 통합: 앱·도구·빌드·테스트 소스를 위 패키지 생성 소스와 비교하여 차이 없음을 확인한다. 차이는 통합 문서·권한 기록·기존 원격 CI 보완이다. 병합 커밋과 패키지 생성 SHA를 혼동하지 않는다.
- 배포 전 조건: main의 전체 `Verify Java Edu`와 `Package and verify macOS` CI 성공, 릴리스 첨부의 크기·SHA256·대응 소스·태그 대상 검증. 현재 main 반영 및 릴리스 게시를 준비 중이다.
- 미검증: 개인 Mac의 다운로드/Gatekeeper 승인·실사용, Developer ID 공증, macOS13/14, 최종 Mac 앱의 실행 취소, 기본 실무20개 전체의 Mac 통합 실행. CI 통과를 사용자 검증 완료라고 표시하지 않는다.
- 사용자 검증 안내: [Mac 설치와 제보](macos-installation.md). 제보에는 macOS 버전·CPU·파일명·재현 순서·오류 메시지를 포함한다.

기존 Windows v0.3.1 릴리스와 사용자 학습 데이터는 보존한다. 웹 호스팅은 기존 소유자 전용 상태이며 이번 Mac 릴리스 작업과 별개다. 후속 작업은 이 상태 문서, [아키텍처](architecture.md), [협업 규칙](../CONTRIBUTING.md), [Mac 검증 기록](macos-verification.md) 순서로 필요한 자료를 확인한다.
