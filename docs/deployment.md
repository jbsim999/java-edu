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

M4.1 GitHub 소스 `a4d277e10f6c9e03b6a14f4fb6a11a2672987b54`, CI38204310833 전체 6작업 성공. Sites source SHA `de02f178b7e236805e4e1594b7f7f4634ff0dd1e`, 버전 `appgprj_6acc4fec8bb48191a296197d2d55c1e3~appgver_91e1ae45c3f88191b32bc7c994e34ad2`, 배포 `appgdep_6acc654d2f788191b0fcec1f82f8738a`가 2026-10-12 04:43:08 UTC에 succeeded를 반환했다. 같은 개인 전용 URL에 코어 12수업과 문법 강조·3테마를 제공한다.

M4.1 당시에는 Windows v0.2.0 설치 파일의 로컬 빌드만 완료됐고 GitHub Release와 34수업 웹 배포는 남아 있었다. 이후 웹 배포 결과는 아래 M7.1 기록을 따른다. Windows 설치형의 최신 검증 상태는 [개발 인계](development-handoff.md)를 따른다.

## M7.1 34수업·이론 도식 배포

2026-10-12 06:29:47 UTC에 같은 소유자 전용 URL로 웹 교재 배포가 성공했다. Java 코어 12+실무 22수업과 검수한 이론 도식 12개를 제공한다. Windows 설치 파일 출시는 별도이며 이 웹 배포를 설치 앱 검증으로 표현하지 않는다.

