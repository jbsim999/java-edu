# 코어 프로토타입 배포 기록

2026-10-12 03:36:36 UTC(한국시간 12:36:36)에 Sites의 개인 전용 배포가 성공했다. 운영 URL은 [Java Learning Lab](https://java-edu-lab-jbsim999.junbo1218.chatgpt.site)이다. 공개 GitHub 저장소와 별개로 사이트는 소유자 계정만 접근한다.

| 항목 | 확인 값 |
| --- | --- |
| GitHub 출시 소스 | `165e113cc77bb56f0bfab78cf28f94de47f022cd` |
| 브랜치 | `feat/java-learning-mvp` |
| 출시 CI | [38200134013: 모든 6개 작업 성공](https://github.com/jbsim999/java-edu/actions/runs/38200134013) |
| Sites 프로젝트 | `appgprj_6acc4fec8bb48191a296197d2d55c1e3` |
| Sites source SHA | `e5c276479bf60c606884c61fb5b90a472e246d2c` |
| 저장된 버전 | `appgprj_6acc4fec8bb48191a296197d2d55c1e3~appgver_ff8ebe8af5d88191a2d038ddb0302484` |
| 배포 ID | `appgdep_6acc55b5a94c81918d004500c476c6c4` |
| 실제 응답 상태 | `succeeded`, `failure_message: null` |

별도 체크아웃을 통해 Sites source helper로 commit/push 및 패키징했다. GitHub origin은 변경하지 않았다. 모든 출시 파일의 Git blob을 비교해 `.gitignore`의 호스팅 metadata 제외 규칙 외 동일함을 확인했다. Sites에만 `.openai/hosting.json`이 추가되며 인증 토큰은 세션 메모리와 숨겨진 stdin에만 사용했다.

정적 UI·데이터와 서버 API를 ESM Worker로 묶었다. Cloudflare Worker 안에서 JVM을 실행하는 방식이 아니라 고정된 외부 Wandbox API를 호출한다. 네 대상 버전은 `--release`로 컴파일하며 실제 실행 JVM은 21이다. Spring/의존성/DB/HTTP 앱 실행은 후속 마일스톤이다.

기능·반응형·키보드·저장소·경쟁 응답은 모의 API 브라우저 QA로, 제공자 실행은 별도 실제 호출로 확인했다. 배포된 인증 세션의 Java 제출·실제 기기·장기 부하 검증은 수행하지 않았다. 상세 범위는 [검증 기록](verification.md)을 따른다. 배포 성공 응답은 런타임 종단 간 검증을 대신하지 않는다.

다음 배포는 현재 프로젝트 ID·접근 범위를 재사용하고 새 source SHA의 CI·독립 검수를 확인한 뒤 저장된 버전으로 배포한다. 이전 버전 재배포 시에도 저장된 정확한 버전 ID와 당시 계약을 확인한다. 공개 접근 전환이나 별도 실행 자원은 추가 결정 대상이다.

## M4.1 당시 편집기 배포 상태

M4.1 GitHub 소스 `a4d277e10f6c9e03b6a14f4fb6a11a2672987b54`, CI38204310833 전체6작업 성공. Sites source SHA `de02f178b7e236805e4e1594b7f7f4634ff0dd1e`, 버전 `appgprj_6acc4fec8bb48191a296197d2d55c1e3~appgver_91e1ae45c3f88191b32bc7c994e34ad2`, 배포 `appgdep_6acc654d2f788191b0fcec1f82f8738a`가 2026-10-12 04:43:08 UTC에 succeeded를 반환했다. 같은 개인 전용 URL에 코어12수업과 문법 강조·3테마를 제공한다.

M4.1 당시에는 Windows v0.2.0 설치 파일의 로컬 빌드만 완료됐고 GitHub Release와 34수업 웹 배포는 남아 있었다. 이후 웹 배포 결과는 아래 M7.1 기록을 따른다. Windows 설치형의 최신 검증 상태는 [개발 인계](development-handoff.md)를 따른다.

## M7.1 34수업·이론 도식 배포

2026-10-12 06:29:47 UTC에 같은 소유자 전용 URL로 웹 교재 배포가 성공했다. Java 코어12+실무22수업과 검수한 이론 도식12개를 제공한다. Windows 설치 파일 출시는 별도이며 이 웹 배포를 설치 앱 검증으로 표현하지 않는다.

| 항목 | 확인 값 |
| --- | --- |
| GitHub 검증 소스 | `a0d12571dcca5574d19b6ffdc35cd1a1093790d4` |
| CI | [38212145793](https://github.com/jbsim999/java-edu/actions/runs/38212145793): 콘텐츠·브라우저(도식 포함)·Java4·실무2 성공, Windows4 실패 |
| Sites source SHA | `88e92c4a6889c621f710027f924450d540040460` |
| 저장된 버전 | `appgprj_6acc4fec8bb48191a296197d2d55c1e3~appgver_776dd5662690819188b347b7a7be2b14` |
| 배포 ID | `appgdep_6acc7e4ad0c88191a5c9c2e721d984a1` |
| 결과 | `succeeded`, `failure_message: null` |
| 배포 파일 SHA256 | `e11b37024706fc81ffe2fbe5f2ee2e3f0ffacd129f524e57b1a6e3cabae54bc4` |

공식 Sites helper로 연 기존 체크아웃에 GitHub 검증 커밋의 파일260개를 복사하고 Git blob SHA를 전부 대조했다. 정확히 같은 소스를 `npm ci`(audit0)→Worker 빌드→Worker 정적·인증 검사→source commit/push→archive 순서로 준비했다. 이전 opening result의 SHA는 체크아웃 기준 정보이며, 배포에는 helper가 새로 반환한 pushed source SHA만 전달했다. 자동 승인 검토가 초기 패키징 입력을 오래된 SHA·만료 가능 인증정보로 판단해 거절했으나, 260파일 일치 확인·공식 helper 계약 확인·새 인증정보 후 재검토에서 진행됐다. 토큰은 저장·출력하지 않았다.

웹 관련 8개 CI 작업과 내용·기능·시각 검수는 PASS다. 전체 CI의 Windows4 실패는 감독 PowerShell의 .NET CodeDom 임시 경로 초기화에서 발생하며 Windows 설치형 수정·검증에서 추적한다. 실무 웹은 교재·파일 편집·ZIP 다운로드를 제공하고 Spring을 호스팅에서 실행하지 않는다. 실제 인증 세션 Java 제출·실기기·학습 효과는 이번 배포 검증에 포함하지 않는다.

## Windows v0.2.0 프리뷰 출시

2026-10-12 07:21:26 UTC에 [GitHub v0.2.0 프리뷰](https://github.com/jbsim999/java-edu/releases/tag/v0.2.0)를 게시했다. 태그와 릴리스 target은 검증 소스 `6ba4b8aa124f5ce78e79240253946c9fdac3e770`이며 후속 검증 문서 커밋과 구분한다. [CI38213755330](https://github.com/jbsim999/java-edu/actions/runs/38213755330) 12작업이 모두 성공했다. 앞선 웹 배포 당시 Windows4 실패는 이 소스에서 해결·재검증됐다.

설치 EXE와 SHA256SUMS가 모두 uploaded 상태다. EXE 크기는111753633바이트, GitHub asset digest는 `sha256:6d4354e0b4a5c8b471591f0ee29c106f9ec65c2561847416555c38e623fd2f74`로 로컬 검증 파일과 일치한다. SHA256SUMS 파일의 digest도 `sha256:54694a213fadad9a0414c805d7346aa1f930f6ebb7380afbc9808ccf0edd0ffe`로 일치한다.

실제 NSIS 설치·설치 앱8/8·정상 제거·데이터 보존 및 독립 시각 검수 PASS. 설치 ASAR/helper/exe와 빌드본 동일성, 검토 소스·생성 파일 대조를 확인했다. [설치 QA](installed-desktop-qa-report.md)에 검사 경계·초기 스크립트 오류·실제 사용 도구·미검증을 기록했다. 설치 파일은 코드 서명되지 않은 프리뷰다. Redis/Kafka 실제 연동·SmartScreen·실기기·스크린리더는 이번 출시 검증에 포함하지 않는다. 기존 웹의 소유자 전용 접근과 구현 PR의 미병합 상태를 유지한다.
