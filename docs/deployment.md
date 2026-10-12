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

## M4.1 편집기 배포 및 v0.2 미배포 상태

M4.1 GitHub 소스 `a4d277e10f6c9e03b6a14f4fb6a11a2672987b54`, CI38204310833 전체6작업 성공. Sites source SHA `de02f178b7e236805e4e1594b7f7f4634ff0dd1e`, 버전 `appgprj_6acc4fec8bb48191a296197d2d55c1e3~appgver_91e1ae45c3f88191b32bc7c994e34ad2`, 배포 `appgdep_6acc654d2f788191b0fcec1f82f8738a`가 2026-10-12 04:43:08 UTC에 succeeded를 반환했다. 같은 개인 전용 URL에 코어12수업과 문법 강조·3테마를 제공한다.

Windows v0.2.0 설치 파일은 로컬 빌드가 완료됐지만 GitHub Release에는 아직 게시하지 않았다. 34수업 웹도 아직 배포하지 않았다. 미완료 설치·시각 gate 및 새 CI 결과를 확인한 뒤 동일 검증 소스를 게시한다. 실제 최신 상태는 [개발 인계](development-handoff.md)를 따른다.