| 항목 | 확인 값 |
| --- | --- |
| GitHub 검증 소스 | `a0d12571dcca5574d19b6ffdc35cd1a1093790d4` |
| CI | [38212145793](https://github.com/jbsim999/java-edu/actions/runs/38212145793): 콘텐츠·브라우저(도식 포함)·Java4·실무2 성공, Windows4 실패 |
| Sites source SHA | `88e92c4a6889c621f710027f924450d540040460` |
| 저장된 버전 | `appgprj_6acc4fec8bb48191a296197d2d55c1e3~appgver_776dd5662690819188b347b7a7be2b14` |
| 배포 ID | `appgdep_6acc7e4ad0c88191a5c9c2e721d984a1` |
| 결과 | `succeeded`, `failure_message: null` |
| 배포 파일 SHA256 | `e11b37024706fc81ffe2fbe5f2ee2e3f0ffacd129f524e57b1a6e3cabae54bc4` |

공식 Sites helper로 연 기존 체크아웃에 GitHub 검증 커밋의 파일 260개를 복사하고 Git blob SHA를 전부 대조했다. 정확히 같은 소스를 `npm ci`(audit0)→Worker 빌드→Worker 정적·인증 검사→source commit/push→archive 순서로 준비했다. 이전 opening result의 SHA는 체크아웃 기준 정보이며, 배포에는 helper가 새로 반환한 pushed source SHA만 전달했다. 자동 승인 검토가 초기 패키징 입력을 오래된 SHA·만료 가능 인증정보로 판단해 거절했으나, 260파일 일치 확인·공식 helper 계약 확인·새 인증정보 후 재검토에서 진행됐다. 토큰은 저장·출력하지 않았다.

웹 관련 8개 CI 작업과 내용·기능·시각 검수는 PASS다. 전체 CI의 Windows4 실패는 감독 PowerShell의 .NET CodeDom 임시 경로 초기화에서 발생하며 Windows 설치형 수정·검증에서 추적한다. 실무 웹은 교재·파일 편집·ZIP 다운로드를 제공하고 Spring을 호스팅에서 실행하지 않는다. 실제 인증 세션 Java 제출·실기기·학습 효과는 이번 배포 검증에 포함하지 않는다.

## Windows v0.2.0 프리뷰 출시

2026-10-12 07:21:26 UTC에 [GitHub v0.2.0 프리뷰](https://github.com/jbsim999/java-edu/releases/tag/v0.2.0)를 게시했다. 태그와 릴리스 target은 검증 소스 `6ba4b8aa124f5ce78e79240253946c9fdac3e770`이며 후속 검증 문서 커밋과 구분한다. [CI38213755330](https://github.com/jbsim999/java-edu/actions/runs/38213755330) 12작업이 모두 성공했다. 앞선 웹 배포 당시 Windows4 실패는 이 소스에서 해결·재검증됐다.

설치 EXE와 SHA256SUMS가 모두 uploaded 상태다. EXE 크기는 111753633바이트, GitHub asset digest는 `sha256:6d4354e0b4a5c8b471591f0ee29c106f9ec65c2561847416555c38e623fd2f74`로 로컬 검증 파일과 일치한다. SHA256SUMS 파일의 digest도 `sha256:54694a213fadad9a0414c805d7346aa1f930f6ebb7380afbc9808ccf0edd0ffe`로 일치한다.

실제 NSIS 설치·설치 앱8/8·정상 제거·데이터 보존 및 독립 시각 검수 PASS. 설치 ASAR/helper/exe와 빌드본 동일성, 검토 소스·생성 파일 대조를 확인했다. [설치 QA](installed-desktop-qa-report.md)에 검사 경계·초기 스크립트 오류·실제 사용 도구·미검증을 기록했다. 설치 파일은 코드 서명되지 않은 프리뷰다. Redis/Kafka 실제 연동·SmartScreen·실기기·스크린리더는 이번 출시 검증에 포함하지 않는다. 기존 웹의 소유자 전용 접근과 구현 PR의 미병합 상태를 유지한다.

## M8 Windows v0.3 통합 패키지와 웹 안내 배포

2026-10-12T09:10:19Z에 [v0.3.0 통합 프리뷰](https://github.com/jbsim999/java-edu/releases/tag/v0.3.0)를 게시했다. 태그의 실제 commit과 릴리스 target은 `0e1ff5eb38484d1594d4fd1c231d4dbe229b44e8`로 일치한다. 후속 문서·QA 기록 커밋 3a745cb와 구분한다. [CI38223955175](https://github.com/jbsim999/java-edu/actions/runs/38223955175) 12작업, 최종 실제 ZIP10/10·NSIS10/10, 원본 604도구·197소스/2생성물 대조, 코드·시각 독립 검수와 설치/제거·데이터 보존 PASS. package.json은 builder가 제거한 개발 필드를 제외한 런타임 필드로 비교했다. [통합 QA](bundled-desktop-qa-report.md)를 따른다.

초안에서 다섯 첨부의 uploaded·크기·GitHub SHA256 digest를 로컬 파일과 대조한 뒤 공개하고, 공개 상태·태그·첨부를 다시 확인했다. EXE·ZIP과 대응 JDK·제3자 소스가 같은 릴리스에 함께 있다. 기존v0.2 파일은 교체하지 않았다.

| 파일 | 바이트 | SHA256 |
| --- | ---: | --- |
| Java-Edu-0.3.0-x64.zip | 362369704 | `478889a5ab413349cc98f80801fb1f9a190ba6b1791f2c47de0d5fefcc0aa8bf` |
| Java-Edu-Setup-0.3.0-x64.exe | 362799820 | `b3e0a56b339fc3946cd80c194b9b5a544fdb3d5044277fc00acd6a9a11e8eeb8` |
| OpenJDK21U-jdk-sources_21.0.12.1_1.tar.gz | 115126841 | `573057d03584ae793fb7ec9a14c76d826d9187a53efeefd99da47403a5308234` |
| SHA256SUMS-0.3.0 | 388 | `b2490cb98bdd9d731a267354c8fd47e03aa29afe4cd16ec94f76fa4def603934` |
| Third-Party-Sources-0.3.0.zip | 4860928 | `4acbde9bafea55ab2334d20b69257c893cbb9b40aa084159d6e35cba2681756c` |

웹 통합 설치 안내는 기존 소유자 전용 URL에 2026-10-12 08:25:24 UTC succeeded로 배포했다. Sites source `199443b5e185acdcd83bb3d4ca0a4ca43eefc3d8`, 버전 `appgprj_6acc4fec8bb48191a296197d2d55c1e3~appgver_60be210ba2a48191b036dc7530cad71f`, 배포 `appgdep_6acc996c9de48191a896c90d291afd9f`, archiveSHA256 `dd25ad4a14f440d3d4ad956b3332669ef0531724b74bf2cb7ea9cb38fa73e0c9`다. 공식 helper로 연 체크아웃에 GitHub ffb77751의 268개 파일을 복사하고 Git blob을 전부 대조했다. npm ci(audit0)·Worker 빌드·Worker 검사 후 공식 source commit/push·package 결과의 SHA만 배포에 사용했다. Windows helper의 npm 실행 경로·Git Bash PATH·GNU tar Windows colon 처리를 확인한 뒤 같은 소스로 패키징했으며 도구를 수정하거나 TLS 검사를 해제하지 않았다.

후속 0e1ff5는 desktop 설치 압축 설정만 수정했고 웹 UI·Worker는 동일하다. 호스팅에서 Spring/JVM을 실행하는 기능은 추가하지 않았다. 배포 완료를 인증된 실제 웹 제출·실기기 검사로 표현하지 않는다. Windows 기본 실제 JVM21, 실무 첫 의존성 준비의 인터넷 필요, 선택 Redis/Kafka 미검증과 코드 서명되지 않은 프리뷰 범위를 유지한다. 구현 PR은 미병합이며 GitHub 공개와 웹 소유자 전용 접근을 구분한다.

## M9 — v0.3.1 프리뷰 릴리스

2026-10-13 03:14:44UTC에 [v0.3.1](https://github.com/jbsim999/java-edu/releases/tag/v0.3.1)을 공개했다. Release ID411215208, 태그·대상 커밋 `6ce0428a802be7a8a757a27a40853996a5b7fa04`, CI38338837092의 12작업 PASS. EXE362890668바이트·ZIP362460548바이트·대응 소스 2개·SHA256SUMS 총 5첨부의 업로드 상태·크기·SHA256을 로컬 원본과 대조했다. 릴리스 태그도 대상 커밋과 일치한다. 전체 payload 정합성은 [이번 QA](readability-release-qa-report.md)를 따른다. 새 실제 설치·앱 기동은 미실행이며 과거 패키지의 실행 결과를 대신 사용하지 않는다.

### M9 웹·GitHub 첫 화면 반영

2026-10-13 03:20:24UTC에 기존 소유자 전용 [웹 교재](https://java-edu-lab-jbsim999.junbo1218.chatgpt.site)의 배포가 `succeeded`를 반환했다. 후속 조회에서도 owner/custom, 허용 사용자 1·그룹 0·외부 0으로 접근 범위를 유지했다.

| 구분 | 확인값 |
| --- | --- |
| GitHub 웹·문서 원본 | `236ce0d3e461fdfea11929669981999110e1b0cf` |
| Git blob 대조 | 원본275파일 전체 일치, 복사 완료 후 빌드·Worker·Node40 PASS/1 SKIP |
| 공식 helper pushed SHA | `24cd85352707112c5875a120169a9e61e3108331` |
| Site ID | `appgprj_6acc4fec8bb48191a296197d2d55c1e3` |
| 저장 버전 | 5, `appgprj_6acc4fec8bb48191a296197d2d55c1e3~appgver_353fa8d7d06c819186e53ef29eb955e1` |
| 배포 ID | `appgdep_6acda3692ce48191840e4117a0011131` |
| 저장 아카이브 | 34파일, 3266560바이트, `sha256:8e789ec0b37028713897522ce8cdc1ebee754e997657f563d7c111d48564ae0a` |
| main 소개 문서 커밋 | `39ad4a8dfbe1548d672e4bc01bb2f3518efbb5e9` |

공식 helper에 일치 확인한 소스·완료한 빌드의 배포 묶음을 전달했고, 반환된 새 pushed SHA를 저장·배포에 사용했다. 저장 버전 조회의 SHA도 일치한다. main에는 README와 미리보기 이미지 두 변경 파일만 반영했으며 구현 PR은 병합하지 않았다. GitHub GFM1280/390 독립 시각 PASS 및 실제 공개 첫 화면의 소개·이미지·라이선스 상태 PASS를 확인했다. 이 배포 완료 응답을 인증 세션의 실제 Java 제출 검증으로 표현하지 않는다.
